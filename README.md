# CAD Tech Solution - Monorepo Structure

This is a monorepo project with separate `frontend` and `backend` workspaces.

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
├── package.json             # Root monorepo configuration
├── README.md                # This file
├── OAUTH_SETUP.md          # OAuth setup guide
└── IMPLEMENTATION_MANIFEST.md # Implementation details
```

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18
- npm >= 9

### Installation

```bash
# Install dependencies for both frontend and backend
npm install
```

### Running Development Servers

**Option 1: Run both simultaneously**
```bash
npm run dev
```

**Option 2: Run individually**
```bash
# Terminal 1 - Frontend (http://localhost:5173)
npm run dev:frontend

# Terminal 2 - Backend (http://localhost:5000)
npm run dev:backend
```

### Building for Production

```bash
# Build both frontend and backend
npm run build

# Or build individually
npm run build:frontend
npm run build:backend
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
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback
GITHUB_CLIENT_ID=<your-github-client-id>
GITHUB_CLIENT_SECRET=<your-github-client-secret>
GITHUB_CALLBACK_URL=http://localhost:5000/auth/github/callback
```

See [OAUTH_SETUP.md](OAUTH_SETUP.md) for detailed OAuth configuration.

## 📚 Available Scripts

### Root Scripts
```bash
npm run dev              # Run both frontend and backend
npm run dev:frontend    # Run only frontend
npm run dev:backend     # Run only backend
npm run build           # Build both workspaces
npm run build:frontend  # Build only frontend
npm run build:backend   # Build only backend
npm run preview         # Preview frontend build
npm run lint            # Lint frontend code
```

## 🔍 Workspace Commands

You can run workspace-specific commands:

```bash
# Install dependencies for frontend only
npm install --workspace=frontend

# Run frontend development server
npm run dev --workspace=frontend

# Build frontend
npm run build --workspace=frontend
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
