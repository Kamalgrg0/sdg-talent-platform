# TalentBridge error-handling corrections

Reviewed base

## Tests executed in the review environment

- Backend error-envelope tests: **6/6 passed** (with mocked DRF response types).
- Frontend error-message tests: **7/7 passed** (Node native test runner with mocked HTTP).
- Existing static security tests: **9/9 passed**.
- Python AST parse: **92/92 backend Python files**.
- Babel JSX/JavaScript parse: **57/57 frontend source files**.
- Archive structural validation: completed after packaging.

**Not executed here:** Live PostgreSQL/Django integration tests, React production build, and browser end-to-end authentication workflows. Your Windows PostgreSQL and dependencies are not accessible from this environment. Passing source-level tests does not establish full production readiness.

## How to validate locally on Windows 
1. Back up your current working project before replacing anything.
2. Extract this ZIP into a **new folder**, not on top of your running project. Copy your private local `backend/.env` into the extracted backend only; never commit or upload it. Keep PostgreSQL running locally.
3. In a VS Code PowerShell terminal at the project root run:

```powershell
python verify_security_static.py
python -m unittest discover -s backend/tests -v
node --test frontend/tests/errors.test.mjs
```

4. From `backend`, using your local venv (create one if needed), run:

```powershell
.\venv\Scripts\python.exe -m pip install -r requirements.txt
.\venv\Scripts\python.exe manage.py check
.\venv\Scripts\python.exe manage.py makemigrations --check --dry-run
.\venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

5. In a second terminal at `frontend`, run:

```powershell
npm.cmd install
npm.cmd run build
npm.cmd run dev
```

6. Test correct login, incorrect login, registration with a weak password, a logged-out protected endpoint, profile update, freelancer dashboard, and a server-stopped dashboard response.

## Expected messages

- Incorrect login: `Incorrect email or password.`
- Invalid registration: a short summary, plus individual readable field errors.
- Django server unavailable: `Unable to connect to the server. Check that the Django backend is running.`
- Unexpected server error: `Something went wrong. Please try again.`

Do not disable CSRF or relax permissions to make an error go away. Do not expose your `.env`, database credentials, or superuser password while sharing test logs.
