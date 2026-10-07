# CAD Tech Solution

This project has independently managed `frontend` and `backend` applications.

## 📁 Project Structure

```
cadtech-solution/
├── frontend/                  # React + Vite Frontend
│   ├── src/                  # Source code
│   │   ├── components/       # React components
│   │   ├── pages/           # Page components
│   │   ├── context/         # Context API (Auth, Theme)
│   │   ├── services/        # API services
│   │   ├── data/            # Mock data
│   │   ├── styles/          # Global styles
│   │   ├── layouts/         # Layout components
│   │   └── routes/          # Route protection
│   ├── public/              # Static assets
│   ├── index.html           # HTML entry point
│   ├── package.json         # Frontend dependencies
│   ├── vite.config.js       # Vite configuration
│   └── .oxlintrc.json       # Linting config
│
├── backend/                   # Express.js Backend
│   ├── server.js            # Main server file
│   ├── package.json         # Backend dependencies
│   ├── data/
│   │   └── users.json       # User database
│   ├── .env                 # Environment variables (local)
│   └── .env.example         # Environment template
│
├── README.md                # This file
├── OAUTH_SETUP.md          # OAuth setup guide
└── IMPLEMENTATION_MANIFEST.md # Implementation details
```

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18
- npm >= 9

### Playwright E2E Runtime

Use Node 20 LTS for Playwright E2E runs. The repository `.nvmrc` selects Node 20 for version managers, and the frontend `e2e:runner:*` scripts invoke the npm-distributed Node 20 binary without replacing the system Node installation. Validation with Playwright 1.52.0: Node 20 listed the CadTech tests and passed its diagnostic test; the clean project listed and passed its Node-only test under Node 20. The clean project also listed under Node 24, but its execution was not run. CadTech discovery with Node 24 hung for 90 seconds, and its minimal runtime-config discovery hung for 45 seconds, so Node 24 compatibility is not established as the sole cause. The full authorization suite still requires a dedicated safe E2E database and credentials.

```bash
cd frontend
npm run e2e:runner:list
npm run e2e:runner:auth
```

Do not run lifecycle or mutation tests unless `E2E_MONGODB_URI` points to a confirmed test database. Do not change the production Node runtime based only on this local E2E diagnosis.

To configure E2E locally, create `backend/.env.e2e.local` and `frontend/.env.e2e.local` from their `.env.e2e.example` templates. Set the backend `E2E_MONGODB_URI` to a dedicated MongoDB database named `cadtech_e2e`, provide a unique E2E `SESSION_SECRET` of at least 32 characters, and set separate E2E Student, Instructor, and Admin emails/passwords in both frontend and backend files. The frontend local file overrides `.env.e2e` only for nonblank values, so blank template entries do not erase existing local credentials. Never copy production credentials into these files; they are ignored by Git. The E2E backend refuses to start without the isolated URI and never falls back to `MONGODB_URI`.

Start only the dedicated E2E backend with `cd backend && npm run start:e2e`, then start Vite with `VITE_API_BASE_URL=http://127.0.0.1:5000 VITE_PUBLIC_SITE_URL=http://127.0.0.1:5173 npm run dev -- --host 127.0.0.1 --port 5173`. Confirm the backend health response names `cadtech_e2e`, then run `cd backend && npm run seed:e2e`. Once the E2E service and fixtures are ready, run the Node 20 Playwright scripts from `frontend`. For lifecycle cleanup, set `E2E_RUN_ID` to the exact ID printed in the test title and run `npm run cleanup:e2e`; this only removes records with that run ID and never fixture users.

### Installation

```bash
# Install frontend dependencies
cd frontend && npm install

# In another terminal, install backend dependencies
cd backend && npm install
```

### Running Development Servers

Run each application from its own folder in a separate terminal.
```bash
# Terminal 1 - Frontend (http://localhost:5173)
cd frontend
npm run dev
```

```bash
# Terminal 2 - Backend (http://localhost:5000)
cd backend
npm run dev
```

### Building for Production

```bash
# Frontend
cd frontend
npm run build

# Backend
cd backend
npm run build
```

## 📦 Workspaces

### Frontend Workspace (`/frontend`)
- **Framework**: React 19 + Vite 8
- **Styling**: Tailwind CSS + Bootstrap
- **Routing**: React Router v7
- **State Management**: Context API (Auth, Theme)
- **HTTP Client**: Axios
- **Animations**: Framer Motion
- **Icons**: Lucide React

**Key Features:**
- User authentication (Email/Password, Google OAuth, GitHub OAuth)
- Student Dashboard
- Instructor Dashboard
- Course browsing and enrollment
- CAD Models catalog
- Services and pricing
- Contact form
- Light/Dark theme toggle
- Fully responsive design

### Backend Workspace (`/backend`)
- **Framework**: Express.js 5
- **Database**: JSON-based (data/users.json)
- **Authentication**: Session-based with HttpOnly cookies
- **OAuth**: Google & GitHub OAuth 2.0
- **Password Security**: bcryptjs hashing
- **CORS**: Cross-origin request handling

**API Endpoints:**
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user
- `POST /auth/logout` - User logout
- `GET /auth/google` - Google OAuth initiation
- `GET /auth/google/callback` - Google OAuth callback
- `GET /auth/github` - GitHub OAuth initiation
- `GET /auth/github/callback` - GitHub OAuth callback

## 🔐 Environment Setup

### Frontend (.env)
```
VITE_API_BASE_URL=http://localhost:5000
VITE_APP_NAME=CAD Tech Solution
```

### Backend (.env)
```
FRONTEND_URL=http://localhost:5173
PORT=5000
SESSION_SECRET=<random-64-char-string>
SMTP_HOST=<your-smtp-host>
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<your-smtp-user>
SMTP_PASSWORD=<your-smtp-password>
SMTP_FROM=CadTech Solution <no-reply@your-domain.example>
LOGIN_OTP_TTL_MINUTES=10
LOGIN_OTP_MAX_ATTEMPTS=5
EMAIL_VERIFICATION_TTL_HOURS=24
AUTH_EMAIL_RESEND_COOLDOWN_SECONDS=60
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback
GITHUB_CLIENT_ID=<your-github-client-id>
GITHUB_CLIENT_SECRET=<your-github-client-secret>
GITHUB_CALLBACK_URL=http://localhost:5000/auth/github/callback
```

See [OAUTH_SETUP.md](OAUTH_SETUP.md) for detailed OAuth configuration.

## 📚 Application Commands

```bash
# From the frontend folder
cd frontend
npm run dev
npm run build
npm run lint
npm run preview

# From the backend folder
cd backend
npm run dev
npm run start
npm run build
```

## 🛠️ Development Workflow

1. **Frontend Development**: Changes in `/frontend/src` are hot-reloaded by Vite
2. **Backend Development**: Start backend server, changes may require restart
3. **API Communication**: Frontend calls `VITE_API_BASE_URL/api/*` endpoints

## 📖 Documentation

- [OAUTH_SETUP.md](OAUTH_SETUP.md) - Complete OAuth 2.0 configuration guide
- [IMPLEMENTATION_MANIFEST.md](IMPLEMENTATION_MANIFEST.md) - Detailed feature implementation

## 🎯 Features Implemented

✅ User Authentication (Email/Password)
✅ Google OAuth 2.0
✅ GitHub OAuth 2.0
✅ Session Management
✅ Role-based Access (Student/Instructor)
✅ Course Management
✅ CAD Models Catalog
✅ Services Listing
✅ Contact Form
✅ Light/Dark Theme
✅ Responsive Design
✅ Accessibility Features

## 📝 License

ISC
# cad-tech
