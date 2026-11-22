# System Architecture - TalentBridge

| Item | Value |
|---|---|
| API | Django 5 + Django REST Framework |
| UI | React 18 + Vite (single-page application) |
| Database | MySQL 8+ or MariaDB 10.6+ (`utf8mb4`) |
| Auth | Database-backed Django sessions with CSRF tokens |
| Entry points | `http://localhost:8000` (API + built SPA), `http://localhost:5173` (Vite dev) |
| Source of truth | `backend/` for domain rules, `frontend/src/` for presentation |

This document describes the running system. Setup commands live in
[`../README.md`](../README.md).

---

## 1. Architectural goals

1. **One authoritative backend.** Every write is validated in Django, regardless
   of which UI calls it. The React app holds view state only.
2. **Persistent accounts and sessions.** Users, sessions, notifications, and the
   email outbox are stored in the database, so a login survives a server restart
   and works across browser tabs.
3. **Role-aware access.** Job seekers, freelancers, employers, organizations and
   administrators see different data and can perform different actions.
4. **Explicit workflows.** Applications move through a documented status
   pipeline; offers and messages produce both in-app notifications and email.
5. **Readable, small modules.** Each Django app owns one slice of the domain and
   exposes a narrow URL surface under `/api/`.

---

## 2. Repository layout

```
sdg-talent-platform/
├── backend/
│   ├── config/             settings, URLs, WSGI/ASGI entry points
│   ├── accounts/           users, profiles, organizations, auth endpoints
│   ├── catalog/            skills, skill categories, SDGs, user interests
│   ├── opportunities/      opportunities, applications, invitations, projects
│   ├── freelance/          freelance projects and proposals
│   ├── community/          posts and comments
│   ├── messaging/          conversations and messages
│   ├── notifications/      in-app notifications and the email outbox
│   ├── core/               shared permissions, auth, services, dashboard, admin
│   ├── templates/emails/   plain-text and HTML mail templates
│   ├── manage.py
│   └── .env                local secrets (not committed)
├── frontend/
│   ├── src/components/     reusable UI pieces
│   ├── src/context/        auth and toast providers
│   ├── src/lib/            API client, formatting, messaging helpers
│   ├── src/pages/          one component per route
│   ├── src/styles/         base, components, pages, app overrides
│   └── dist/               Vite build output served by Django
├── database/
│   ├── schema.sql          reference SQL schema
│   ├── seed.sql            demo fixture used by `manage.py seed_demo`
│   └── migrations/         standalone SQL change notes
└── docs/                   this documentation and generated diagrams
```

The database runtime is kept outside the project in `C:\SDG\SDG\tools\mariadb`
with its data directory in `C:\SDG\SDG\tools\mariadb-data`.

---

## 3. Request lifecycle

### 3.1 First page load

1. The browser requests `/` (or any non-API path).
2. `config/urls.py` falls through to `spa_index()`, which returns
   `frontend/dist/index.html` when the SPA has been built.
3. The browser downloads the Vite bundle; `main.jsx` mounts `<App />` inside
   `BrowserRouter`, `ToastProvider` and `AuthProvider`.
4. `AuthProvider` calls `GET /api/auth/csrf/` and `GET /api/auth/me/` to
   establish the CSRF cookie and restore the session.

In development, Vite serves the SPA on port 5173 and proxies API calls to
Django. CORS allows the dev origin and credentials.

### 3.2 API read

1. The React page calls a helper in `src/lib/api.js`.
2. Django resolves the route from `config/urls.py`, then from the app's `urls.py`.
3. `CsrfSessionAuthentication` resolves the user from the session cookie.
4. A DRF permission class checks role or authentication.
5. The view queries through the ORM with `select_related` / `prefetch_related`,
   serializes the result, and returns JSON. `core/pagination.py` supplies the
   common page shape (default page size 9).

### 3.3 State-changing request

1. The UI reads the `csrftoken` cookie and sends it in the `X-CSRFToken` header
   with `credentials: "include"`.
2. `CsrfSessionAuthentication.enforce_csrf()` validates the token even for
   anonymous requests such as login and registration.
3. A serializer validates the payload; the view performs the write inside a
   transaction where several rows are affected.
4. Domain side effects (notification, email, status propagation) are performed
   through `core.services` so every caller behaves the same way.
5. Errors are normalised by `core.exceptions.api_exception_handler` into
   `{"detail": ..., "errors": ...}`.

---

## 4. Backend application map

| App | Owns | API prefix |
|---|---|---|
| `accounts` | `User`, `Profile`, `Organization`; register/login/logout/me; talent directory and public profiles | `/api/auth/` |
| `catalog` | `Skill`, `SkillCategory`, `SDG`, `UserSkill`, `UserSDG`; catalogue and recommendation inputs | `/api/catalog/` |
| `opportunities` | `Opportunity`, `Application`, `SavedOpportunity`, `TalentProject`, `Invitation`; posting, applying, offers, invitations | `/api/opportunities/` |
| `freelance` | `FreelanceProject`, `Proposal`; freelance board and bids | `/api/freelance/` |
| `community` | `CommunityPost`, `Comment`; discussion threads | `/api/community/` |
| `messaging` | `Conversation`, `Message`; inbox, threads, unread counts | `/api/messaging/` |
| `notifications` | `Notification`, `EmailOutbox`; notification list and mail commands | `/api/notifications/` |
| `core` | Home, dashboard, admin endpoints, shared services | `/api/` |

