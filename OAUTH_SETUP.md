# CadTech Solution – OAuth 2.0 Social Authentication

Complete social authentication implementation using Google and GitHub OAuth 2.0 with a secure Node.js/Express backend.

## Architecture

**Frontend** (React + Vite)
- Email/password login and registration (existing)
- Social login buttons for Google and GitHub
- OAuth callback handler that verifies backend-confirmed users
- Navbar displays authenticated user and role-based dashboard links

**Backend** (Node.js/Express)
- OAuth 2.0 Authorization Code Flow
- Secure session management with HttpOnly cookies
- User database with support for multiple auth providers
- Email verification for social accounts
- Role assignment (student/instructor)

## Features

✅ Email/password authentication (email + 8+ char password)  
✅ Google OAuth (verified email required)  
✅ GitHub OAuth (verified email required)  
✅ Secure session cookies (HttpOnly, SameSite)  
✅ CSRF protection via session state validation  
✅ Account safety (no silent linking by email)  
✅ Role-based dashboards (student/instructor)  
✅ Light/dark theme support  
✅ Mobile responsive  
✅ Accessibility (ARIA, keyboard navigation)  

## Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Google OAuth app credentials
- GitHub OAuth app credentials

### Frontend Setup

```bash
cd /Users/test/Desktop/newone

# Install dependencies
npm install

# Create .env.local
cat > .env.local << EOF
VITE_API_BASE_URL=http://localhost:5000
VITE_APP_NAME=CAD Tech Solution
EOF

# Start dev server
npm run dev
# Visit http://localhost:5173
```

### Backend Setup

```bash
cd /Users/test/Desktop/newone/backend

# Install dependencies
npm install

# Create .env
cp .env.example .env

# Edit .env with your credentials:
# FRONTEND_URL=http://localhost:5173
# SESSION_SECRET=<generate a secure random string>
# GOOGLE_CLIENT_ID=<from Google Cloud Console>
# GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
# GITHUB_CLIENT_ID=<from GitHub Settings>
# GITHUB_CLIENT_SECRET=<from GitHub Settings>

# Start backend
npm run dev
# Runs on http://localhost:5000
```

## Obtaining OAuth Credentials

### Google

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable the "Google+ API"
4. Create an OAuth 2.0 credential (Web application)
5. Add authorized redirect URI: `http://localhost:5000/auth/google/callback`
6. Copy Client ID and Client Secret

### GitHub

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Create a new OAuth App
3. Set Authorization callback URL: `http://localhost:5000/auth/github/callback`
4. Copy Client ID and Client Secret

## Testing the OAuth Flow

### Email/Password Login

1. Visit http://localhost:5173/register
2. Create account with email and password
3. Sign in at http://localhost:5173/login
4. Redirected to dashboard based on role

### Google OAuth

1. Visit http://localhost:5173/login
2. Click "Continue with Google"
3. Authenticate with Google account
4. Redirected to callback handler
5. Account auto-created if first-time user
6. Redirected to student dashboard

### GitHub OAuth

1. Visit http://localhost:5173/login
2. Click "Continue with GitHub"
3. Authenticate with GitHub account
4. Authorize requested scopes (read:user user:email)
5. Redirected to callback handler
6. Account auto-created with verified email
7. Redirected to student dashboard

### Cancel OAuth

- Clicking "Cancel" or denying permissions shows friendly message
- User redirected to login to try again

## File Structure

```
/Users/test/Desktop/newone/
├── backend/
│   ├── package.json
│   ├── server.js              # Express server, OAuth routes
│   ├── data/
│   │   └── users.json         # User database (auto-created)
│   ├── .env.example
│   └── .gitignore
├── src/
│   ├── App.jsx                # Routes including /auth/callback
│   ├── services/
│   │   └── authService.js     # API calls + OAuth initiation
│   ├── context/
│   │   └── AuthContext.jsx    # Auth state + refreshUser
│   ├── components/auth/
│   │   ├── SocialLoginButtons/
│   │   │   ├── SocialLoginButtons.jsx
│   │   │   └── SocialLoginButtons.css
│   │   ├── AuthLayout/
│   │   ├── PasswordField/
│   ├── pages/auth/
│   │   ├── Login/Login.jsx    # Email + social buttons
│   │   ├── Register/Register.jsx
│   │   └── OAuthCallback/
│   │       ├── OAuthCallback.jsx
│   │       └── OAuthCallback.css
│   ├── routes/
│   │   └── ProtectedRoute.jsx # Role-based protection
│   └── ...
├── .env.example               # Frontend env template
├── .gitignore
└── package.json
```

