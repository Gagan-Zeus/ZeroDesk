# ZeroDesk — SaaS Task Management Platform

A production-ready multi-organization task management application with advanced authentication flows, OTP verification, and role-based access control.

## Architecture

```
ZeroDesk/
├── server/                         # Express.js Backend API
│   ├── config/
│   │   ├── db.js                   # MongoDB connection
│   │   └── passport.js             # Google & GitHub OAuth strategies
│   ├── models/
│   │   ├── User.js                 # User schema (bcrypt hashing, multi-org)
│   │   ├── Organization.js         # Org schema (auto-generated codes)
│   │   ├── OTP.js                  # OTP schema (SHA-256 hashed, TTL)
│   │   └── Task.js                 # Task schema (org-scoped)
│   ├── controllers/
│   │   ├── authController.js       # Email/OAuth auth flows
│   │   ├── otpController.js        # OTP send/verify/resend
│   │   ├── orgController.js        # Organization CRUD
│   │   └── taskController.js       # Task CRUD (org-isolated)
│   ├── middleware/
│   │   ├── auth.js                 # JWT, OTP, Org, Owner guards
│   │   ├── rateLimiter.js          # Rate limiting for auth/OTP
│   │   ├── validate.js             # express-validator middleware
│   │   └── errorHandler.js         # Global error handler
│   ├── routes/
│   │   ├── auth.js                 # /api/auth/*
│   │   ├── otp.js                  # /api/otp/*
│   │   ├── org.js                  # /api/org/*
│   │   └── tasks.js                # /api/tasks/*
│   ├── services/
│   │   ├── jwtService.js           # JWT sign/verify (pre-auth + full)
│   │   ├── otpService.js           # OTP generation, hashing, verification
│   │   └── emailService.js         # Nodemailer SMTP transport
│   ├── server.js                   # Express app entry point
│   ├── package.json
│   └── .env.example
│
├── client/                         # React + TailwindCSS Frontend
│   ├── src/
│   │   ├── context/
│   │   │   └── AuthContext.jsx     # Auth state (user, token, OTP, org)
│   │   ├── guards/
│   │   │   └── RouteGuards.jsx     # GuestGuard, AuthGuard, OtpGuard, FullGuard
│   │   ├── services/
│   │   │   ├── api.js              # Axios instance with interceptors
│   │   │   └── authService.js      # All API calls
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx       # OAuth + Email entry point
│   │   │   ├── EmailAuthPage.jsx   # Email → Password/Register step flow
│   │   │   ├── OtpPage.jsx         # 6-digit OTP verification
│   │   │   ├── GithubEmailPage.jsx # GitHub private email fallback
│   │   │   ├── OrgOnboardingPage.jsx # Create/Join organization
│   │   │   └── DashboardPage.jsx   # Task management UI
│   │   ├── App.jsx                 # Router + guards
│   │   ├── main.jsx                # Entry point
│   │   └── index.css               # Tailwind directives
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
└── README.md
```

## Authentication Flow

```
┌─────────────┐     ┌──────────────┐     ┌───────────┐     ┌──────────────┐     ┌───────────┐
│   Login Page │────▶│  Auth Method  │────▶│  OTP Page │────▶│  Org Onboard │────▶│ Dashboard │
│  (3 options) │     │  (OAuth/Email)│     │ (6-digit) │     │ (Create/Join)│     │  (Tasks)  │
└─────────────┘     └──────────────┘     └───────────┘     └──────────────┘     └───────────┘
```

### Methods
1. **Google OAuth** → Redirect → Get email → Send OTP → Verify → JWT
2. **GitHub OAuth** → Redirect → Get email (or fallback) → Send OTP → Verify → JWT
3. **Email/Password** → Check email → Login or Register → Send OTP → Verify → JWT

### Session Rule
Users cannot access protected routes unless ALL conditions are met:
- ✅ Authenticated (valid JWT)
- ✅ OTP verified
- ✅ Organization selected/created

## Database Schema

