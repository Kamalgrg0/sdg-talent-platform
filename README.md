# TalentBridge — Django REST Framework + React + PostgreSQL

## Start on Windows (VS Code / PowerShell)

1. **Keep your current working project as a backup.** Do not overwrite your local `.env` files.
2. Make sure PostgreSQL is running and `sdg_talent` / `sdg_app` already exist.
3. Copy `backend/.env.example` to `backend/.env`, then set your **own** secret key and database password. If your local `.env` already works, retain it instead of replacing it.
4. From `backend/`: `..\backend\venv\Scripts\python.exe manage.py check` (or `venv\Scripts\python.exe manage.py check` when in backend). For a fresh virtual environment, run `python -m venv venv` and `venv\Scripts\python.exe -m pip install -r requirements.txt`.
5. Run `venv\Scripts\python.exe manage.py migrate --plan`, and only run `venv\Scripts\python.exe manage.py migrate` if migrations are pending and expected. The permission changes in this ZIP do **not** require a new schema migration.
6. Run `venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000`.
7. In a second terminal from `frontend/`: `npm.cmd install`, `npm.cmd run dev`. Visit `http://localhost:5173`.

## Changes in this revision

- Django REST Framework now requires an authenticated session **by default**. Public endpoints (CSRF, register, login, talent, catalog, opportunities and freelance browsing) are explicitly opened.
- Opportunity saved-list API now explicitly requires authentication and a talent account.
- Public detail endpoints allow anonymous read access but require authentication for changes; existing ownership checks remain in place.
- Administrator suspension/reactivation now synchronizes `is_active` with `status` inside the admin update transaction.
- Browsable API renderer is enabled only in local debug mode.
- No model schema or PostgreSQL migration files changed.
- No local `.env`, virtual environment, `node_modules`, or production secrets are included.

## Validation / limitations

The supplied code passed Python compilation and nine Python standard-library static regression checks in this packaging environment. Native JavaScript files passed Node syntax checks. **End-to-end Django tests, PostgreSQL connections, React build and browser workflows could not be executed here** because a live PostgreSQL instance and installable Django/Node dependencies were unavailable. Do not treat this as production-certified.

On your Windows machine, verify the API using distinct test accounts: anonymous public catalogue reads, CSRF-protected registration/login, authenticated dashboard, saving a profile and refreshing, owner-only profile changes, admin-only routes, suspended test-account access denied, and ownership checks for messages/applications/proposals. Check both normal user and administrator flows.

Potential additional work before production: ownership tests for all API endpoints, input validation for cross-entity invitation/project relationships, login rate limiting, production TLS/HSTS configuration, backup/restore drills, removing unsafe fallback dev secret, and dependency vulnerability review.

**Secrets:** Never share `backend/.env` or production credentials. Rotate any password exposed earlier. The database itself and all existing records remain on your local PostgreSQL server; this source ZIP does not contain them.
