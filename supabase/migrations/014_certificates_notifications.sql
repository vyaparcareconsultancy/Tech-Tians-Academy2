-- =============================================================================
-- Migration 014: Certificates & Notifications
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Certificates table
-- ---------------------------------------------------------------------------
create table public.certificates (
  id            uuid primary key default uuid_generate_v4(),
  student_id    uuid not null references public.profiles(id) on delete cascade,
  course_id     uuid not null references public.courses(id) on delete cascade,
  certificate_no text not null unique,
  issued_at     timestamptz not null default now(),
  unique (student_id, course_id)
);

create index if not exists idx_certificates_student on public.certificates(student_id);
create index if not exists idx_certificates_course on public.certificates(course_id);

alter table public.certificates enable row level security;

-- Students may read their own certificates.
create policy "certificates: students select own"
  on public.certificates for select using (student_id = auth.uid());

-- Admins may read all certificates.
create policy "certificates: admins select all"
  on public.certificates for select using (public.is_admin());

-- Teachers may read certificates for courses they own.
create policy "certificates: teachers select for owned courses"
  on public.certificates for select
  using (public.is_teacher() and public.owns_course(course_id));

-- No client insert/update/delete policies: certificates are created only by
-- the issue_certificate RPC (security definer) and never mutated by clients.

-- ---------------------------------------------------------------------------
-- 2. RPC: issue_certificate
-- ---------------------------------------------------------------------------
create or replace function public.issue_certificate(p_course_id uuid)
returns table (certificate_no text, issued_at timestamptz)
language plpgsql security definer set search_path = public
as $$
declare
  v_certificate_no text;
  v_issued_at timestamptz;
  v_published_lessons int;
  v_completed_lessons int;
begin
  if p_course_id is null then
    raise exception 'course_id is required';
  end if;

  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'student') then
    raise exception 'Only students can request certificates';
  end if;

  -- Idempotent: return the existing certificate if it was already issued.
  select certificate_no, issued_at
    into v_certificate_no, v_issued_at
  from public.certificates
  where student_id = auth.uid() and course_id = p_course_id;

  if found then
    return query select v_certificate_no, v_issued_at;
    return;
  end if;

  -- Caller must have an active or completed enrollment in the course.
  if not exists (
    select 1 from public.enrollments
    where student_id = auth.uid()
      and course_id = p_course_id
      and status in ('active', 'completed')
  ) then
    raise exception 'You are not enrolled in this course';
  end if;

  -- The course must have at least one published lesson.
  select count(*) into v_published_lessons
  from public.lessons
  where course_id = p_course_id and status = 'published';

  if v_published_lessons < 1 then
    raise exception 'Course has no published lessons';
  end if;

  -- Every published lesson must be completed by the caller.
  select count(*) into v_completed_lessons
  from public.lessons l
  where l.course_id = p_course_id
    and l.status = 'published'
    and exists (
      select 1 from public.lesson_progress lp
      where lp.student_id = auth.uid()
        and lp.lesson_id = l.id
        and lp.status = 'completed'
    );

  if v_completed_lessons <> v_published_lessons then
    raise exception 'Complete all published lessons before requesting a certificate';
  end if;

  insert into public.certificates (student_id, course_id, certificate_no)
  values (
    auth.uid(),
    p_course_id,
    'TTA-' || to_char(now(), 'YYYY') || '-' || upper(substr(md5(random()::text), 1, 8))
  )
  returning certificate_no, issued_at into v_certificate_no, v_issued_at;

  update public.enrollments
  set status = 'completed', progress_pct = 100
  where student_id = auth.uid() and course_id = p_course_id;

  return query select v_certificate_no, v_issued_at;
end;
$$;

