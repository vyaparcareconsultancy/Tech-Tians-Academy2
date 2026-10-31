# Deployment Guide

This guide covers deploying Tech Tians Academy to **Vercel** with **Supabase** backend.

---

## 1. Vercel Project Setup

1. Log in to [Vercel](https://vercel.com) and click **Add New Project**.
2. Import the GitHub repository: `vyaparcareconsultancy/Tech-Tians-Academy2`.
3. Configure the build and project settings:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
4. Click **Deploy**.

---

## 2. Environment Variables in Vercel

Under **Project Settings > Environment Variables**, add only the following public client variables:

| Variable | Value | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` | Your Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` | Supabase Public Anon / Publishable Key |

> [!CAUTION]
> **Never** add `SUPABASE_SERVICE_ROLE_KEY` or `RAZORPAY_KEY_SECRET` in Vercel. Those secrets live exclusively in Supabase Edge Functions environment via `supabase secrets set`.

---

## 3. Supabase Auth Configuration (Post-Deploy)

Once the first deploy finishes and you have your Vercel deployment URL (e.g., `https://tech-tians-academy2.vercel.app`):

1. Go to your **Supabase Dashboard** > **Authentication** > **URL Configuration**.
2. Set **Site URL**:
   ```
   https://<your-vercel-domain>.vercel.app
   ```
3. Under **Redirect URLs**, add:
   - `https://<your-vercel-domain>.vercel.app/login`
   - `https://<your-vercel-domain>.vercel.app/set-password`
   - `http://localhost:5173/set-password` (for local development)
4. Click **Save**.

---

## 4. Razorpay Webhook Configuration

- The Razorpay Webhook URL stays pointed to the Supabase Edge Function:
  ```
  https://<project-ref>.supabase.co/functions/v1/razorpay-webhook
  ```
- **Nothing changes on Vercel** for webhooks because Razorpay communicates directly with Supabase Edge Functions.

---

## 5. Continuous Deployment & Previews

- **Production**: Every push or merge to the `main` branch automatically triggers a production deployment on Vercel.
- **Preview Environments**: Every Pull Request automatically generates a unique Vercel preview deployment URL for isolated testing before merging.
- **SPA Routing**: `vercel.json` already contains the SPA rewrite rule routing `/(.*)` to `/index.html`.