`django-admin/` remains available for superusers.

### Domain model summary

- **Identity:** `User` (email login, role, status) has one `Profile` for talent
  accounts and at most one `Organization` for employer-side accounts.
- **Taxonomy:** `Skill` belongs to a `SkillCategory`; `SDG` has a fixed set of
  17 rows. Users link skills and SDGs through junction tables with uniqueness
  constraints.
- **Opportunities:** an `Opportunity` belongs to an organization and a creator,
  has optional SDG/skills/category, and receives `Application` rows. A unique
  constraint prevents duplicate applications.
- **Offer pipeline:** `Application.status` moves
  `submitted -> reviewing -> shortlisted -> offered -> accepted | declined`.
  `rejected` is employer-side only; `hired` remains available for later use.
- **Freelance:** `FreelanceProject` receives `Proposal` rows with amount,
  delivery time and status.
- **Invitations:** an `Invitation` links a sender, an organization, a talent
  user and at most one of talent project / opportunity / freelance project.
- **Messaging:** `Conversation` is a canonical one-to-one thread (`user_a` is
  always the lower user id); `Message` rows carry sender, body and `read_at`.
- **Notifications:** `Notification` records in-app alerts; `EmailOutbox`
  records every attempted email with status, attempts and last error.

Uniqueness, positivity and "no self-invite" rules are enforced by database
constraints as well as serializers.

---

## 5. Authentication and authorization

- `AUTH_USER_MODEL = accounts.User`; `USERNAME_FIELD = email`.
- Passwords are hashed with Django's hashers. Standalone bcrypt hashes already
  present in the database are still accepted so existing credentials keep
  working; a successful login upgrades them to a Django hash.
- Login, registration and logout use Django session endpoints. `SESSION_COOKIE_AGE`
  defaults to 1800 seconds and `SESSION_SAVE_EVERY_REQUEST` keeps the session
  alive during activity.
- `ActiveAccountMiddleware` logs out suspended or inactive accounts and returns
  403 for their API requests.
- Permissions in `core/permissions.py`: `IsAdmin`, `IsEmployerSide`
  (employer/organization/admin), `IsTalent` (job seeker/freelancer),
  `ReadOnlyOrAdmin` and `IsAuthenticatedOrReadOnly`.
- Administrators cannot be created through the public API. Create them with
  `manage.py create_admin`; the admin API may change roles among the four public
  roles but cannot grant or revoke the admin role.

---

## 6. Security controls

| Concern | Control |
|---|---|
| Injection | Django ORM parameterises all queries; no raw SQL from request input |
| XSS | React escapes rendered text; HTML mail is generated from local templates |
| CSRF | `X-CSRFToken` required on every unsafe request, including anonymous ones |
| Session theft | HttpOnly session cookie, `SameSite=Lax`, trusted origins configured |
| Session fixation | Django rotates the session key on login/logout |
| Privilege escalation | Roles come from the database, never from request data; server-side permissions on every protected endpoint |
| Brute force / enumeration | Generic authentication errors; password validators (min 8 characters) |
| Account suspension | Middleware re-checks status on every request |
| Error leakage | `APP_DEBUG=false` in production; API errors use a normalised shape |
| Clickjacking / MIME sniffing | Django `XFrameOptionsMiddleware` and `SecurityMiddleware` headers |

Secrets come from `backend/.env`: `SECRET_KEY`, database credentials, SMTP
credentials, `APP_URL` and `FRONTEND_URL`. The file is ignored by Git.

---

## 7. Notifications and email

`core.services.notify()` writes an in-app notification. `queue_email()` renders
`backend/templates/emails/<name>.html` and `.txt`, writes an `EmailOutbox` row,
and immediately attempts delivery via `deliver_outbox_row()`. Failures stay in
the outbox with `status=failed`, an attempt count and the error text, so mail
never breaks the request that triggered it.

Templates in use:

| Template | Trigger |
|---|---|
| `new_message` | A member sends a message |
| `offer_received` | An employer sends an offer to a candidate |
| `offer_response` | A candidate accepts or declines an offer |
| Existing application/invitation templates | Applications and invitations |

`EMAIL_BACKEND` is selected from `backend/.env`:

- `console` (default): messages print in the API terminal; no real delivery.
- `locmem`: kept in memory for tests.
- `smtp`: uses `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`,
  `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS`, `EMAIL_USE_SSL` and `EMAIL_TIMEOUT`.

Operational commands:

```powershell
.\venv\Scripts\python.exe manage.py send_test_email --to you@example.com
.\venv\Scripts\python.exe manage.py process_email_outbox --retry-failed
```

---

## 8. Messaging and offer workflow

### Messaging

