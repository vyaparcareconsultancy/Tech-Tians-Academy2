# Tech Tians Academy — Admin & Teacher Portal

A modern e-learning management platform for running online courses: batches, live
classes, recorded lectures, assignments, quizzes, enrollments and verified
payments — with strict role separation between **Admin** and **Teacher**.

Built with **React 18 + Vite, Tailwind CSS, React Router, Lucide React,
Recharts and Supabase** (Auth + PostgreSQL).

> **Currently running in DEMO MODE.** No Supabase credentials are configured, so
> the app uses clearly-labelled simulated data held in memory. Nothing is
> persisted or sent anywhere. See [Demo mode](#demo-mode) and
> [Integration status](#integration-status--what-is-mocked).

---

## Quick start

```bash
cd tech-tians-academy
npm install
npm run dev        # http://localhost:5173
npm run build      # production bundle in dist/
npm run preview    # serve the production build
```

### Demo accounts (demo mode)

| Role    | Email                          | Password         | Lands on            |
|---------|--------------------------------|------------------|---------------------|
| Admin   | `admin@techtians.academy`      | `Admin@12345`    | `/admin/dashboard`  |
| Teacher | `meera.rao@techtians.academy`  | `Teacher@12345`  | `/teacher/dashboard`|
| Student | `rohan.verma@techtians.academy`| `Student@12345`  | blocked (learner app only) |

---

## Features

### Authentication & routing
- Split-screen premium login with validation, show/hide password, remember-me,
  loading state and quick demo-login tiles
- Role read from a **trusted record** (mock profile in demo mode; `profiles`
  table in Supabase mode) — users can never choose or assign their own role
- Admin → `/admin/dashboard`, Teacher → `/teacher/dashboard`; unauthenticated
  → `/login`; wrong-role route access is redirected away (teachers cannot open
  admin routes and vice versa)
- Forgot-password flow (simulated in demo mode; calls
  `supabase.auth.resetPasswordForEmail` when configured)
- No public registration page — staff accounts are invited by admins
- Logout in the profile menu

### Admin panel (16 modules)
Dashboard (8 KPI cards, enrollment-growth and revenue charts, recent
registrations/payments, upcoming classes, pending approvals, course
performance), Students (search/filter, profile drawer, edit, activate/suspend,
progress), Teachers (directory, invite, application review with
approve/reject, course assignment, suspend), Courses (full lifecycle: create,
edit, publish, unpublish, archive, preview, validated forms), Subjects,
Batches (capacity tracking, enrollment view, status), Live Classes (schedule,
reschedule, cancel), Recorded Lectures (add, reorder, publish), Assignments
(create, grade, publish results), Tests & Quizzes (MCQ builder, attempts,
results), Enrollments, Payments & Orders (verified-records protection, refund
request flow, **CSV export**), Coupons, Announcements, Reports & Analytics
(4 charts + CSV exports), Settings (policies, notification prefs, **audit
log**, demo reset).

### Teacher panel (14 modules)
Scoped strictly to the signed-in teacher: Dashboard, My Courses, Course Builder
(sections/lessons, reorder, drafts, submit-for-approval), My Students
(search/filter, permitted progress view only), My Batches, Live Classes,
Recorded Lectures (authorized YouTube/Vimeo URLs only), Study Materials,
Assignments, Tests & Quizzes, Attendance (daily marking + 14-day summary),
Student Progress, Announcements, My Profile.

Teachers **cannot** see other teachers' records, payment administration, or
platform-wide settings.

### Design system
Deep navy (`#12233F`) + indigo palette, Inter typography, clean cards with
subtle borders, consistent button/badge/table system, responsive layouts with a
mobile drawer sidebar, sorting/pagination/empty states everywhere.

## Project structure

```
tech-tians-academy/
├── index.html                 # Vite entry, inline SVG favicon
├── package.json
├── vite.config.js             # + manualChunks (vendor / recharts)
├── tailwind.config.js         # navy design tokens
├── .env.example               # placeholder env file (no secrets)
├── supabase/
│   ├── migrations/
│   │   ├── 001_schema.sql     # 20+ tables, UUID PKs, FKs, constraints, indexes
│   │   ├── 002_rls.sql        # RLS enablement + all policies
│   │   └── 003_server_functions.sql  # verify_payment(), refunds, audit trigger
│   └── seed/demo_staff.sql
└── src/
    ├── main.jsx               # providers: Router → Toast → Auth → Data
    ├── App.jsx                # route tree with role guards
    ├── index.css
    ├── data/mockData.js       # deterministic demo dataset (mirrors the schema)
    ├── lib/
    │   ├── supabase.js        # client bootstrap; detects demo vs supabase mode
    │   ├── auth.jsx           # AuthProvider: login/logout, role from trusted record
    │   ├── store.jsx          # DataProvider: entity CRUD + audit + helpers
    │   ├── utils.js           # formatters, CSV export, URL validators
    │   └── validators.js      # shared field rules
    ├── components/
    │   ├── ui.jsx             # design-system primitives + toast system
    │   ├── DataTable.jsx      # sorting, pagination, empty states
    │   ├── Layout.jsx         # admin/teacher shells (sidebar, topbar, search,
    │   │                      #   notifications, profile menu, mobile drawer)
    │   └── Guards.jsx         # RequireAuth / RequireRole
    └── pages/
        ├── Login.jsx, ForgotPassword.jsx
        ├── admin/             # 16 admin modules
        └── teacher/           # 14 teacher modules
```

## Configuration

Copy `.env.example` to `.env.local`:

```bash
VITE_SUPABASE_URL=            # e.g. https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=       # public anon key only — NEVER service_role
VITE_APP_NAME=Tech Tians Academy
```

- Leave both Supabase variables **empty** → the app stays in labelled demo mode.
- Set both → the app uses Supabase Auth for login and reads the staff role from
  the `profiles` table. Entity CRUD in Supabase mode is **not** wired yet and
  will surface a clear error instead of silently pretending (see below).

### Supabase Auth URL Configuration

For staff invite links and password reset flows to work properly, configure the allowed redirect URLs in your Supabase project:
1. Go to **Authentication** > **URL Configuration** in the Supabase Dashboard.
2. In **Redirect URLs**, add:
   - `http://localhost:5173/set-password` (for local development)
   - `<production-url>/set-password` (e.g. `https://your-domain.com/set-password` for production)

## Demo mode

Demo mode is the default and is clearly labelled with an amber banner on every
dashboard. The dataset is deterministic (seeded PRNG) so every reload shows the
same realistic data: 26 students, 9 teachers, 12 courses, 9 batches, ~150
enrollments, 14 live classes, 12 assignments, 6 quizzes, 8 months of orders and
payments, attendance, coupons, announcements and an audit trail.

**Reset demo data:** Admin → Settings → Danger zone → *Reset demo data*.

## Integration status — implemented vs mocked

| Area | Status |
|---|---|
| Login UI, validation, loading, role-based redirect | ✅ Implemented (demo auth against trusted mock records) |
| Supabase Auth login / logout / reset-password | ✅ Code-ready; active only when env vars are set |
| Role sourced from DB record (`profiles.role`) | ✅ Demo: mock profile · Supabase: real query |
| Route protection (admin/teacher separation) | ✅ Implemented client-side; enforced again by RLS |
| Admin & teacher panels (all 30 modules) | ✅ Implemented with full CRUD against in-memory demo data |
| Dashboards & analytics charts (Recharts) | ✅ Implemented, demo data |
| CSV export (payments, students, enrollments) | ✅ Implemented (client-side) |
| Database schema, indexes, RLS policies | ✅ SQL migrations delivered (run in Supabase) |
| Audit logging | ✅ Demo: in-memory log viewable in Settings · Supabase: insert path ready |
| Payment gateway + webhook verification | ⬜ External integration required — `verify_payment()` stub + RLS provided; no gateway connected |
| Video hosting / large file uploads | ⬜ External integration required — only authorized YouTube/Vimeo URLs are stored; files must go to object storage via signed URLs |
| Real-time live video streaming | ⬜ Not provided — meeting links are external (Zoom/Meet/etc.) |
| Entity CRUD against real Supabase tables | ⬜ Pending — swap the demo mutations in `src/lib/store.jsx` for `supabase.from(...)` calls; the UI contract is already table-shaped |

**Honesty note:** with no Supabase credentials present, the app never claims a
database or gateway connection. All mutating actions are simulated and every
dashboard carries a "sample data" badge.

## Security model (for the Supabase deployment)

- RLS enabled + forced on every table (`002_rls.sql`)
- Teachers: `teacher_courses`-scoped access to courses, sections, lessons,
  lectures, materials, assignments, quizzes, attendance and their own students
- Students: read/write only their own enrollments, progress, submissions,
  attempts and orders
- `orders`/`payments`: **read-only from clients**; writes happen exclusively
  through the server-side `verify_payment()` procedure after signed gateway
  webhook verification; refunds follow a two-step authorized process
- `audit_logs`: admin-readable, insertable only by the server
- Service-role key and gateway secrets stay server-side (Edge Functions);
  only the anon key ships to the browser
- Roles are granted by admins in `profiles`; signup defaults to `student`

## Deployment

**Frontend** (any static host):

```bash
npm run build
# deploy dist/ to Vercel / Netlify / Surge / nginx
```

 SPA routing needs a fallback to `index.html` (Vercel: `vercel.json` rewrite;
 Netlify: `_redirects` with `/* /index.html 200`).

**Backend (optional but recommended for production):**

1. Create a Supabase project; run the three migrations in order
   (`supabase/migrations/001..003`) or `supabase db reset` with local dev.
2. Create staff auth users in the dashboard, then promote them via
   `supabase/seed/demo_staff.sql` (admins only).
3. Enable the `on_auth_user_created` trigger from `003_server_functions.sql`.
4. Set `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.
5. Configure your payment gateway's webhook to call the Edge Function that
   invokes `public.verify_payment(...)`.
6. Wire file uploads to Supabase Storage with signed, expiring URLs.

---

## Payments setup (Razorpay)

Course enrollment is strictly server-verified. The frontend invokes the `create-order` Edge Function, launches Razorpay checkout, and waits for enrollment confirmation. Webhooks (`razorpay-webhook`) verify payment signatures with HMAC SHA-256 and invoke `public.verify_payment(...)` to activate enrollment and increment coupon usage idempotently.

### 1. Configure Supabase Secrets

Generate your test API keys in the Razorpay Dashboard (**Settings > API Keys**) and configure a webhook secret. Then set them in Supabase:

```bash
supabase secrets set \
  RAZORPAY_KEY_ID="rzp_test_YourKeyIdHere" \
  RAZORPAY_KEY_SECRET="YourKeySecretHere" \
  RAZORPAY_WEBHOOK_SECRET="YourWebhookSecretHere"
```

### 2. Deploy Edge Functions

Deploy the order creation function and the webhook handler (deployed with `--no-verify-jwt` so Razorpay can send unauthenticated signed webhooks):

```bash
supabase functions deploy create-order
supabase functions deploy razorpay-webhook --no-verify-jwt
```

### 3. Razorpay Webhook Configuration

In the Razorpay Dashboard under **Settings > Webhooks**, create a new webhook:
- **Webhook URL**: `https://<project-ref>.supabase.co/functions/v1/razorpay-webhook`
- **Secret**: The exact secret configured in `RAZORPAY_WEBHOOK_SECRET`
- **Active Events**:
  - `payment.captured`
  - `order.paid`

### 4. Razorpay Test Card Details (Sandbox)

Use these credentials to simulate payments during testing:

| Card Number | Expiry | CVV | OTP | Result |
|-------------|--------|-----|-----|--------|
| `4111 1111 1111 1111` | Any future date (e.g. `12/28`) | `123` | `1234` or any 4-6 digit OTP | **Success** |
| `4000 0000 0000 0002` | Any future date | `123` | `1234` | **Failed transaction** |

You can also use Razorpay's simulated UPI flow in test mode (`success@razorpay` for instant approval).

---

## Roadmap (not yet built)

Student-facing learner app, live video (Jitsi/Whereby embed), gateway
checkout (Razorpay/PhonePe), email notifications, mobile apps, i18n.
