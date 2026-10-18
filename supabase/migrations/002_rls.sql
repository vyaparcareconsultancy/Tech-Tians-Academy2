-- =============================================================================
-- Tech Tians Academy — Row Level Security policies
-- RLS is the authoritative permission layer; client-side checks are UX only.
-- =============================================================================

alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.courses enable row level security;
alter table public.course_sections enable row level security;
alter table public.lessons enable row level security;
alter table public.teacher_courses enable row level security;
alter table public.batches enable row level security;
alter table public.batch_students enable row level security;
alter table public.enrollments enable row level security;
alter table public.live_classes enable row level security;
alter table public.recorded_lectures enable row level security;
alter table public.study_materials enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_submissions enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.orders enable row level security;
alter table public.payments enable row level security;
alter table public.coupons enable row level security;
alter table public.announcements enable row level security;
alter table public.attendance_records enable row level security;
alter table public.audit_logs enable row level security;
alter table public.platform_policies enable row level security;

-- Helper predicates -----------------------------------------------------------
create or replace function public.is_admin() returns boolean as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$ language sql stable security definer;

create or replace function public.is_teacher() returns boolean as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher' and status = 'active')
$$ language sql stable security definer;

create or replace function public.owns_course(course_uuid uuid) returns boolean as $$
  select exists (
    select 1 from public.teacher_courses tc
    where tc.teacher_id = auth.uid() and tc.course_id = course_uuid
  )
$$ language sql stable security definer;

create or replace function public.enrolled_in_course(course_uuid uuid) returns boolean as $$
  select exists (
    select 1 from public.enrollments e
    where e.student_id = auth.uid() and e.course_id = course_uuid and e.status = 'active'
  )
$$ language sql stable security definer;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy "profiles: everyone reads non-sensitive fields"
  on public.profiles for select using (true);

create policy "profiles: users read & update own basic fields"
  on public.profiles for update using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));

create policy "profiles: admins manage all profiles"
  on public.profiles for all using (public.is_admin()) with check (public.is_admin());

-- Role elevation is impossible from the client: only admins (or the service
-- role via a signup-trigger) may write the `role` column.
create policy "profiles: role immutable for non-admins"
  on public.profiles for update using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));

-- ---------------------------------------------------------------------------
-- subjects / courses / sections / lessons
-- ---------------------------------------------------------------------------
create policy "subjects: read all" on public.subjects for select using (true);
create policy "subjects: admin write" on public.subjects for all using (public.is_admin()) with check (public.is_admin());

create policy "courses: published visible to everyone"
  on public.courses for select using (status = 'published' or public.is_admin() or public.owns_course(id));

create policy "courses: admin full access"
  on public.courses for all using (public.is_admin()) with check (public.is_admin());

create policy "courses: teachers manage assigned courses"
  on public.courses for all using (public.owns_course(id) and public.is_teacher())
  with check (public.owns_course(id) and public.is_teacher());

create policy "sections: read with course visibility"
  on public.course_sections for select using (
    exists (select 1 from public.courses c where c.id = course_id and (c.status = 'published' or public.is_admin() or public.owns_course(c.id)))
  );
create policy "sections: admin/assigned-teacher write"
  on public.course_sections for all using (
    public.is_admin() or (public.is_teacher() and public.owns_course(course_id))
  ) with check (public.is_admin() or (public.is_teacher() and public.owns_course(course_id)));

create policy "lessons: published content readable"
  on public.lessons for select using (
    (status = 'published' and exists (select 1 from public.courses c where c.id = course_id and c.status = 'published'))
    or public.is_admin() or public.owns_course(course_id)
  );
create policy "lessons: admin/assigned-teacher write"
  on public.lessons for all using (
    public.is_admin() or (public.is_teacher() and public.owns_course(course_id))
  ) with check (public.is_admin() or (public.is_teacher() and public.owns_course(course_id)));

create policy "teacher_courses: readable by staff"
  on public.teacher_courses for select using (public.is_admin() or public.is_teacher());
create policy "teacher_courses: admin assigns"
  on public.teacher_courses for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- batches & enrollment
-- ---------------------------------------------------------------------------
create policy "batches: visible to staff and enrolled students"
  on public.batches for select using (
    public.is_admin() or public.is_teacher()
    or exists (select 1 from public.batch_students bs join public.enrollments e on e.student_id = bs.student_id
               where bs.batch_id = batches.id and e.student_id = auth.uid())
  );
