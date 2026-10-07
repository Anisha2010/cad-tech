# Deployment Guide

This repository contains two independently managed applications:

- Frontend: `frontend/` (React + Vite)
- Backend: `backend/` (Node.js + Express)

Users, courses, enrollments and runtime payments use MongoDB through Mongoose; sessions use MongoDB through `connect-mongo`. The original users and payments JSON files are retained as migration backups and are never changed by runtime code.

## MongoDB Setup

1. Create or select a MongoDB Atlas cluster and create a dedicated database user with a strong unique password.
2. Configure Atlas network access for the actual local or Render hosting environment. Do not weaken network access rules automatically.
3. Obtain the application connection string and use database name `cadtech`.
4. Store the connection string only in local `backend/.env` or the Render environment variable `MONGODB_URI`. Never add it to frontend or Vercel variables.
5. Run the dry run locally, review its safe totals, then execute the migration if appropriate.
6. Redeploy Render after adding `MONGODB_URI`, then test registration, login, `/auth/me`, logout and protected routes.

Existing in-memory sessions do not survive this migration. Users may need to log in again.

## Vercel Frontend Settings

Create a Vercel project from the repository with:

- Framework Preset: `Vite`
- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

Add this Vercel environment variable:

```text
VITE_API_BASE_URL=https://your-backend-name.onrender.com
```

This is a public frontend configuration value, not a secret. Vite environment variables are embedded into the browser bundle. Redeploy Vercel after changing it.

The frontend includes `frontend/vercel.json` so React Router URLs continue working after refresh, including `/login`, `/register`, `/student/dashboard`, `/student/my-courses`, and `/courses/:courseSlug`.

## Render Backend Settings

Create a Render Web Service with:

- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`

Add these Render environment variables:

```text
NODE_ENV=production
FRONTEND_URL=https://your-project.vercel.app
SESSION_SECRET=generate_a_long_random_secret
MONGODB_URI=mongodb+srv://username:password@cluster.example.mongodb.net/cadtech?retryWrites=true&w=majority
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password
SMTP_FROM=CadTech Solution <no-reply@your-domain.example>
```

SMTP is required for email verification, OTP sign-in, and password recovery. Configure the sender/domain with your provider before production use. Optional authentication controls default to a 10-minute OTP, five wrong attempts, a 24-hour verification link, and a 60-second resend cooldown. Allowed ranges are 5-30 minutes, 3-10 attempts, 1-168 hours, and 30-300 seconds respectively.

Do not manually set `PORT` on Render. Render supplies it to the service. If payment functionality is enabled, add `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` only on Render/backend. Never put Razorpay secrets in frontend code.

## Local Development

```bash
cd frontend
npm install
npm run dev
```

In another terminal:

```bash
cd backend
npm install
npm run dev
```

Copy `frontend/.env.example` to a local `frontend/.env` and `backend/.env.example` to a local `backend/.env` when needed. These local files must not be committed.

## Deployment Order

1. Deploy the backend on Render.
3. Copy the Render backend URL.
4. Import the GitHub repository into Vercel.
5. Select `frontend` as the Vercel Root Directory.
6. Add `VITE_API_BASE_URL` using the Render URL.
7. Deploy the frontend.
8. Copy the final Vercel production URL.
9. Update `FRONTEND_URL` on Render.
10. Redeploy or restart the Render backend.
11. Redeploy Vercel if frontend environment variables changed.
12. Test registration, login, logout, protected routes, and the public `/health` endpoint.

## Health Check

The backend exposes:

```text
GET /health
```

It returns HTTP 200 with `{ "status": "ok", "service": "CadTech API", "database": "connected" }` when MongoDB is connected, and HTTP 503 otherwise. It does not require authentication.

## User Migration

Run from `backend/` after `MONGODB_URI` is configured:

```bash
npm run migrate:users:check
npm run migrate:users
```

The first command is dry-run only. The second is the explicit write operation and is idempotent by normalized email. The source `backend/data/users.json` is not deleted or modified.

## Payment Storage and Razorpay

Runtime payments are stored in the `payments` collection. The model stores provider order/payment identifiers, trusted course pricing in paise, status, verification/failure/refund timestamps, and review flags. It never stores signatures, keys, card data, CVV, UPI PINs, or bank credentials.

Indexes include unique `providerOrderId`, unique sparse `providerPaymentId`, `{ userId, createdAt }`, `{ userId, courseId }`, and `{ status, updatedAt }`. Webhook delivery claims are stored in `webhookevents` with a unique `{ provider, eventId }` index and no raw payload.

Payment endpoints:

- `POST /payments/orders`
- `POST /payments/verify`
- `POST /payments/webhook`
- `GET /student/payments?page=1&limit=12`

Use Razorpay Test Mode keys for local verification. Configure the webhook URL as `https://<render-service>/payments/webhook`; the endpoint verifies the exact raw request body with `RAZORPAY_WEBHOOK_SECRET` and does not require a browser session. Supported success events are `payment.captured` and `order.paid`; failed events are recorded without creating enrollment. Duplicate verification and webhook delivery are idempotent.

The legacy file remains at `backend/data/payments.json` as a backup. It is read only by the migration script:

```bash
cd backend
npm run migrate:payments:check
npm run migrate:payments
```

The first command is dry-run only. The second is an explicit write operation, is idempotent by provider order ID, does not create enrollments, and flags legacy paid records for review. Do not run it until MongoDB course and user records are available. Real customer payments require compliant Razorpay account activation, production webhook verification, and manual production testing.

## Environment Variable Names

Frontend:

- `VITE_API_BASE_URL`

Backend:

- `NODE_ENV`
- `PORT`
- `FRONTEND_URL`
- `SESSION_SECRET`
- `MONGODB_URI`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_FROM`
- `LOGIN_OTP_TTL_MINUTES` (optional)
- `LOGIN_OTP_MAX_ATTEMPTS` (optional)
- `EMAIL_VERIFICATION_TTL_HOURS` (optional)
- `AUTH_EMAIL_RESEND_COOLDOWN_SECONDS` (optional)
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GITHUB_CALLBACK_URL`

## Student Dashboard Data

Course records are seeded explicitly from the trusted catalog with:

```bash
cd backend
npm run seed:courses
```

The seed is idempotent and upserts by course slug. It does not run during server startup or deployment. MongoDB uses `courses` and `enrollments` collections. Enrollment records have a unique `{ userId, courseId }` index and a `{ userId, enrolledAt }` index; course slugs are unique. Only `published` courses are returned by student enrollment queries.

Student endpoints:

- `GET /student/dashboard`
- `GET /student/enrollments?status=all&search=&page=1&limit=12`

Both endpoints require an authenticated student session. To test manually, seed courses, register or log in as a student, open `/student/dashboard`, confirm the empty state uses zero MongoDB counts, then verify `/student/my-courses` search, status filters, pagination, refresh, logout, and instructor/unauthenticated access behavior.

Course-player progress is not implemented yet. New enrollments therefore remain at 0% with no last-accessed or completion date. Do not add real credentials or personal data to the repository.
