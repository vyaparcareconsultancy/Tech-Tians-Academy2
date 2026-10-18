-- =============================================================================
-- Tech Tians Academy — Database schema
-- Run with: supabase db reset   (or via the Supabase dashboard SQL editor)
-- Uses Supabase Auth (auth.users) as the identity source.
-- =============================================================================

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- profiles — one row per auth user; role is ONLY writable by admins/service
-- ---------------------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text not null,
  email         text not null unique,
  role          text not null check (role in ('admin', 'teacher', 'student')) default 'student',
  phone         text,
  grade         text,          -- students only, e.g. "Class 11"
  city          text,
  subject       text,          -- teachers only
  qualification text,
  bio           text,
  rating        numeric(2,1),
  status        text not null default 'active' check (status in ('active', 'pending', 'suspended', 'rejected')),
  approved_at   timestamptz,
  applied_at    timestamptz default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Catalogue
-- ---------------------------------------------------------------------------
create table public.subjects (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null unique,
  code        text not null,
  color       text default '#4672B8',
  description text,
  created_at  timestamptz not null default now()
);

create table public.courses (
  id             uuid primary key default uuid_generate_v4(),
  title          text not null,
  slug           text not null unique,
  description    text,
  category       text not null,
  subject_id     uuid references public.subjects(id) on delete set null,
  cover_index    integer default 0,
  price          integer not null default 0 check (price >= 0),   -- INR, paise-safe alternative: numeric(10,2)
  duration_hours integer not null default 0,
  level          text not null default 'Beginner',
  status         text not null default 'draft' check (status in ('draft', 'pending_approval', 'published', 'archived')),
  rating         numeric(2,1) default 4.5,
  created_at     timestamptz not null default now(),
  published_at   timestamptz
);