create policy "batches: admin write" on public.batches for all using (public.is_admin()) with check (public.is_admin());

create policy "batch_students: read own and own-batch membership"
  on public.batch_students for select using (
    auth.uid() = student_id or public.is_admin()
    or (public.is_teacher() and exists (select 1 from public.batches b where b.id = batch_id and (b.teacher_id = auth.uid() or public.owns_course(b.course_id))))
  );
create policy "batch_students: admin write" on public.batch_students for all using (public.is_admin()) with check (public.is_admin());

create policy "enrollments: students read own"
  on public.enrollments for select using (student_id = auth.uid() or public.is_admin()
    or (public.is_teacher() and public.owns_course(course_id)));
create policy "enrollments: admin write" on public.enrollments for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- live classes & recorded lectures & materials
-- ---------------------------------------------------------------------------
create policy "live_classes: staff and enrolled students read"
  on public.live_classes for select using (
    public.is_admin() or public.is_teacher()
    or exists (select 1 from public.enrollments e where e.course_id = live_classes.course_id and e.student_id = auth.uid())
  );
create policy "live_classes: admin full" on public.live_classes for all using (public.is_admin()) with check (public.is_admin());
create policy "live_classes: teachers manage own classes"
  on public.live_classes for all using (teacher_id = auth.uid() and public.is_teacher())
  with check (teacher_id = auth.uid() and public.is_teacher());

create policy "lectures: published visible; teachers see own course lectures"
  on public.recorded_lectures for select using (
    (status = 'published' and exists (select 1 from public.courses c where c.id = course_id and c.status = 'published'))
    or public.is_admin() or public.owns_course(course_id)
  );
create policy "lectures: admin/assigned-teacher write"
  on public.recorded_lectures for all using (public.is_admin() or (public.is_teacher() and public.owns_course(course_id)))
  with check (public.is_admin() or (public.is_teacher() and public.owns_course(course_id)));

create policy "materials: enrolled students read"
  on public.study_materials for select using (
    public.is_admin() or public.owns_course(course_id)
    or public.enrolled_in_course(course_id)
  );
create policy "materials: assigned teachers write"
  on public.study_materials for all using (public.is_admin() or (public.is_teacher() and public.owns_course(course_id)))
  with check (public.is_admin() or (public.is_teacher() and public.owns_course(course_id)));

-- ---------------------------------------------------------------------------
-- assignments, submissions, quizzes, attempts, progress
-- ---------------------------------------------------------------------------
create policy "assignments: staff and batch students read"
  on public.assignments for select using (
    public.is_admin() or public.is_teacher()
    or exists (select 1 from public.enrollments e where e.course_id = assignments.course_id and e.student_id = auth.uid())
  );
create policy "assignments: admin/assigned-teacher write"
  on public.assignments for all using (public.is_admin() or (public.is_teacher() and public.owns_course(course_id)))
  with check (public.is_admin() or (public.is_teacher() and public.owns_course(course_id)));

create policy "submissions: students read own; teachers read own-course submissions"
  on public.assignment_submissions for select using (
    student_id = auth.uid() or public.is_admin()
    or (public.is_teacher() and exists (select 1 from public.assignments a where a.id = assignment_id and public.owns_course(a.course_id)))
  );
create policy "submissions: students insert own"
  on public.assignment_submissions for insert with check (student_id = auth.uid());
create policy "submissions: teachers grade own-course submissions"
  on public.assignment_submissions for update using (
    public.is_admin() or (public.is_teacher() and exists (
      select 1 from public.assignments a where a.id = assignment_id and public.owns_course(a.course_id)))
  ) with check (marks is not null or feedback is not null);

create policy "quizzes: published readable"
  on public.quizzes for select using (status = 'published' or public.is_admin() or public.owns_course(course_id));
create policy "quizzes: admin/assigned-teacher write"
  on public.quizzes for all using (public.is_admin() or (public.is_teacher() and public.owns_course(course_id)))
  with check (public.is_admin() or (public.is_teacher() and public.owns_course(course_id)));

create policy "quiz_questions: follow quiz visibility"
  on public.quiz_questions for select using (
    exists (select 1 from public.quizzes q where q.id = quiz_id and (q.status = 'published' or public.is_admin() or public.owns_course(q.course_id)))
  );

