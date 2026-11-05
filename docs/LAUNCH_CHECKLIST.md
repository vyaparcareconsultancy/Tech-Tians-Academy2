# Launch Readiness Checklist

Run through the items below before taking the platform live. Items are grouped by
area. Check each box once verified.

---

## Security review results (steps 1–2 of launch hardening)

Ran a repository + git-history secret scan and hardened all Edge Functions.

- **Secret scan**
  - No live secrets found in the working tree or git history. Every match for
    `service_role` / `SUPABASE_SERVICE_ROLE_KEY` / `RAZORPAY_KEY_SECRET` /
    `RAZORPAY_WEBHOOK_SECRET` / `re_` / `BEGIN PRIVATE KEY` was either an
    env-var read, a placeholder, or a role grant. No private keys, live
    Razorpay keys, or Resend API keys are committed.
  - The public `anon` key and the Razorpay `key_id` are the only credentials
    that ship to the browser (they are public by design).
  - Demo account credentials remain in `src/pages/Login.jsx` and
    `src/data/mockData.js` (demo-mode only, low risk, required for demo login).
- **Edge functions — CORS**

  - `create-order`, `send-email`, `invite-staff`: replaced `Access-Control-Allow-Origin: *`
    with an allow-list read from `ALLOWED_ORIGINS` (comma separated), defaulting to
    `https://www.techtians.com,https://techtians.com,http://localhost:5173`.
    The request `Origin` is echoed only when it is in the list, and `Vary: Origin`
    is added.
  - `razorpay-webhook`: CORS headers removed entirely (server-to-server webhook; no browser).
- **Edge functions — identity**: `create-order`, `send-email`, `invite-staff` all take the
  caller id **only** from the verified JWT (`supabase.auth.getUser` with the `Authorization`
  header). None trust a user id from the request body.
- **Edge functions — input validation**: all functions validate their inputs and return
  `400` on bad input. `create-order` validates course/batch/coupon server-side; `send-email`
  validates the type and the referenced record + ownership; `invite-staff` validates email
  format, name, subject, and now restricts `redirectTo` to the academy's own origins to
  prevent an open redirect via invite emails.
- **Edge functions — error hygiene**: error responses no longer echo raw DB / third-party
  error messages or stack traces. Details are logged server-side and a generic message is
  returned.
- **Edge functions — webhook signature**: `razorpay-webhook` verifies the HMAC-SHA256
  signature using a constant-time comparison before doing anything.

### Still to do (deploy-time)

- [ ] Set `ALLOWED_ORIGINS` in Supabase to your production domain(s) (e.g.
      `https://www.techtians.com,https://techtians.com`).
- [ ] Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`,
      `RESEND_API_KEY` via `supabase secrets set`.
- [ ] In Vercel, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (anon key only).

---

## 1. Supabase authentication settings & Security Advisor

- [ ] Turn **on** "Confirm email" for new sign-ups.
- [ ] Configure email templates (confirm / invite / reset) to use our branding and `from` address.
- [ ] Review **Auth → Security Advisor** and resolve all warnings.
- [ ] Enable rate limiting / bot protection as recommended by Security Advisor.
- [ ] Ensure `service_role` key is **never** exposed to the browser (verified: only `anon` is used).
- [ ] Confirm RLS is enabled on all tables with correct policies (no weakening).
- [ ] Run a fresh migration and confirm `supabase/tests/run-migrations.sh` passes.

## 2. Razorpay live checkout

- [ ] Switch to **live** Razorpay keys in Supabase (`create-order` uses `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`).
- [ ] Create a **live webhook** in Razorpay pointing to `…/functions/v1/razorpay-webhook`
      for `payment.captured` and `order.paid`, with `RAZORPAY_WEBHOOK_SECRET` matching.
- [ ] Run a **₹1 real payment test** on live keys: create an order, pay, verify enrollment is created and the order/payment status is correct.
- [ ] Verify a free (₹0) enrollment path still works.
- [ ] Verify a cancelled / failed payment does not create an enrollment.

## 3. Vercel environment

- [ ] Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel for production.
- [ ] Confirm the SPA rewrite and security headers (HSTS, nosniff, DENY, Referrer-Policy, Permissions-Policy, CSP Report-Only) are served.
- [ ] Check the CSP **Report-Only** output in the dashboard / console for any blocked origins and adjust before enabling a strict CSP.
- [ ] Confirm `/assets/*` serves long cache headers (public, max-age=31536000, immutable).
- [ ] Ensure `robots.txt`, `sitemap.xml`, and favicon are reachable at the root.

## 4. Backups & data safety

- [ ] Enable scheduled **database backups** in Supabase.
- [ ] Set up and test a **restore** from a backup in a staging project.
- [ ] Document the retention period for auth users, orders, and payment records.
- [ ] Add alerting for failed payments, failed webhooks, and login anomalies.

## 5. Monitoring

- [ ] Add error reporting (e.g. Sentry or Vercel logs) for the frontend.
- [ ] Review Edge Function logs (create-order, send-email, razorpay-webhook, invite-staff).
- [ ] Set up uptime / availability checks for `https://www.techtians.com`.
- [ ] Define alert recipients for payment/webhook failures.

## 6. Legal & trust pages (Razorpay live KYC)

- [ ] Replace all placeholders in `/privacy`, `/terms`, `/refund-policy`, `/contact`:
  - `[COMPANY LEGAL NAME]`
  - `[ADDRESS]`
  - `[SUPPORT EMAIL]`
  - `[PHONE]`
  - `[DATE]` (last-updated dates)
- [ ] Confirm refund policy text matches the in-app refund flow (request → finance approval → order/payment marked refunded).
- [ ] Link all four pages from the public footer (done).
