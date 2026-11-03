-- Security checks for certificates and notifications (migration 014).
-- Each check raises an exception on failure, which fails CI.

-- ---------------------------------------------------------------- fixtures
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@test.local'),
  ('00000000-0000-0000-0000-000000000001', 's1@test.local'),
  ('00000000-0000-0000-0000-000000000002', 's2@test.local');

insert into public.profiles (id, full_name, email, role) values
  ('00000000-0000-0000-0000-00000000000a', 'Admin', 'admin@test.local', 'admin'),
  ('00000000-0000-0000-0000-000000000001', 'Student One', 's1@test.local', 'student'),
  ('00000000-0000-0000-0000-000000000002', 'Student Two', 's2@test.local', 'student')
on conflict (id) do update set role = excluded.role, full_name = excluded.full_name;

insert into public.courses (id, title, slug, category, status)
values ('c0000000-0000-0000-0000-000000000001', 'Test Course', 'test-course', 'Coding', 'published');

insert into public.course_sections (id, course_id, title)
values ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Section 1');

insert into public.lessons (id, course_id, section_id, title, status) values
  ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'L1', 'published'),
  ('e0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'L2', 'published'),
  ('e0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'L3 draft', 'draft');

insert into public.enrollments (student_id, course_id) values
  ('00000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001');

insert into public.lesson_progress (student_id, lesson_id, course_id, status) values
  ('00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'completed');

-- ---------------------------------------------------------------- certificates
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';

-- 1 of 2 published lessons done: must fail.
do $$ begin
  perform public.issue_certificate('c0000000-0000-0000-0000-000000000001');
  raise exception 'CHECK FAILED: certificate issued at 50%% progress';
exception when others then
  if sqlerrm like 'CHECK FAILED%' then raise; end if;
end $$;

reset role;
insert into public.lesson_progress (student_id, lesson_id, course_id, status) values
  ('00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'completed');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';

-- 2 of 2 published lessons done (draft ignored): must succeed and be idempotent.
do $$
declare a text; b text;
begin
  select certificate_no into a from public.issue_certificate('c0000000-0000-0000-0000-000000000001');
  select certificate_no into b from public.issue_certificate('c0000000-0000-0000-0000-000000000001');
  if a is null or a <> b then
    raise exception 'CHECK FAILED: certificate not issued at 100%% or not idempotent (% / %)', a, b;
  end if;
end $$;

-- Student keeps course access after completion.
do $$ begin
  if not public.enrolled_in_course('c0000000-0000-0000-0000-000000000001') then
    raise exception 'CHECK FAILED: completed student lost course access';
  end if;
end $$;

-- Direct insert must be blocked.
do $$ begin
  insert into public.certificates (student_id, course_id, certificate_no)
  values ('00000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'FAKE-1');
  raise exception 'CHECK FAILED: client could insert a certificate';
exception when others then
  if sqlerrm like 'CHECK FAILED%' then raise; end if;
end $$;

-- Another student cannot see it.
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
do $$ begin
  if (select count(*) from public.certificates) <> 0 then
    raise exception 'CHECK FAILED: student can see another student''s certificate';
  end if;
end $$;

-- Public verify returns only name, course and date.
reset role;
do $$
declare cols text;
begin
  select string_agg(a, ',' order by a) into cols
  from unnest((select proargnames from pg_proc where proname = 'verify_certificate')) a
  where a <> 'p_no';
  if cols <> 'course_title,issued_at,student_name' then
    raise exception 'CHECK FAILED: verify_certificate exposes extra columns: %', cols;
  end if;
end $$;

set role anon;
set request.jwt.claim.sub = '';
do $$ begin
  if (select count(*) from public.certificates) <> 0 then
    raise exception 'CHECK FAILED: anon can read certificates table';
  end if;
  if (select count(*) from public.verify_certificate('does-not-exist')) <> 0 then
    raise exception 'CHECK FAILED: verify_certificate returned a row for a bad number';
  end if;
end $$;
reset role;
do $$ begin
  if (select count(*) from public.verify_certificate((select certificate_no from public.certificates limit 1))) <> 1 then
    raise exception 'CHECK FAILED: verify_certificate did not find a real certificate';
  end if;
end $$;

-- ---------------------------------------------------------------- notifications
insert into public.announcements (title, body, audience, created_by)
values ('Hello', 'Body', 'all', '00000000-0000-0000-0000-00000000000a');

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';

do $$ begin
  if (select count(*) from public.notifications where user_id <> auth.uid()) <> 0 then
    raise exception 'CHECK FAILED: student can see another user''s notifications';
  end if;
  if (select count(*) from public.notifications) < 1 then
    raise exception 'CHECK FAILED: announcement trigger did not notify the student';
  end if;
end $$;

-- Only the read flag may change.
update public.notifications set read = true;
do $$ begin
  update public.notifications set title = 'hacked';
  raise exception 'CHECK FAILED: student changed a notification title';
exception when others then
  if sqlerrm like 'CHECK FAILED%' then raise; end if;
end $$;

do $$ begin
  insert into public.notifications (user_id, title) values ('00000000-0000-0000-0000-000000000001', 'spam');
  raise exception 'CHECK FAILED: student inserted a notification';
exception when others then
  if sqlerrm like 'CHECK FAILED%' then raise; end if;
end $$;

reset role;
do $$ begin
  if exists (select 1 from public.notifications where user_id = '00000000-0000-0000-0000-000000000001' and read) then
    raise exception 'CHECK FAILED: student marked another user''s notification as read';
  end if;
end $$;