create policy "quiz_attempts: students read own; teachers read own-course attempts"
  on public.quiz_attempts for select using (
    student_id = auth.uid() or public.is_admin()
    or (public.is_teacher() and exists (select 1 from public.quizzes q where q.id = quiz_id and public.owns_course(q.course_id)))
  );
create policy "quiz_attempts: students insert own attempts"
  on public.quiz_attempts for insert with check (student_id = auth.uid());

create policy "lesson_progress: students read/write own"
  on public.lesson_progress for all using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy "lesson_progress: staff read for their courses"
  on public.lesson_progress for select using (
    public.is_admin() or (public.is_teacher() and public.owns_course(course_id))
  );

-- ---------------------------------------------------------------------------
-- commerce — verified records are immutable to clients
-- ---------------------------------------------------------------------------
create policy "orders: students read own; admins read all"
  on public.orders for select using (student_id = auth.uid() or public.is_admin());
create policy "orders: no client writes (checkout server-side only)"
  on public.orders for insert with check (false);
create policy "orders: no client updates (webhooks only)"
  on public.orders for update with check (false);

create policy "payments: students read own; admins read all; nobody writes"
  on public.payments for select using (
    exists (select 1 from public.orders o where o.id = payments.order_id and o.student_id = auth.uid())
    or public.is_admin()
  );
create policy "payments: immutable from clients (gateway webhooks only)"
  on public.payments for insert with check (false);
create policy "payments: verified flag server-only"
  on public.payments for update with check (false);

create policy "coupons: students read active; admins manage"
  on public.coupons for select using (active = true or public.is_admin());
create policy "coupons: admin write" on public.coupons for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- communication, attendance, audit
-- ---------------------------------------------------------------------------
create policy "announcements: readable by all"
  on public.announcements for select using (true);
create policy "announcements: admin write; teachers write batch-scoped"
  on public.announcements for insert with check (
    public.is_admin()
    or (public.is_teacher() and audience in ('students', 'batch') and (batch_id is null or exists (
      select 1 from public.batches b where b.id = batch_id and (b.teacher_id = auth.uid() or public.owns_course(b.course_id)))))
  );
create policy "announcements: admin delete"
  on public.announcements for delete using (public.is_admin());

create policy "attendance: students read own; teachers read own batches"
  on public.attendance_records for select using (
    student_id = auth.uid() or public.is_admin()
    or (public.is_teacher() and exists (select 1 from public.batches b where b.id = batch_id and (b.teacher_id = auth.uid() or public.owns_course(b.course_id))))
  );
create policy "attendance: teachers write own batches"
  on public.attendance_records for all using (
    public.is_teacher() and exists (select 1 from public.batches b where b.id = batch_id and (b.teacher_id = auth.uid() or public.owns_course(b.course_id)))
  ) with check (public.is_teacher() and exists (select 1 from public.batches b where b.id = batch_id and (b.teacher_id = auth.uid() or public.owns_course(b.course_id))));

create policy "audit_logs: admins read; service inserts"
  on public.audit_logs for select using (public.is_admin());
create policy "audit_logs: insert only via server"
  on public.audit_logs for insert with check (false);

create policy "platform_policies: admin only"
  on public.platform_policies for all using (public.is_admin()) with check (public.is_admin());

-- Force RLS on every table (belt & braces)
alter table public.profiles force row level security;
alter table public.subjects force row level security;
alter table public.courses force row level security;
alter table public.course_sections force row level security;
alter table public.lessons force row level security;
alter table public.teacher_courses force row level security;
alter table public.batches force row level security;
alter table public.batch_students force row level security;
alter table public.enrollments force row level security;
alter table public.live_classes force row level security;
alter table public.recorded_lectures force row level security;
alter table public.study_materials force row level security;
alter table public.assignments force row level security;
alter table public.assignment_submissions force row level security;
alter table public.quizzes force row level security;
alter table public.quiz_questions force row level security;
alter table public.quiz_attempts force row level security;
alter table public.lesson_progress force row level security;
alter table public.orders force row level security;
alter table public.payments force row level security;
alter table public.coupons force row level security;
alter table public.announcements force row level security;
alter table public.attendance_records force row level security;
alter table public.audit_logs force row level security;
alter table public.platform_policies force row level security;
