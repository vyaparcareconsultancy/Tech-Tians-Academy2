# Data Mapping Specification

This document maps all frontend entities and fields (`src/data/mockData.js` and UI usage) to Supabase tables and columns defined in `supabase/migrations/001_schema.sql`, `004_fixes.sql`, and `005_ui_fields.sql`.

Per project rules ([AGENTS.md](file:///Users/nishantsingh/tech-tians-academy%202/AGENTS.md)):
- Database columns: `snake_case`
- JavaScript client objects: `camelCase`
- Conversions are strictly isolated inside `src/lib/api/*`

---

## Entity & Table Mappings

### 1. Profiles (`students` and `teachers`)
**Database Table**: `public.profiles`

Both students and teachers are stored in the unified `profiles` table and partitioned by the `role` column (`student` or `teacher`).

| Client Field (CamelCase) | Database Column (snake_case) | Type | Notes |
| :--- | :--- | :--- | :--- |
| `id` | `id` | `uuid` | Primary Key, references `auth.users(id)` |
| `userId` | `id` | `uuid` | Maps directly to profile ID in Supabase |
| `name` | `full_name` | `text` | Display full name |
| `email` | `email` | `text` | Unique email |
| `role` | `role` | `text` | `'admin'`, `'teacher'`, `'student'` |
| `phone` | `phone` | `text` | Contact phone number |
| `grade` | `grade` | `text` | Class grade (e.g. "Class 11") — students |
| `city` | `city` | `text` | City of residence — students |
| `subject` | `subject` | `text` | Primary teaching subject — teachers |
| `qualification` | `qualification` | `text` | Degrees / credentials — teachers |
| `bio` | `bio` | `text` | Biography profile text — teachers |
| `rating` | `rating` | `numeric(2,1)` | Instructor rating score |
| `status` | `status` | `text` | `'active'`, `'pending'`, `'suspended'`, `'rejected'` |
| `studentId` | `student_id` | `text` | Added in migration 005 (e.g. `STU-24-101`) |
| `lastActiveAt` | `last_active_at` | `timestamptz` | Added in migration 005 |
| `approvedAt` | `approved_at` | `timestamptz` | Approval timestamp for teachers |
| `appliedAt` | `applied_at` | `timestamptz` | Application submission timestamp |
| `createdAt` / `enrolledAt` / `joinedAt` | `created_at` | `timestamptz` | Account creation timestamp |
| `updatedAt` | `updated_at` | `timestamptz` | Auto-updated via trigger |

---

### 2. Subjects
**Database Table**: `public.subjects`

| Client Field (CamelCase) | Database Column (snake_case) | Type | Notes |
| :--- | :--- | :--- | :--- |
| `id` | `id` | `uuid` | Primary Key |
| `name` | `name` | `text` | Unique subject name |
| `code` | `code` | `text` | Short code (e.g. `PHYS`) |
| `color` | `color` | `text` | Hex / tone color code |
| `description` | `description` | `text` | Subject overview |
| `createdAt` | `created_at` | `timestamptz` | Creation timestamp |

---

### 3. Courses
**Database Table**: `public.courses`

| Client Field (CamelCase) | Database Column (snake_case) | Type | Notes |
| :--- | :--- | :--- | :--- |
| `id` | `id` | `uuid` | Primary Key |
| `title` | `title` | `text` | Course title |
| `slug` | `slug` | `text` | URL slug |
| `description` | `description` | `text` | Course curriculum synopsis |
| `category` | `category` | `text` | Category (`JEE`, `NEET`, `Foundation`, `Board`, `Olympiad`) |
| `subjectId` | `subject_id` | `uuid` | FK to `subjects(id)` |
| `coverIndex` | `cover_index` | `integer` | Index in predefined `COVERS` palette |
| `price` | `price` | `integer` | Base price in INR |
| `durationHours` | `duration_hours` | `integer` | Total course duration in hours |
| `level` | `level` | `text` | `'Beginner'`, `'Intermediate'`, `'Advanced'` |
| `status` | `status` | `text` | `'draft'`, `'pending_approval'`, `'published'`, `'archived'` |
| `rating` | `rating` | `numeric(2,1)` | Average course rating |
| `teacherId` | `teacher_id` | `uuid` | Added in migration 005 (syncs to `teacher_courses`) |
| `createdAt` | `created_at` | `timestamptz` | Creation timestamp |
| `publishedAt` | `published_at` | `timestamptz` | Publishing timestamp |

---

### 4. Course Sections
**Database Table**: `public.course_sections`

| Client Field (CamelCase) | Database Column (snake_case) | Type | Notes |
| :--- | :--- | :--- | :--- |
| `id` | `id` | `uuid` | Primary Key |
| `courseId` | `course_id` | `uuid` | FK to `courses(id)` |
| `title` | `title` | `text` | Section / unit heading |
| `order` | `order` | `integer` | Display order index |
| `createdAt` | `created_at` | `timestamptz` | Creation timestamp |

---

### 5. Lessons
**Database Table**: `public.lessons`

| Client Field (CamelCase) | Database Column (snake_case) | Type | Notes |
| :--- | :--- | :--- | :--- |
| `id` | `id` | `uuid` | Primary Key |
| `courseId` | `course_id` | `uuid` | FK to `courses(id)` |
| `sectionId` | `section_id` | `uuid` | FK to `course_sections(id)` |
| `title` | `title` | `text` | Lesson title |
| `type` | `type` | `text` | `'video'`, `'document'`, `'quiz'` |
| `durationMin` | `duration_min` | `integer` | Lesson duration in minutes |
| `videoUrl` | `video_url` | `text` | External video URL |
| `order` | `order` | `integer` | Sequential order |
| `status` | `status` | `text` | `'draft'`, `'pending_approval'`, `'published'` |
| `createdAt` | `created_at` | `timestamptz` | Creation timestamp |

---

### 6. Teacher Courses
**Database Table**: `public.teacher_courses`

| Client Field (CamelCase) | Database Column (snake_case) | Type | Notes |
| :--- | :--- | :--- | :--- |
| `id` | `id` | `uuid` | Primary Key |
| `teacherId` | `teacher_id` | `uuid` | FK to `profiles(id)` |
| `courseId` | `course_id` | `uuid` | FK to `courses(id)` |
| `role` | `role` | `text` | `'owner'`, `'assistant'` |
| `assignedAt` | `assigned_at` | `timestamptz` | Assignment timestamp |

---

### 7. Batches & Batch Students
**Database Tables**: `public.batches` & `public.batch_students`

#### `batches`
| Client Field (CamelCase) | Database Column (snake_case) | Type | Notes |
| :--- | :--- | :--- | :--- |
| `id` | `id` | `uuid` | Primary Key |
| `name` | `name` | `text` | Unique batch name |
| `courseId` | `course_id` | `uuid` | FK to `courses(id)` |
| `teacherId` | `teacher_id` | `uuid` | FK to `profiles(id)` |
| `startDate` | `start_date` | `date` | Cohort start date |
| `endDate` | `end_date` | `date` | Cohort end date |
| `capacity` | `capacity` | `integer` | Seat limit (default 40) |
| `schedule` | `schedule` | `text` | Schedule descriptor |
| `fee` | `fee` | `integer` | Cohort fee in INR |
| `status` | `status` | `text` | `'upcoming'`, `'active'`, `'completed'` |
| `createdAt` | `created_at` | `timestamptz` | Creation timestamp |

#### `batch_students`
| Client Field (CamelCase) | Database Column (snake_case) | Type | Notes |
| :--- | :--- | :--- | :--- |
| `id` | `id` | `uuid` | Primary Key |
| `batchId` | `batch_id` | `uuid` | FK to `batches(id)` |
| `studentId` | `student_id` | `uuid` | FK to `profiles(id)` |
| `enrolledAt` | `enrolled_at` | `timestamptz` | Enrollment timestamp |
| `status` | `status` | `text` | Membership status |

---

### 8. Live Classes
**Database Table**: `public.live_classes`

| Client Field (CamelCase) | Database Column (snake_case) | Type | Notes |
| :--- | :--- | :--- | :--- |
| `id` | `id` | `uuid` | Primary Key |
| `courseId` | `course_id` | `uuid` | FK to `courses(id)` |
| `batchId` | `batch_id` | `uuid` | FK to `batches(id)` |
| `teacherId` | `teacher_id` | `uuid` | FK to `profiles(id)` |
| `title` | `title` | `text` | Class session topic |
| `scheduledAt` | `scheduled_at` | `timestamptz` | Scheduled meeting time |
| `durationMin` | `duration_min` | `integer` | Duration in minutes |
| `meetingUrl` | `meeting_url` | `text` | Live conference room URL |
| `status` | `status` | `text` | `'upcoming'`, `'live'`, `'completed'`, `'cancelled'` |
| `cancelReason` | `cancel_reason` | `text` | Optional cancellation explanation |
| `createdBy` | `created_by` | `uuid` | FK to `profiles(id)` |
| `createdAt` | `created_at` | `timestamptz` | Creation timestamp |

---

### 9. Recorded Lectures
**Database Table**: `public.recorded_lectures`

| Client Field (CamelCase) | Database Column (snake_case) | Type | Notes |
| :--- | :--- | :--- | :--- |
| `id` | `id` | `uuid` | Primary Key |
| `courseId` | `course_id` | `uuid` | FK to `courses(id)` |
| `sectionId` | `section_id` | `uuid` | FK to `course_sections(id)` |
| `batchId` | `batch_id` | `uuid` | Optional FK to `batches(id)` |
| `teacherId` | `teacher_id` | `uuid` | FK to `profiles(id)` |
| `title` | `title` | `text` | Lecture title |
| `description` | `description` | `text` | Lecture description |
| `videoUrl` | `video_url` | `text` | Video streaming URL |
| `durationMin` | `duration_min` | `integer` | Video length in minutes |
| `order` | `order` | `integer` | Display order |
| `status` | `status` | `text` | `'draft'`, `'pending_approval'`, `'published'` |
| `views` | `views` | `integer` | View count |
| `uploadedAt` | `uploaded_at` | `timestamptz` | Upload timestamp |

---

### 10. Study Materials
**Database Table**: `public.study_materials`

| Client Field (CamelCase) | Database Column (snake_case) | Type | Notes |
| :--- | :--- | :--- | :--- |
| `id` | `id` | `uuid` | Primary Key |
| `teacherId` | `teacher_id` | `uuid` | FK to `profiles(id)` |
| `courseId` | `course_id` | `uuid` | FK to `courses(id)` |
| `title` | `title` | `text` | Material title |
| `fileName` | `file_name` | `text` | Name of downloaded file |
| `fileType` | `file_type` | `text` | File extension/type (`pdf`, `docx`, `pptx`) |
| `storageKey` | `storage_key` | `text` | Cloud storage reference key |
| `sizeMB` | `size_mb` | `numeric(6,1)` | Size in megabytes |
| `downloads` | `downloads` | `integer` | Number of student downloads |
| `uploadedAt` | `uploaded_at` | `timestamptz` | Upload timestamp |

---

### 11. Attendance Records
**Database Table**: `public.attendance_records`

| Client Field (CamelCase) | Database Column (snake_case) | Type | Notes |
| :--- | :--- | :--- | :--- |
| `id` | `id` | `uuid` | Primary Key |
| `batchId` | `batch_id` | `uuid` | FK to `batches(id)` |
| `studentId` | `student_id` | `uuid` | FK to `profiles(id)` |
| `date` | `date` | `date` | Date of session |
| `status` | `status` | `text` | `'present'`, `'absent'` |
| `markedBy` | `marked_by` | `uuid` | FK to `profiles(id)` |

---

### 12. Assignments & Submissions
**Database Tables**: `public.assignments` & `public.assignment_submissions`

#### `assignments`
| Client Field (CamelCase) | Database Column (snake_case) | Type | Notes |
| :--- | :--- | :--- | :--- |
| `id` | `id` | `uuid` | Primary Key |
| `courseId` | `course_id` | `uuid` | FK to `courses(id)` |
| `batchId` | `batch_id` | `uuid` | FK to `batches(id)` |
| `teacherId` | `teacher_id` | `uuid` | FK to `profiles(id)` |
| `title` | `title` | `text` | Assignment title |
| `instructions` | `instructions` | `text` | Problem instructions |
| `dueDate` | `due_date` | `timestamptz` | Submission deadline |
| `maxMarks` | `max_marks` | `integer` | Max score |
| `attachments` | `attachments` | `text[]` | Array of attachment file names |
| `status` | `status` | `text` | `'draft'`, `'published'` |
| `resultsPublished` | `results_published` | `boolean` | Flag for published scores |
| `createdAt` | `created_at` | `timestamptz` | Creation timestamp |

#### `assignment_submissions`
| Client Field (CamelCase) | Database Column (snake_case) | Type | Notes |
| :--- | :--- | :--- | :--- |
| `id` | `id` | `uuid` | Primary Key |
| `assignmentId` | `assignment_id` | `uuid` | FK to `assignments(id)` |
| `studentId` | `student_id` | `uuid` | FK to `profiles(id)` |
| `submittedAt` | `submitted_at` | `timestamptz` | Submission timestamp |
| `fileName` | `file_name` | `text` | Uploaded document file name |
| `storageKey` | `storage_key` | `text` | Object storage key |
| `marks` | `marks` | `integer` | Graded marks |
| `feedback` | `feedback` | `text` | Instructor evaluation remarks |
| `status` | `status` | `text` | `'submitted'`, `'late'`, `'graded'` |
| `published` | `published` | `boolean` | Whether student can see score |

---

### 13. Quizzes, Questions & Attempts
**Database Tables**: `public.quizzes`, `public.quiz_questions`, `public.quiz_attempts`

#### `quizzes`
| Client Field (CamelCase) | Database Column (snake_case) | Type | Notes |
| :--- | :--- | :--- | :--- |
| `id` | `id` | `uuid` | Primary Key |
| `courseId` | `course_id` | `uuid` | FK to `courses(id)` |
| `batchId` | `batch_id` | `uuid` | FK to `batches(id)` |
| `teacherId` | `teacher_id` | `uuid` | FK to `profiles(id)` |
| `title` | `title` | `text` | Quiz title |
| `timeLimitMin` | `time_limit_min` | `integer` | Allowed duration in minutes |
| `maxAttempts` | `max_attempts` | `integer` | Added in migration 005 (default 1) |
| `totalMarks` | `total_marks` | `integer` | Max total quiz points |
| `questions` | `questions` | `jsonb` | Array of question objects |
| `status` | `status` | `text` | `'draft'`, `'published'` |
| `resultsPublished` | `results_published` | `boolean` | Score release flag |
| `createdAt` | `created_at` | `timestamptz` | Creation timestamp |

#### `quiz_attempts`
| Client Field (CamelCase) | Database Column (snake_case) | Type | Notes |
| :--- | :--- | :--- | :--- |
| `id` | `id` | `uuid` | Primary Key |
| `quizId` | `quiz_id` | `uuid` | FK to `quizzes(id)` |
| `studentId` | `student_id` | `uuid` | FK to `profiles(id)` |
| `attemptedAt` | `attempted_at` | `timestamptz` | Submission timestamp |
| `score` | `score` | `integer` | Points earned |
| `maxScore` | `max_score` | `integer` | Total available points |
| `answers` | `answers` | `jsonb` | Answers array |
| `status` | `status` | `text` | Added in migration 005 (`'completed'`) |
| `published` | `published` | `boolean` | Score release flag |

---

### 14. Enrollments & Lesson Progress
**Database Tables**: `public.enrollments` & `public.lesson_progress`

#### `enrollments`
| Client Field (CamelCase) | Database Column (snake_case) | Type | Notes |
| :--- | :--- | :--- | :--- |
| `id` | `id` | `uuid` | Primary Key |
| `studentId` | `student_id` | `uuid` | FK to `profiles(id)` |
| `courseId` | `course_id` | `uuid` | FK to `courses(id)` |
| `batchId` | `batch_id` | `uuid` | Optional FK to `batches(id)` |
| `enrolledAt` | `enrolled_at` | `timestamptz` | Enrollment timestamp |
| `status` | `status` | `text` | `'active'`, `'completed'`, `'dropped'` |
| `progressPct` | `progress_pct` | `integer` | Course completion percentage (0-100) |
| `source` | `source` | `text` | `'direct'`, `'coupon'`, `'admin'` |
| `amountPaid` | `amount_paid` | `integer` | Amount paid in INR |
| `createdAt` | `created_at` | `timestamptz` | Creation timestamp |

#### `lesson_progress`
| Client Field (CamelCase) | Database Column (snake_case) | Type | Notes |
| :--- | :--- | :--- | :--- |
| `id` | `id` | `uuid` | Primary Key |
| `studentId` | `student_id` | `uuid` | FK to `profiles(id)` |
| `lessonId` | `lesson_id` | `uuid` | FK to `lessons(id)` |
| `courseId` | `course_id` | `uuid` | FK to `courses(id)` |
| `status` | `status` | `text` | `'in_progress'`, `'completed'` |
| `pct` | `pct` | `integer` | Progress percentage |
| `completedAt` | `completed_at` | `timestamptz` | Completion timestamp |

---

### 15. Commerce: Orders, Payments & Coupons
**Database Tables**: `public.orders`, `public.payments`, `public.coupons`

#### `orders`
| Client Field (CamelCase) | Database Column (snake_case) | Type | Notes |
| :--- | :--- | :--- | :--- |
| `id` | `id` | `uuid` | Primary Key |
| `orderId` | `order_id` | `text` | Unique human ID (`ORD-2026-XXXX`) |
| `studentId` | `student_id` | `uuid` | FK to `profiles(id)` |
| `courseId` | `course_id` | `uuid` | FK to `courses(id)` |
| `amount` | `amount` | `integer` | Final payable amount |
| `discount` | `discount` | `integer` | Discount applied |
| `status` | `status` | `text` | `'pending'`, `'paid'`, `'failed'`, `'refunded'` |
| `couponCode` | `coupon_code` | `text` | Applied coupon |
| `createdAt` | `created_at` | `timestamptz` | Creation timestamp |

#### `payments`
| Client Field (CamelCase) | Database Column (snake_case) | Type | Notes |
| :--- | :--- | :--- | :--- |
| `id` | `id` | `uuid` | Primary Key |
| `orderId` | `order_id` | `uuid` | FK to `orders(id)` |
| `amount` | `amount` | `integer` | Verified transaction amount |
| `status` | `status` | `text` | `'awaiting'`, `'success'`, `'failed'`, `'refunded'` |
| `gateway` | `gateway` | `text` | Razorpay / PhonePe / UPI |
| `txnId` | `txn_id` | `text` | Gateway reference ID |
| `verified` | `verified` | `boolean` | Verified by webhook signature |
| `paidAt` | `paid_at` | `timestamptz` | Payment timestamp |
| `createdAt` | `created_at` | `timestamptz` | Creation timestamp |

#### `coupons`
| Client Field (CamelCase) | Database Column (snake_case) | Type | Notes |
| :--- | :--- | :--- | :--- |
| `id` | `id` | `uuid` | Primary Key |
| `code` | `code` | `text` | Unique promo code |
| `type` | `type` | `text` | `'percent'`, `'fixed'` |
| `value` | `value` | `integer` | Discount percentage or flat INR |
| `validFrom` | `valid_from` | `timestamptz` | Active from |
| `validTill` | `valid_till` | `timestamptz` | Expiry date |
| `maxUses` | `max_uses` | `integer` | Max global redemptions |
| `usedCount` | `used_count` | `integer` | Total redemptions to date |
| `active` | `active` | `boolean` | Is coupon enabled |
| `createdAt` | `created_at` | `timestamptz` | Creation timestamp |

---

### 16. Communications, Operations & Policies
**Database Tables**: `public.announcements`, `public.audit_logs`, `public.platform_policies`

#### `announcements`
| Client Field (CamelCase) | Database Column (snake_case) | Type | Notes |
| :--- | :--- | :--- | :--- |
| `id` | `id` | `uuid` | Primary Key |
| `title` | `title` | `text` | Title |
| `body` | `body` | `text` | Message content |
| `audience` | `audience` | `text` | `'all'`, `'students'`, `'teachers'`, `'batch'` |
| `batchId` | `batch_id` | `uuid` | Optional FK to `batches(id)` |
| `createdBy` | `created_by` | `uuid` | FK to `profiles(id)` |
| `pinned` | `pinned` | `boolean` | Display priority pin |
| `createdAt` | `created_at` | `timestamptz` | Creation timestamp |

#### `audit_logs`
| Client Field (CamelCase) | Database Column (snake_case) | Type | Notes |
| :--- | :--- | :--- | :--- |
| `id` | `id` | `uuid` | Primary Key |
| `actorId` | `actor_id` | `uuid` | FK to `profiles(id)` |
| `actorName` | `actor_name` | `text` | Snapshot actor name |
| `action` | `action` | `text` | Operation code (e.g. `course.published`) |
| `entity` | `entity` | `text` | Target entity table |
| `entityId` | `entity_id` | `text` | Target record ID |
| `details` | `details` | `text` | Audit description or JSON payload |
| `createdAt` | `created_at` | `timestamptz` | Log timestamp |

#### `platform_policies`
| Client Field (CamelCase) | Database Column (snake_case) | Type | Notes |
| :--- | :--- | :--- | :--- |
| `id` | `id` | `uuid` | Primary Key |
| `teachersCanCreateCourses` | `teachers_can_create_courses` | `boolean` | Policy toggle |
| `lecturesRequireApproval` | `lectures_require_approval` | `boolean` | Policy toggle |
| `teacherScheduleWindowDays` | `teacher_schedule_window_days` | `integer` | Booking horizon |
| `maintenanceMode` | `maintenance_mode` | `boolean` | Maintenance lock |
| `updatedAt` | `updated_at` | `timestamptz` | Last updated |