`POST /api/messaging/` with `{"user_id": <id>, "body": "..."}` finds or creates
the canonical conversation, stores the message, notifies the recipient and
queues email. `GET /api/messaging/` lists threads; `GET /api/messaging/:id/messages/`
loads a thread; `POST /api/messaging/:id/read/` marks messages read;
`GET /api/messaging/unread-count/` feeds the header badge.

Message buttons are available on opportunity detail pages, talent profiles,
employer applicant cards, and both invitation panels. The inbox is `/messages`.

### Offers

1. An employer moves an application to `offered` with
   `PATCH /api/opportunities/applications/:id/status/`.
2. The candidate receives an in-app notification, an email, an "Offer sent"
   card on the dashboard, and Accept / Decline buttons.
3. The candidate posts
   `POST /api/opportunities/applications/:id/respond/` with
   `{"action": "accept" | "decline"}`.
4. The application becomes `accepted` or `declined`; the employer receives a
   notification and email, and the dashboard counts update.

The applicant pipeline in the UI exposes reviewing, shortlisted, offered and
rejected stages. `rejected` remains employer-side only.

---

## 9. Frontend architecture

- `main.jsx` mounts the app and imports `base.css`, `components.css`,
  `pages.css` and `app.css` in that order.
- `App.jsx` declares all routes. Public pages (`/`, `/about`, `/contact`,
  `/opportunities`, `/talent`, `/skills`, `/freelance`, `/enterprise`,
  `/community`) are open; dashboard and account pages are wrapped
  in `ProtectedRoute`, optionally restricted to a role list.
- Pages fetch through `src/lib/api.js` and `src/lib/useApi.js`; `format.js`
  centralises status labels/CSS classes; `messaging.js` wraps inbox calls.
- `AuthContext` holds the current user and refresh logic; `ToastContext`
  renders feedback; `Header` shows notification and unread-message badges.
- `MessageButton` is reused wherever two members can start a conversation.
- Protected dashboards: `/dashboard` (redirects by role), `/dashboard/job-seeker`,
  `/dashboard/freelancer`, `/dashboard/employer`, `/dashboard/admin`, plus editor,
  project, message, and applicant routes.
- Notification and email links are generated from canonical paths in
  `backend/core/links.py`; old links are normalised when notifications are read.
- Django can serve the built SPA directly; Vite is only needed for development
  and for producing `frontend/dist`.

---

## 10. Configuration

`backend/.env` is read by `config/settings.py` via `python-dotenv`. Important
keys:

| Key | Purpose | Default |
|---|---|---|
| `SECRET_KEY` | Django signing key | development-only value |
| `APP_DEBUG` | Debug mode | `true` |
| `ALLOWED_HOSTS` | Host allowlist | localhost, 127.0.0.1, testserver |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` | Database connection | `sdg_talent`, `sdg_app`, local dev password, 127.0.0.1:3306 |
| `SESSION_COOKIE_AGE` | Session lifetime in seconds | 1800 |
| `APP_URL`, `FRONTEND_URL` | Mail links, CORS and CSRF trusted origins | localhost:8000 / localhost:5173 |
| `EMAIL_BACKEND` | `console`, `locmem` or `smtp` | `console` |
| `EMAIL_*`, `DEFAULT_FROM_EMAIL`, `CONTACT_EMAIL` | SMTP and sender details | see `.env.example` |
| `APP_TIMEZONE` | Display timezone | Asia/Kathmandu |

`backend/.env.example` documents every supported key. The database and seed
fixture are described in `database/README`-style notes in the root README.

---

## 11. Deployment topologies

### Development (recommended)

- MariaDB on `127.0.0.1:3306` from `C:\SDG\SDG\tools\mariadb`.
- Django on `127.0.0.1:8000` (`manage.py runserver`).
- Vite on `localhost:5173` (`npm run dev`), calling the Django API.

### Single server

- `npm run build` produces `frontend/dist`.
- Django serves the SPA and API on `http://localhost:8000`; no second web
  server is required.

Static Django admin assets are collected with `manage.py collectstatic` into
`backend/staticfiles`.

---

## 12. Verification

```powershell
cd C:\SDG\SDG\sdg-talent-platform\backend
.\venv\Scripts\python.exe manage.py check
.\venv\Scripts\python.exe manage.py makemigrations --check --dry-run
.\venv\Scripts\python.exe manage.py migrate

cd ..\frontend
npm run build
```

Key end-to-end checks:

- Register → logout → login with the same credentials.
- Create an opportunity with only title, description, type, location and
  deadline; category, responsibilities, requirements, SDG and skills stay blank.
- Apply to an opportunity → offer → accept → confirm both dashboards and
  notifications.
- Send a message between two accounts → confirm both inboxes and unread badges.

---

## 13. Extension points and known gaps

- Email delivery is inactive until SMTP values are supplied in `backend/.env`.
- The recommendation engine in `core/recommender.py` is rule-based; it can be
  replaced with a service call while keeping the same response shape.
- `database/seed.sql` is the shared demo fixture for `manage.py seed_demo`.
- Creating freelance projects and talent projects from the dashboard is not yet
  exposed as UI routes; the API endpoints work.
