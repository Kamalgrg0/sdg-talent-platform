import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ErrorNotice } from "../components/ErrorNotice";
import { Field } from "../components/Field";
import { Loading } from "../components/Loading";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { api } from "../lib/api";
import { fieldError, formatDate } from "../lib/format";

const EMPTY = {
  name: "",
  description: "",
  website: "",
  location: "",
  contact_email: "",
};

export default function OrganizationEditorPage() {
  const { user, refresh } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [organization, setOrganization] = useState(null);
  const [values, setValues] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState(null);
  const [formMessage, setFormMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get("/api/auth/organization/")
      .then((data) => {
        if (!active) return;
        setOrganization(data);
        setValues({
          name: data.name || "",
          description: data.description || "",
          website: data.website || "",
          location: data.location || "",
          contact_email: data.contact_email || "",
        });
      })
      .catch((err) => {
        if (active) setLoadError(err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function update(field) {
    return (event) => setValues((current) => ({ ...current, [field]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setFieldErrors(null);
    setFormMessage("");
    try {
      const payload = {
        name: values.name.trim(),
        description: values.description.trim(),
        website: values.website.trim(),
        location: values.location.trim(),
        contact_email: values.contact_email.trim(),
      };
      const result = await api.put("/api/auth/organization/", payload);
      setOrganization(result);
      toast.success("Organization profile saved.");
      await refresh();
      navigate("/dashboard");
    } catch (err) {
      setFieldErrors(err.errors);
      setFormMessage(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loading label="Loading organization profile…" large />;
  if (loadError) {
    return (
      <div className="container section">
        <ErrorNotice message={loadError.message} />
      </div>
    );
  }

  const isVerified = Boolean(organization?.is_verified);

  return (
    <>
      <PageHeader
        eyebrow="Organization workspace"
        title="Your organization profile"
        lead="Keep the public details of your organization up to date. These details are used on opportunities and projects you publish."
        actions={
          <span className={`badge ${isVerified ? "badge--green" : "badge--amber"}`}>
            {isVerified ? "Verified organization" : "Awaiting verification"}
          </span>
        }
      />

      <section className="section">
        <div className="container profile-editor-layout">
          <div className="profile-editor-main">
            {formMessage ? (
              <div className="alert alert--error form-summary" role="alert">
                <span className="alert-icon" aria-hidden="true">!</span>
                <div>
                  <strong>Please fix the highlighted fields.</strong>
                  <p>{formMessage}</p>
                </div>
              </div>
            ) : null}

            <form className="profile-form" onSubmit={submit} noValidate>
              <section className="form-card" aria-labelledby="organization-basics-heading">
                <div className="form-card__head">
                  <h2 id="organization-basics-heading">Organization details</h2>
                  <p>This information identifies your organization across the platform.</p>
                </div>

                <div className="form-grid">
                  <Field
                    label="Organization name"
                    htmlFor="organization_name"
                    required
                    full
                    error={fieldError(fieldErrors, "name")}
                  >
                    <input
                      className={`input${fieldError(fieldErrors, "name") ? " is-invalid" : ""}`}
                      id="organization_name"
                      type="text"
                      value={values.name}
                      onChange={update("name")}
                      maxLength={160}
                      required
                    />
                  </Field>

                  <Field
                    label="Contact email"
                    htmlFor="contact_email"
                    error={fieldError(fieldErrors, "contact_email")}
                  >
                    <input
                      className={`input${fieldError(fieldErrors, "contact_email") ? " is-invalid" : ""}`}
                      id="contact_email"
                      type="email"
                      value={values.contact_email}
                      onChange={update("contact_email")}
                      maxLength={190}
                      autoComplete="email"
                    />
                  </Field>

                  <Field
                    label="Location"
                    htmlFor="organization_location"
                    error={fieldError(fieldErrors, "location")}
                  >
                    <input
                      className={`input${fieldError(fieldErrors, "location") ? " is-invalid" : ""}`}
                      id="organization_location"
                      type="text"
                      value={values.location}
                      onChange={update("location")}
                      maxLength={120}
                    />
                  </Field>

                  <Field
                    label="Website"
                    htmlFor="website"
                    full
                    hint="Only http:// and https:// addresses are accepted."
                    error={fieldError(fieldErrors, "website")}
                  >
                    <input
                      className={`input${fieldError(fieldErrors, "website") ? " is-invalid" : ""}`}
                      id="website"
                      type="url"
                      value={values.website}
                      onChange={update("website")}
                      maxLength={255}
                      placeholder="https://example.org"
                    />
                  </Field>

                  <Field
                    label="About the organization"
                    htmlFor="organization_description"
                    full
                    hint="Up to 5,000 characters. Plain text only."
                    error={fieldError(fieldErrors, "description")}
                  >
                    <textarea
                      className={`textarea${fieldError(fieldErrors, "description") ? " is-invalid" : ""}`}
                      id="organization_description"
                      rows={6}
                      maxLength={5000}
                      value={values.description}
                      onChange={update("description")}
                    />
                  </Field>
                </div>
              </section>

              <div className="profile-form__actions">
                <button className="btn btn--primary btn--lg" type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save organization profile"}
                </button>
                <Link className="btn btn--ghost" to="/dashboard">Back to dashboard</Link>
              </div>
            </form>
          </div>

          <aside className="profile-editor-side" aria-label="Organization profile guidance">
            <div className="card">
              <div className="card-body">
                <h2 className="side-heading">Verification</h2>
                {isVerified ? (
                  <p className="small text-muted">
                    An administrator has verified this organization. The verified badge is shown
                    with the opportunities and projects you publish.
                  </p>
                ) : (
                  <p className="small text-muted">
                    An administrator will verify your organization separately. You can continue
                    editing your profile while verification is pending.
                  </p>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <h2 className="side-heading">Profile summary</h2>
                <dl className="side-list side-list--compact">
                  <div>
                    <dt>Owner</dt>
                    <dd>{user?.name}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{isVerified ? "Verified" : "Awaiting verification"}</dd>
                  </div>
                  <div>
                    <dt>Member since</dt>
                    <dd>{formatDate(organization?.created_at)}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <h2 className="side-heading">Contact details</h2>
                <p className="small text-muted">
                  The contact email on this profile is shown to signed-in talent when your
                  opportunities are viewed. Talent email addresses and phone numbers are never
                  exposed publicly.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
