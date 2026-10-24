# UI QA Checklist & Verification Report

This checklist documents the full UI QA pass conducted across Tech Tians Academy according to [AGENTS.md](file:///Users/nishantsingh/tech-tians-academy%202/AGENTS.md) and [docs/DESIGN_SYSTEM.md](file:///Users/nishantsingh/tech-tians-academy%202/docs/DESIGN_SYSTEM.md).

---

## 1. Dark Theme Class Audit & Cleanup

- [x] **Residual Light Classes Removed**:
  - Grepped `src` for `slate-[0-9]`, `indigo-[0-9]`, `navy-[0-9]`, `text-gray-[0-9]`, `bg-white`, and `shadow-sm`.
  - Removed solitary `shadow-sm` in `src/components/ui.jsx` (Switch knob changed to `shadow-none`).
  - Updated legacy badge tone references (e.g. `tone="slate"` updated to `tone="muted"` in `src/pages/admin/Students.jsx`).
  - Added backward-compatible aliases for `muted` and `default` in `Badge` and `StatusDot`.
  - Audited all occurrences of `bg-white` across `src`: confirmed zero solid white backgrounds; all remaining instances are intentional alpha opacity highlights on dark cards (`bg-white/5`, `bg-white/10`, `bg-white/[0.02]`).
- [x] **Component Uniformity**:
  - Replaced manual unstyled modal div in `src/pages/student/Assignments.jsx` with shared `<Modal>` component.
  - Replaced manual exit confirmation dialog in `src/pages/student/QuizAttempt.jsx` with shared `<ConfirmDialog>`.
  - Zero matches for forbidden promotional jargon (`bitcoin`, `defi`, `crypto`).

---

## 2. Color Contrast & Typography

- [x] **Muted Text Contrast**:
  - `text-muted` (`#94A3B8`) evaluated against surface (`#0F1115`) and void (`#090A0F`).
  - Contrast ratio is **7.4:1** on surface and **8.1:1** on void, meeting WCAG AAA requirements (>= 7.0:1) for normal body text.
- [x] **Brand Orange Accent Text**:
  - `text-brand` (`#F7931A`) evaluated against dark surfaces (**7.8:1** on surface, **8.6:1** on void).
  - Confirmed `text-brand` is reserved for:
    - Large headings & hero gradient titles (`font-heading`)
    - Links with hover underline states
    - Badges with contrasting tinted pills (`bg-brand/10 text-brand border-brand/30`)
    - High-level KPI indicators and interactive active tabs
- [x] **Monospace Numbers & Telemetry**:
  - All currencies (`₹`), percentages, counts, IDs, timestamps, and dates are formatted with `font-mono`.

---

## 3. Keyboard Navigation, Focus Rings & Modal Traps

- [x] **Universal Focus Rings**:
  - In `src/index.css`, applied global `:focus-visible { outline: 2px solid #F7931A; outline-offset: 2px; }` across all focusable elements.
  - Explicit `focus-visible:ring-brand` ring classes verified on all shared interactive primitives (`Button`, `Input`, `Select`, `Textarea`, `Switch`, `IconButton`).
- [x] **Modal Focus Trapping**:
  - Enhanced `Modal` component in `src/components/ui.jsx`:
    - Traps `Tab` and `Shift+Tab` cycles strictly inside the dialog.
    - Automatically focuses the first focusable interactive element upon opening.
    - Returns focus to the previously active element upon modal close.
    - Supports `Escape` key dismissal.
  - Inherited by `ConfirmDialog` and all modal dialogs throughout admin, teacher, and student portals.

---

## 4. Responsive Viewports & Container Overflow

- [x] **Target Breakpoints Checked**:
  - **375px (Mobile)**:
    - Landing: Hero, navigation drawer, stats strip, feature cards, and FAQ accordion wrap without horizontal scroll.
    - Login / Signup: Split-screen left brand column collapses gracefully (`hidden lg:flex`), form container renders full-width with comfortable touch targets.
    - Admin Dashboard: KPI stat grid wraps into single column; charts and activity lists scale down.
    - Course Player: Curriculum sidebar stacks above video section; video container preserves 16:9 aspect ratio.
  - **768px (Tablet)**:
    - 2-column KPI stat cards, medium grid layouts, tablet-friendly navigation bars.
  - **1280px (Desktop)**:
    - Full 12-column layouts: 5-column left panel / 7-column right panel in Auth; 4-column ledger curriculum timeline / 8-column classroom in Course Player.
- [x] **Horizontal Scroll Prevention**:
  - Added `html, body { overflow-x: hidden; max-width: 100vw; }` in `src/index.css`.
  - All tables (`DataTable.jsx`, `Orders.jsx`, `CourseDetail.jsx`) are wrapped in their own `.overflow-x-auto` inner scrolling containers with subtle scrollbars.

---

## 5. Reduced Motion (`prefers-reduced-motion`)

- [x] **Animation & Transition Suppression**:
  - Implemented `@media (prefers-reduced-motion: reduce)` in `src/index.css`:
    - Overrides universal selector with `animation-duration: 0.01ms !important`, `transition-duration: 0.01ms !important`, and `scroll-behavior: auto !important`.
    - Explicitly disables `.animate-float`, `.animate-spin`, `.animate-spin-slow`, `.animate-spin-reverse`, `.animate-bounce`, `.animate-ping`, and `.animate-pulse`.

---

## 6. Route Lazy-Loading & Suspense

- [x] **Code Splitting via `React.lazy`**:
  - All route components in `src/App.jsx` dynamically imported via `React.lazy(() => import(...))`.
  - Layout wrappers (`AdminLayout`, `TeacherLayout`, `StudentLayout`, `PublicLayout`) and auth guards remain synchronously mounted for fast shell transitions.
- [x] **Orange Suspense Spinner**:
  - Added `PageLoader` fallback featuring an orange glowing spinner (`border-2 border-brand border-t-transparent shadow-glow`) and mono loading text.
  - Wrapped root `<Routes>` within `<Suspense fallback={<PageLoader />}>`.

---

## 7. Favicon Update

- [x] **Brand Orange Gradient Mark**:
  - Updated `<link rel="icon">` in `index.html` to an SVG mark with linear gradient (`#EA580C` to `#F7931A`) and white graduation cap icon.

---

## 8. Signup Password Security

- [x] **Password Validation Rules**:
  - Minimum 8 characters required (raised from 6).
  - Must include at least one number (`/[0-9]/`).
  - Added clear helper text: `"Minimum 8 characters with at least one number."`.
  - Updated `computePasswordStrength` algorithm to score based on 8+ characters, numbers, uppercase/lowercase letters, and special symbols.

---

## 9. Verification & Build Status

- [x] **`npm run lint`**: 0 errors, 0 warnings.
- [x] **`npm run build`**: Builds cleanly in ~3.3s, generating split chunk assets for every lazy-loaded route.