### User
| Field | Type | Notes |
|-------|------|-------|
| name | String | Required |
| email | String | Unique, lowercase |
| password | String | bcrypt hashed, null for OAuth |
| authProvider | Enum | 'local', 'google', 'github' |
| isOtpVerified | Boolean | Reset per session |
| currentOrganizationId | ObjectId | Active org |
| organizations | Array | [{orgId, role}] |

### Organization
| Field | Type | Notes |
|-------|------|-------|
| name | String | Max 120 chars |
| code | String | Auto-generated 8-char hex |
| createdBy | ObjectId | Ref User |
| members | Array | [{userId, role, joinedAt}] |

### OTP
| Field | Type | Notes |
|-------|------|-------|
| email | String | Target email |
| otpHash | String | SHA-256 hash |
| attempts | Number | Max 5 |
| expiresAt | Date | 5 min TTL, auto-delete |

### Task
| Field | Type | Notes |
|-------|------|-------|
| title | String | Required |
| organizationId | ObjectId | **Required** — enforces data isolation |
| createdBy | ObjectId | Task creator |
| assignedTo | ObjectId | Optional |
| status | Enum | TODO, IN_PROGRESS, DONE |

## Roles & Permissions

| Permission | OWNER | MEMBER |
|-----------|-------|--------|
| Create organization | ✅ | ❌ |
| View org code | ✅ | ✅ |
| View all tasks | ✅ | ❌ |
| View own/assigned tasks | ✅ | ✅ |
| Create tasks | ✅ | ✅ |
| Manage members | ✅ | ❌ |

## API Endpoints

### Auth (`/api/auth`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /check-email | — | Check if email exists |
| POST | /register | — | Register with email/password |
| POST | /login | — | Login with email/password |
| GET | /google | — | Initiate Google OAuth |
| GET | /google/callback | — | Google OAuth callback |
| GET | /github | — | Initiate GitHub OAuth |
| GET | /github/callback | — | GitHub OAuth callback |
| POST | /github/complete-email | — | GitHub private email fallback |
| GET | /me | JWT | Get current user |

### OTP (`/api/otp`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /send | Pre-auth JWT | Send OTP |
| POST | /verify | Pre-auth JWT | Verify OTP → Full JWT |
| POST | /resend | Pre-auth JWT | Resend OTP |

### Organization (`/api/org`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /create | JWT + OTP | Create organization |
| POST | /join | JWT + OTP | Join via code |
| GET | /list | JWT + OTP | List user's orgs |
| POST | /select | JWT + OTP | Set active org |
| GET | /:id | JWT + OTP | Get org details |

### Tasks (`/api/tasks`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | JWT + OTP + Org | List tasks |
| POST | / | JWT + OTP + Org | Create task |
| PUT | /:id | JWT + OTP + Org | Update task |
| DELETE | /:id | JWT + OTP + Org | Delete task |

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Google OAuth credentials ([console.cloud.google.com](https://console.cloud.google.com))
- GitHub OAuth app ([github.com/settings/developers](https://github.com/settings/developers))
- SMTP credentials (Gmail App Password or AWS SES)

### Setup

1. **Clone and install:**
```bash
cd ZeroDesk
cd server && cp .env.example .env && npm install
cd ../client && npm install
```

2. **Configure `server/.env`** with your credentials

3. **Start development:**
```bash
# Terminal 1 — Backend
cd server && npm run dev

# Terminal 2 — Frontend
cd client && npm run dev
```

4. Open [http://localhost:5173](http://localhost:5173)

## Security

- **Passwords**: bcrypt with 12 salt rounds
- **OTPs**: SHA-256 hashed, 5-min expiry, max 5 attempts, auto-delete TTL index
- **JWT**: Pre-auth tokens (15m, limited scope) + Full tokens (1h)
- **Rate limiting**: Auth endpoints (30/15min), OTP endpoints (10/15min)
- **Headers**: Helmet security headers
- **CORS**: Whitelisted origins only
- **Data isolation**: All task queries scoped by organizationId
- **Input validation**: express-validator on all endpoints
