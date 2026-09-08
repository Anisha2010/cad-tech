# Deployment Guide

This repository contains two independently managed applications:

- Frontend: `frontend/` (React + Vite)
- Backend: `backend/` (Node.js + Express)

The backend currently uses JSON files and Express's default `MemoryStore` for sessions. This is suitable only for development or demo deployment. JSON data can be lost or replaced during redeploys, concurrent writes can conflict, and local JSON files are not appropriate for real payments. Production should later migrate users, payments, and enrollments to MongoDB, and sessions to MongoDB or Redis. Do not treat this deployment as safe for real customer payments.

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
```

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

1. Push the prepared project to GitHub.
2. Deploy the backend on Render.
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

It returns HTTP 200 with `{ "status": "ok", "service": "CadTech API" }` and does not require authentication.

## Environment Variable Names

Frontend:

- `VITE_API_BASE_URL`

Backend:

- `NODE_ENV`
- `PORT`
- `FRONTEND_URL`
- `SESSION_SECRET`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GITHUB_CALLBACK_URL`