revoke execute on function public.issue_certificate(uuid) from public, anon;
grant execute on function public.issue_certificate(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. RPC: verify_certificate
-- ---------------------------------------------------------------------------
create or replace function public.verify_certificate(p_no text)
returns table (student_name text, course_title text, issued_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select p.full_name, c.title, cert.issued_at
  from public.certificates cert
  join public.profiles p on p.id = cert.student_id
  join public.courses c on c.id = cert.course_id
  where cert.certificate_no = p_no;
$$;

revoke execute on function public.verify_certificate(text) from public;
grant execute on function public.verify_certificate(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Notifications table
-- ---------------------------------------------------------------------------
create table public.notifications (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  title      text not null,
  body       text,
  link       text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_read_created
  on public.notifications (user_id, read, created_at desc);

alter table public.notifications enable row level security;

-- Users select and update only their own notifications.
create policy "notifications: users select own"
  on public.notifications for select using (user_id = auth.uid());

create policy "notifications: users update own"
  on public.notifications for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- No client insert/delete policies: notifications are created only by
-- server-side triggers and never deleted by clients.

-- Only the `read` column may be changed by client updates.
create or replace function public.block_notification_column_changes() returns trigger as $$
begin
  if new.user_id is distinct from old.user_id
     or new.title is distinct from old.title
     or new.body is distinct from old.body
     or new.link is distinct from old.link
     or new.created_at is distinct from old.created_at then
    raise exception 'Only the read column may be updated on notifications';
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_notifications_update_guard
  before update on public.notifications
  for each row execute function public.block_notification_column_changes();

-- ---------------------------------------------------------------------------
-- 5. Triggers that create notifications
-- ---------------------------------------------------------------------------

-- Announcements → notify matching audience (mirrors send-email audience rules).
create or replace function public.notify_announcement() returns trigger as $$
begin
  -- Teachers audience → all active teachers.
  if new.audience = 'teachers' then
    insert into public.notifications (user_id, title, body, link)
    select id, new.title, new.body, '/teacher/dashboard'
    from public.profiles
    where role = 'teacher' and status = 'active';
    return new;
  end if;

  -- Platform-wide → all active students.
  if new.audience = 'all' then
    insert into public.notifications (user_id, title, body, link)
    select id, new.title, new.body, '/student/dashboard'
    from public.profiles
    where role = 'student' and status = 'active';
    return new;
  end if;

  -- Batch audience (or any announcement with a batch set) → batch members.
  if new.audience = 'batch' or new.batch_id is not null then
    insert into public.notifications (user_id, title, body, link)
    select distinct bs.student_id, new.title, new.body, '/student/dashboard'
    from public.batch_students bs
    where bs.batch_id = new.batch_id and bs.status = 'active'
    union
    select distinct e.student_id, new.title, new.body, '/student/dashboard'
    from public.enrollments e
    where e.batch_id = new.batch_id and e.status = 'active';
    return new;
  end if;

  -- Students audience → teacher's course students, or all active students for
  -- admin-created announcements.
  if new.audience = 'students' then
    if exists (select 1 from public.profiles where id = new.created_by and role = 'teacher') then
      insert into public.notifications (user_id, title, body, link)
      select distinct e.student_id, new.title, new.body, '/student/dashboard'
      from public.enrollments e
      where e.status = 'active'
        and e.course_id in (
          select tc.course_id from public.teacher_courses tc where tc.teacher_id = new.created_by
          union
          select b.course_id from public.batches b where b.teacher_id = new.created_by
        );
    else
      insert into public.notifications (user_id, title, body, link)
      select id, new.title, new.body, '/student/dashboard'
      from public.profiles
      where role = 'student' and status = 'active';
    end if;
    return new;
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger trg_announcements_notify
  after insert on public.announcements
  for each row execute function public.notify_announcement();

-- Assignment submissions → notify the student when results are published.
create or replace function public.notify_submission_graded() returns trigger as $$
begin
  if new.published and not old.published and new.marks is not null then
    insert into public.notifications (user_id, title, body, link)
    values (
      new.student_id,
      'Your assignment has been graded',
      'Marks and feedback are now available on your dashboard.',
      '/student/assignments'
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_assignment_submissions_notify
  after update on public.assignment_submissions
  for each row execute function public.notify_submission_graded();

-- Orders → notify the student when an order becomes paid.
create or replace function public.notify_order_paid() returns trigger as $$
begin
  if new.status = 'paid' and old.status is distinct from 'paid' then
    insert into public.notifications (user_id, title, body, link)
    values (
      new.student_id,
      'Payment successful',
      'Your enrollment is now active. Happy learning!',
      '/student/courses'
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_orders_notify
  after update on public.orders
  for each row execute function public.notify_order_paid();

-- Live classes → notify batch students when cancelled or rescheduled.
create or replace function public.notify_live_class_change() returns trigger as $$
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    insert into public.notifications (user_id, title, body, link)
    select distinct bs.student_id,
           'Class cancelled: ' || new.title,
           format('The live class "%s" has been cancelled.', new.title),
           '/student/live-classes'
    from public.batch_students bs
    where bs.batch_id = new.batch_id and bs.status = 'active'
    union
    select distinct e.student_id,
           'Class cancelled: ' || new.title,
           format('The live class "%s" has been cancelled.', new.title),
           '/student/live-classes'
    from public.enrollments e
    where e.batch_id = new.batch_id and e.status = 'active';
  end if;

  if new.scheduled_at is distinct from old.scheduled_at then
    insert into public.notifications (user_id, title, body, link)
    select distinct bs.student_id,
           'Class rescheduled: ' || new.title,
           format('The live class "%s" has been rescheduled.', new.title),
           '/student/live-classes'
    from public.batch_students bs
    where bs.batch_id = new.batch_id and bs.status = 'active'
    union
    select distinct e.student_id,
           'Class rescheduled: ' || new.title,
           format('The live class "%s" has been rescheduled.', new.title),
           '/student/live-classes'
    from public.enrollments e
    where e.batch_id = new.batch_id and e.status = 'active';
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger trg_live_classes_notify
  after update on public.live_classes
  for each row execute function public.notify_live_class_change();

-- ---------------------------------------------------------------------------
-- 6. Realtime for notifications
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.notifications;