## API Endpoints

### Authentication

**POST /auth/register**
```
{ name, email, phone?, role: "student"|"instructor", password }
→ { user: { id, name, email, role, authProviders } }
```

**POST /auth/login**
```
{ email, password }
→ { user: { id, name, email, role, authProviders } }
```

**GET /auth/me**
```
→ { user: { id, name, email, role, authProviders } }
```

**POST /auth/logout**
```
→ { success: true }
```

### OAuth Flows

**GET /auth/google**
- Redirects to Google authorization
- Returns user via callback

**GET /auth/google/callback**
- Receives authorization code from Google
- Validates state and verifies email
- Creates or retrieves user
- Sets session cookie
- Redirects to `/auth/callback?status=success`

**GET /auth/github**
- Redirects to GitHub authorization
- Returns user via callback

**GET /auth/github/callback**
- Receives authorization code from GitHub
- Validates state
- Fetches verified email
- Creates or retrieves user
- Sets session cookie
- Redirects to `/auth/callback?status=success`

## Security Measures

- **OAuth State Validation**: Cryptographic state prevents CSRF
- **Email Verification**: Only verified emails from providers accepted
- **No Email Linking**: Existing accounts not auto-linked by email
- **No Secrets in Frontend**: Client secrets stay on backend only
- **No Tokens in URLs**: Access tokens not exposed in redirects
- **HttpOnly Cookies**: Session cookies immune to XSS
- **Session Regeneration**: Session ID changes after login
- **SameSite Cookies**: CSRF protection via cookie policy
- **User Isolation**: Backend confirms role before redirecting

## Environment Variables

### Frontend (.env.local)

```
VITE_API_BASE_URL=http://localhost:5000
VITE_APP_NAME=CAD Tech Solution
```

### Backend (.env)

```
FRONTEND_URL=http://localhost:5173
PORT=5000
SESSION_SECRET=<64+ character random string>

GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback

GITHUB_CLIENT_ID=<your-github-client-id>
GITHUB_CLIENT_SECRET=<your-github-client-secret>
GITHUB_CALLBACK_URL=http://localhost:5000/auth/github/callback
```

## Production Deployment

1. **Frontend**
   - Build: `npm run build`
   - Deploy `dist/` to CDN/static host
   - Update `VITE_API_BASE_URL` to production backend URL

2. **Backend**
   - Use strong `SESSION_SECRET` (generate via `openssl rand -hex 32`)
   - Set `NODE_ENV=production`
   - Use HTTPS URLs for callbacks
   - Enable secure cookie flags (automatic in production)
   - Use environment variable service (AWS Secrets Manager, etc.)

## Verification Checklist

- [x] Email/password login works
- [x] Email/password registration works
- [x] Google OAuth starts real Google authentication
- [x] GitHub OAuth starts real GitHub authentication
- [x] OAuth state validation prevents CSRF
- [x] Callbacks redirect to backend first
- [x] No secrets in frontend bundle
- [x] No tokens in callback URLs
- [x] First-time social users get student role
- [x] Existing accounts not silently linked
- [x] Protected routes check backend-confirmed role
- [x] Cancelling OAuth shows friendly message
- [x] Logout works for all auth methods
- [x] Navbar updates after login
- [x] Light/dark themes work
- [x] Mobile layout responsive

## Troubleshooting

**"Social authentication is not connected yet"**
- Ensure `VITE_API_BASE_URL` is set in `.env.local`
- Backend must be running on the URL specified

**OAuth redirects back to login with error**
- Check that CLIENT_ID and CLIENT_SECRET are correct
- Verify callback URLs match exactly in provider settings
- Check browser console for detailed error (if available)

**"This account does not have access to the requested area"**
- User's OAuth-created account has role "student"
- Instructor access requires backend confirmation
- Contact admin to upgrade role in `data/users.json`

**Session expires immediately**
- Check `SESSION_SECRET` is set and consistent
- Ensure cookies are enabled in browser
- Verify `FRONTEND_URL` matches actual frontend domain

## Support

For issues with:
- **Google OAuth**: Visit [Google Cloud Console](https://console.cloud.google.com)
- **GitHub OAuth**: Visit [GitHub Developer Settings](https://github.com/settings/developers)
- **Express/Node issues**: See [Express.js docs](https://expressjs.com)
- **React**: See [React docs](https://react.dev)
