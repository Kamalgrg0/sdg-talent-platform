import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PasswordField } from "../components/PasswordField";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { dashboardPathForRole, fieldError } from "../lib/format";

export default function LoginPage() {
  const { user, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get("next") || "";
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) navigate(next || dashboardPathForRole(user.role), { replace: true });
  }, [user, next, navigate]);

  function update(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setErrors(null);
    setMessage("");
    try {
      const account = await login({ email: form.email.trim(), password: form.password });
      toast.success(`Welcome back, ${account.name}.`);
      navigate(next || dashboardPathForRole(account.role), { replace: true });
    } catch (error) {
      setErrors(error.errors);
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-section">
      <div className="container auth-layout">
        <div className="auth-card">
          <span className="eyebrow">Welcome back</span>
          <h1>Log in to your account</h1>
          <p className="auth-intro">
            Pick up where you left off: track applications, answer invitations, or manage your projects.
          </p>

          {message ? (
            <div className="alert alert--error">
              <span className="alert-icon" aria-hidden="true">
                !
              </span>
              <p>{message}</p>
            </div>
          ) : null}

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="form-field">
              <label className="form-label" htmlFor="email">
                Email address
              </label>
              <input
                className={`input${fieldError(errors, "email") || fieldError(errors, "detail") ? " is-invalid" : ""}`}
                type="email"
                id="email"
                name="email"
                value={form.email}
                onChange={update("email")}
                autoComplete="email"
                inputMode="email"
                maxLength={190}
                required
              />
              {fieldError(errors, "email") ? (
                <p className="field-error">{fieldError(errors, "email")}</p>
              ) : null}
            </div>

            <PasswordField
              id="password"
              label="Password"
              value={form.password}
              onChange={update("password")}
              error={fieldError(errors, "password")}
            />

            <button className="btn btn--primary btn--lg btn--block" type="submit" disabled={submitting}>
              {submitting ? "Logging in…" : "Log in"}
            </button>
          </form>

          <p className="auth-switch">
            New to TalentBridge? <Link to="/register">Create a free account</Link>
          </p>
        </div>

        <aside className="auth-side" aria-label="Why join">
          <h2>One account, many ways to contribute</h2>
          <ul className="auth-benefits">
            <li>
              <span className="auth-benefit-icon" aria-hidden="true">
                1
              </span>
              <div>
                <strong>Build a skills-first profile</strong>
                <p>List your skills and the Sustainable Development Goals you care about.</p>
              </div>
            </li>
            <li>
              <span className="auth-benefit-icon" aria-hidden="true">
                2
              </span>
              <div>
                <strong>Apply, save, and get invited</strong>
                <p>Track every application, proposal, and invitation in one place.</p>
              </div>
            </li>
            <li>
              <span className="auth-benefit-icon" aria-hidden="true">
                3
              </span>
              <div>
                <strong>For teams with a mission</strong>
                <p>Employers and organizations publish opportunities and manage applicants.</p>
              </div>
            </li>
          </ul>
          <p className="auth-note">
            No real payments are taken. Public talent profiles never expose email addresses or phone numbers.
          </p>
        </aside>
      </div>
    </section>
  );
}