create table public.course_sections (
  id        uuid primary key default uuid_generate_v4(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title     text not null,
  "order"   integer not null default 1,
  created_at timestamptz not null default now(),
  unique (course_id, title)
);

create table public.lessons (
  id           uuid primary key default uuid_generate_v4(),
  course_id    uuid not null references public.courses(id) on delete cascade,
  section_id   uuid not null references public.course_sections(id) on delete cascade,
  title        text not null,
  type         text not null default 'video' check (type in ('video', 'document', 'quiz')),
  duration_min integer not null default 30,
  video_url    text check (video_url is null or video_url ~ '^https?://(www\.)?(youtube\.com|youtu\.be|vimeo\.com)/'),
  "order"      integer not null default 1,
  status       text not null default 'draft' check (status in ('draft', 'pending_approval', 'published')),
  created_at   timestamptz not null default now()
);

-- many-to-many: which teachers may manage which course
create table public.teacher_courses (
  id          uuid primary key default uuid_generate_v4(),
  teacher_id  uuid not null references public.profiles(id) on delete cascade,
  course_id   uuid not null references public.courses(id) on delete cascade,
  role        text not null default 'owner' check (role in ('owner', 'assistant')),
  assigned_at timestamptz not null default now(),
  unique (teacher_id, course_id)
);

-- ---------------------------------------------------------------------------
-- Batches & enrollment
-- ---------------------------------------------------------------------------
create table public.batches (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null unique,
  course_id  uuid not null references public.courses(id),
  teacher_id uuid references public.profiles(id),
  start_date date not null,
  end_date   date not null,
  capacity   integer not null default 40 check (capacity > 0),
  schedule   text,
  fee        integer not null default 0,
  status     text not null default 'upcoming' check (status in ('upcoming', 'active', 'completed')),
  created_at timestamptz not null default now(),
  check (end_date > start_date)
);

create table public.batch_students (
  id          uuid primary key default uuid_generate_v4(),
  batch_id    uuid not null references public.batches(id) on delete cascade,
  student_id  uuid not null references public.profiles(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  status      text not null default 'active',
  unique (batch_id, student_id)
);

create table public.enrollments (
  id           uuid primary key default uuid_generate_v4(),
  student_id   uuid not null references public.profiles(id) on delete cascade,
  course_id    uuid not null references public.courses(id),
  batch_id     uuid references public.batches(id) on delete set null,
  enrolled_at  timestamptz not null default now(),
  status       text not null default 'active' check (status in ('active', 'completed', 'dropped')),
  progress_pct integer not null default 0 check (progress_pct between 0 and 100),
  source       text not null default 'direct' check (source in ('direct', 'coupon', 'admin')),
  amount_paid  integer not null default 0,
  created_at   timestamptz not null default now(),
  unique (student_id, course_id)
);

-- ---------------------------------------------------------------------------
-- Delivery: live classes, recorded lectures, materials
-- ---------------------------------------------------------------------------
create table public.live_classes (
  id            uuid primary key default uuid_generate_v4(),
  course_id     uuid not null references public.courses(id),
  batch_id      uuid not null references public.batches(id),
  teacher_id    uuid not null references public.profiles(id),
  title         text not null,
  scheduled_at  timestamptz not null,
  duration_min  integer not null default 60,
  meeting_url   text not null,
  status        text not null default 'upcoming' check (status in ('upcoming', 'live', 'completed', 'cancelled')),
  cancel_reason text,
  created_by    uuid references public.profiles(id),
  created_at    timestamptz not null default now()
);

create table public.recorded_lectures (
  id          uuid primary key default uuid_generate_v4(),
  course_id   uuid not null references public.courses(id) on delete cascade,
  section_id  uuid references public.course_sections(id) on delete set null,
  batch_id    uuid references public.batches(id) on delete set null,
  teacher_id  uuid not null references public.profiles(id),
  title       text not null,
  description text,
  video_url   text not null check (video_url ~ '^https?://(www\.)?(youtube\.com|youtu\.be|vimeo\.com)/'),
  duration_min integer not null default 30,
  "order"     integer not null default 1,
  status      text not null default 'draft' check (status in ('draft', 'pending_approval', 'published')),
  views       integer not null default 0,
  uploaded_at timestamptz not null default now()
);

create table public.study_materials (
  id         uuid primary key default uuid_generate_v4(),
  teacher_id uuid not null references public.profiles(id),
  course_id  uuid not null references public.courses(id) on delete cascade,
  title      text not null,
  file_name  text not null,
  file_type  text not null,
  storage_key text,            -- object-store key; never the file bytes in Postgres
  size_mb    numeric(6,1) default 0,
  downloads  integer not null default 0,
  uploaded_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Assessment
-- ---------------------------------------------------------------------------
create table public.assignments (
  id            uuid primary key default uuid_generate_v4(),
  course_id     uuid not null references public.courses(id),
  batch_id      uuid not null references public.batches(id),
  teacher_id    uuid not null references public.profiles(id),
  title         text not null,
  instructions  text not null,
  due_date      timestamptz not null,
  max_marks     integer not null default 25,
  attachments   text[] default '{}',
  status        text not null default 'published' check (status in ('draft', 'published')),
  results_published boolean not null default false,
  created_at    timestamptz not null default now()
);

create table public.assignment_submissions (
  id            uuid primary key default uuid_generate_v4(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id    uuid not null references public.profiles(id),
  submitted_at  timestamptz not null default now(),
  file_name     text,
  storage_key   text,
  marks         integer check (marks >= 0),
  feedback      text,
  status        text not null default 'submitted' check (status in ('submitted', 'late', 'graded')),
  graded        boolean not null default false,
  published     boolean not null default false,
  unique (assignment_id, student_id)
);

create table public.quizzes (
  id             uuid primary key default uuid_generate_v4(),
  course_id      uuid not null references public.courses(id),
  batch_id       uuid not null references public.batches(id),
  teacher_id     uuid not null references public.profiles(id),
  title          text not null,
  time_limit_min integer not null default 20,
  total_marks    integer not null default 0,
  questions      jsonb not null default '[]'::jsonb,  -- [{id,text,options[],correctIndex,marks}]
  status         text not null default 'draft' check (status in ('draft', 'published')),
  results_published boolean not null default false,
  created_at     timestamptz not null default now()
);
-- normalized alternative kept for reporting; the UI reads `questions` jsonb
create table public.quiz_questions (
  id         uuid primary key default uuid_generate_v4(),
  quiz_id    uuid not null references public.quizzes(id) on delete cascade,
  text       text not null,
  options    jsonb not null,
  correct_index integer not null,
  marks      integer not null default 10,
  "order"    integer not null default 1
);

create table public.quiz_attempts (
  id          uuid primary key default uuid_generate_v4(),
  quiz_id     uuid not null references public.quizzes(id) on delete cascade,
  student_id  uuid not null references public.profiles(id),
  attempted_at timestamptz not null default now(),
  score       integer not null,
  max_score   integer not null,
  answers     jsonb default '[]'::jsonb,
  published   boolean not null default false,
  unique (quiz_id, student_id)
);

create table public.lesson_progress (
  id           uuid primary key default uuid_generate_v4(),
  student_id   uuid not null references public.profiles(id) on delete cascade,
  lesson_id    uuid not null references public.lessons(id) on delete cascade,
  course_id    uuid not null references public.courses(id) on delete cascade,
  status       text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  pct          integer not null default 0 check (pct between 0 and 100),
  completed_at timestamptz,
  unique (student_id, lesson_id)
);

-- ---------------------------------------------------------------------------
-- Commerce
-- ---------------------------------------------------------------------------
create table public.orders (
  id          uuid primary key default uuid_generate_v4(),
  order_id    text not null unique,
  student_id  uuid not null references public.profiles(id),
  course_id   uuid not null references public.courses(id),
  amount      integer not null check (amount >= 0),
  discount    integer not null default 0,
  status      text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  coupon_code text,
  created_at  timestamptz not null default now()
);

create table public.payments (
  id          uuid primary key default uuid_generate_v4(),
  order_id    uuid not null unique references public.orders(id) on delete cascade,
  amount      integer not null,
  status      text not null check (status in ('awaiting', 'success', 'failed', 'refunded')),
  gateway     text not null,
  txn_id      text,
  verified    boolean not null default false,  -- true only after a signed webhook callback
  paid_at     timestamptz,
  created_at  timestamptz not null default now()
);

create table public.coupons (
  id         uuid primary key default uuid_generate_v4(),
  code       text not null unique,
  type       text not null check (type in ('percent', 'fixed')),
  value      integer not null,
  valid_from timestamptz not null,
  valid_till timestamptz not null,
  max_uses   integer not null default 100,
  used_count integer not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Communication, operations & security
-- ---------------------------------------------------------------------------
create table public.announcements (
  id         uuid primary key default uuid_generate_v4(),
  title      text not null,
  body       text not null,
  audience   text not null default 'all' check (audience in ('all', 'students', 'teachers', 'batch')),
  batch_id   uuid references public.batches(id) on delete set null,
  created_by uuid not null references public.profiles(id),
  pinned     boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.attendance_records (
  id         uuid primary key default uuid_generate_v4(),
  batch_id   uuid not null references public.batches(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  date       date not null,
  status     text not null default 'present' check (status in ('present', 'absent')),
  marked_by  uuid references public.profiles(id),
  unique (batch_id, student_id, date)
);

create table public.audit_logs (
  id        uuid primary key default uuid_generate_v4(),
  actor_id  uuid references public.profiles(id),
  actor_name text,
  action    text not null,
  entity    text,
  entity_id text,
  details   text,
  ip        inet,
  created_at timestamptz not null default now()
);

create table public.platform_policies (
  id                          uuid primary key default uuid_generate_v4(),
  teachers_can_create_courses boolean not null default true,
  lectures_require_approval   boolean not null default false,
  teacher_schedule_window_days integer not null default 14,
  maintenance_mode            boolean not null default false,
  updated_at                  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes for the hot paths
-- ---------------------------------------------------------------------------
create index idx_profiles_role on public.profiles(role);
create index idx_courses_subject on public.courses(subject_id);
create index idx_lessons_course on public.lessons(course_id);
create index idx_enrollments_student on public.enrollments(student_id);
create index idx_enrollments_course on public.enrollments(course_id);
create index idx_batch_students_batch on public.batch_students(batch_id);
create index idx_live_classes_batch on public.live_classes(batch_id, scheduled_at);
create index idx_live_classes_teacher on public.live_classes(teacher_id);
create index idx_lectures_course on public.recorded_lectures(course_id);
create index idx_orders_created on public.orders(created_at);
create index idx_orders_student on public.orders(student_id);
create index idx_payments_verified on public.payments(verified) where verified = true;
create index idx_submissions_assignment on public.assignment_submissions(assignment_id);
create index idx_attempts_quiz on public.quiz_attempts(quiz_id);
create index idx_attendance_batch_date on public.attendance_records(batch_id, date);
create index idx_audit_created on public.audit_logs(created_at desc);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();
