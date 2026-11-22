import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Field } from "../components/Field";
import { PasswordField } from "../components/PasswordField";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { dashboardPathForRole, fieldError, REGISTER_ROLES } from "../lib/format";

const INITIAL = {
  name: "",
  email: "",
  password: "",
  password_confirm: "",
  role: "job_seeker",
  organization_name: "",
};

export default function RegisterPage() {
  const { user, register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) navigate(dashboardPathForRole(user.role), { replace: true });
  }, [user, navigate]);

  const needsOrganization = form.role === "employer" || form.role === "organization";

  function update(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setErrors(null);
    setMessage("");
    try {
      const account = await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        password_confirm: form.password_confirm,
        role: form.role,
        organization_name: needsOrganization ? form.organization_name.trim() : "",
      });
      toast.success("Your account is ready. Welcome to TalentBridge.");
      navigate(dashboardPathForRole(account.role), { replace: true });
    } catch (error) {
      setErrors(error.errors);
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-section">
      <div className="container auth-layout auth-layout--wide">
        <div className="auth-card">
          <span className="eyebrow">Join the platform</span>
          <h1>Create your free account</h1>
          <p className="auth-intro">
            Choose how you want to use TalentBridge. You can build a talent profile, publish opportunities,
            or run an organization page.
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
            <fieldset className="role-fieldset">
              <legend className="form-label">I am joining as</legend>
              <div className="role-grid">
                {REGISTER_ROLES.map((role) => (
                  <label className={`role-card${form.role === role.value ? " is-current" : ""}`} key={role.value}>
                    <input
                      type="radio"
                      name="role"
                      value={role.value}
                      checked={form.role === role.value}
                      onChange={update("role")}
                    />
                    <span>
                      <span className="role-card__name">{role.name}</span>
                      <span className="role-card__text">{role.text}</span>
                    </span>
                  </label>
                ))}
              </div>
              {fieldError(errors, "role") ? <p className="field-error">{fieldError(errors, "role")}</p> : null}
            </fieldset>

            <div className="form-grid">
              <Field label="Full name" htmlFor="name" required error={fieldError(errors, "name")}>
                <input
                  className={`input${fieldError(errors, "name") ? " is-invalid" : ""}`}
                  type="text"
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={update("name")}
                  autoComplete="name"
                  maxLength={120}
                  required
                />
              </Field>

              <Field label="Email address" htmlFor="email" required error={fieldError(errors, "email")}>
                <input
                  className={`input${fieldError(errors, "email") ? " is-invalid" : ""}`}
                  type="email"
                  id="email"
                  name="email"
                  value={form.email}
                  onChange={update("email")}
                  autoComplete="email"
                  maxLength={190}
                  required
                />
              </Field>

              <PasswordField
                id="password"
                label="Password"
                value={form.password}
                onChange={update("password")}
                error={fieldError(errors, "password")}
                autoComplete="new-password"
                hint="At least 8 characters. Avoid common or numeric-only passwords."
              />

              <PasswordField
                id="password_confirm"
                label="Confirm password"
                value={form.password_confirm}
                onChange={update("password_confirm")}
                error={fieldError(errors, "password_confirm")}
                autoComplete="new-password"
              />

              {needsOrganization ? (
                <Field
                  label="Organization name"
                  htmlFor="organization_name"
                  required
                  full
                  error={fieldError(errors, "organization_name")}
                  hint="This becomes your public organization profile. You can edit the description later."
                >
                  <input
                    className={`input${fieldError(errors, "organization_name") ? " is-invalid" : ""}`}
                    type="text"
                    id="organization_name"
                    name="organization_name"
                    value={form.organization_name}
                    onChange={update("organization_name")}
                    maxLength={160}
                    required
                  />
                </Field>
              ) : null}
            </div>

            <div className="notice notice--info">
              <p>
                Your email address is used for sign-in and notifications. Public talent profiles never
                show your email address or phone number.
              </p>
            </div>

            <button className="btn btn--primary btn--lg btn--block" type="submit" disabled={submitting}>
              {submitting ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </div>

        <aside className="auth-side" aria-label="What happens next">
          <h2>What happens next</h2>
          <ol className="auth-steps">
            <li>
              <strong>Set up your profile</strong>
              <p>Talent accounts add skills and SDG priorities. Organizations add a public description.</p>
            </li>
            <li>
              <strong>Explore the platform</strong>
              <p>Browse opportunities, freelance projects, and the talent directory.</p>
            </li>
            <li>
              <strong>Start connecting</strong>
              <p>Apply, propose, save roles, or invite talented people to collaborate.</p>
            </li>
          </ol>
          <p className="auth-side-note">
            Employers and organizations are responsible for the accuracy of the opportunities they publish.
          </p>
        </aside>
      </div>
    </section>
  );
}
