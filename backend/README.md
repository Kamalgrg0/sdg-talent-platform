# TalentBridge backend — PostgreSQL

The backend is Django REST Framework, with PostgreSQL via psycopg 3. Database schema is managed by Django migrations. `database/schema.sql` and `database/seed.sql` are **legacy MySQL/MariaDB reference files**, not executable PostgreSQL schema scripts. Use `python manage.py migrate` to create tables, and optionally `python manage.py seed_demo` to import demo records through Django ORM.

## Local development (Windows PowerShell)

1. Install PostgreSQL (or Docker Desktop), Python, Node.js.
2. From the project root, create `.env` based on `.env.example` and generate a strong password. Set `POSTGRES_PASSWORD` to it.
3. In `backend`, create `.env` based on `backend/.env.example`. Set `DB_PASSWORD` to the **same** password and choose a new Django `SECRET_KEY` (generate with `python -c "import secrets; print(secrets.token_urlsafe(64))"`).
4. From the project root, run `docker compose up -d db` (or use an existing PostgreSQL installation with a dedicated database and role).
5. In `backend`, run:

```powershell
py -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python manage.py check
python manage.py migrate
# Only for an EMPTY demo database; do NOT run on real user data:
python manage.py seed_demo
python manage.py runserver
```

Then from `frontend`, run `npm install; npm run dev`.

## Migrating existing MariaDB *data* (not just the backend engine)

**Back up your MySQL/MariaDB database first.** Keep the original database intact. `dumpdata` must be run while the **original application is connected to MariaDB**, before replacing its settings/driver, or from a backup copy of the old project.

Original backend (connected to MariaDB):

```powershell
python manage.py dumpdata --natural-foreign --natural-primary --exclude contenttypes --exclude auth.permission --exclude admin.logentry --exclude sessions --indent 2 --output data-export.json
```

On the new PostgreSQL backend (pointing at a **new empty** database):

```powershell
python manage.py migrate
python manage.py loaddata data-export.json
python manage.py check
```

Test logins, CRUD, foreign keys, and timestamps. For large production databases, plan a staged migration with a maintenance window, backups, integrity checks, and a rollback plan. **Never run `seed_demo` on the destination after loading real data**—it deletes records.

## Security

- Never commit `.env` or credentials; the sample files have placeholders only. Rotate any actual credentials included in older archives.
- Use unique strong database and Django secrets; do not reuse demo passwords.
- Only expose local PostgreSQL on `127.0.0.1`; use a private network for deployments.
- Set `APP_DEBUG=false`, HTTPS app URLs, trusted hosts/origins, and DB TLS (`DB_SSLMODE=require` or `verify-full`) in production.
- Prefer `verify-full` with a trusted CA when connecting to an external PostgreSQL server.
- Database roles should have only permissions needed for the app and migrations; avoid PostgreSQL superuser access.
- Back up the database and periodically test restores.
