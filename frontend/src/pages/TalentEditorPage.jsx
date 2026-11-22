import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ErrorNotice } from "../components/ErrorNotice";
import { Field, SelectField } from "../components/Field";
import { Loading } from "../components/Loading";
import { PageHeader } from "../components/PageHeader";
import { SdgPicker } from "../components/SdgPicker";
import { SkillPicker } from "../components/SkillPicker";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { api } from "../lib/api";
import { AVAILABILITY_OPTIONS, fieldError } from "../lib/format";

const EMPTY = {
  professional_title: "",
  location: "",
  phone: "",
  bio: "",
  education: "",
  experience: "",
  availability: "5-10",
  portfolio_url: "",
  linkedin_url: "",
  is_public: true,
};

export default function TalentEditorPage() {
  const { user, refresh } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [skills, setSkills] = useState([]);
  const [sdgs, setSdgs] = useState([]);
  const [values, setValues] = useState(EMPTY);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [skillLevels, setSkillLevels] = useState({});
  const [selectedSdgs, setSelectedSdgs] = useState([]);
  const [profileId, setProfileId] = useState(null);
  const [hadProfile, setHadProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState(null);
  const [formMessage, setFormMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get("/api/catalog/skills/"),
      api.get("/api/catalog/sdgs/"),
      api.get("/api/auth/profile/").catch((err) => (err.status === 404 ? null : Promise.reject(err))),
    ])
      .then(([skillData, sdgData, profile]) => {
        if (!active) return;
        setSkills(Array.isArray(skillData) ? skillData : []);
        setSdgs(Array.isArray(sdgData) ? sdgData : []);
        if (profile) {
          setHadProfile(true);
          setProfileId(profile.id);
          setValues({
            professional_title: profile.professional_title || "",
            location: profile.location || "",
            phone: profile.phone || "",
            bio: profile.bio || "",
            education: profile.education || "",
            experience: profile.experience || "",
            availability: profile.availability || "5-10",
            portfolio_url: profile.portfolio_url || "",
            linkedin_url: profile.linkedin_url || "",
            is_public: Boolean(profile.is_public),
          });
          const links = profile.skills || [];
          setSelectedSkills(links.map((item) => item.skill_id));
          setSkillLevels(
            Object.fromEntries(links.map((item) => [item.skill_id, item.level || "beginner"]))
          );
          setSelectedSdgs((profile.sdgs || []).map((item) => item.id));
        }
      })
      .catch((err) => {
        if (active) setError(err);
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
        ...values,
        professional_title: values.professional_title.trim(),
        location: values.location.trim(),
        phone: values.phone.trim(),
        bio: values.bio.trim(),
        education: values.education.trim(),
        experience: values.experience.trim(),
        portfolio_url: values.portfolio_url.trim(),
        linkedin_url: values.linkedin_url.trim(),
        skill_ids: selectedSkills,
        skill_levels: skillLevels,
        sdg_ids: selectedSdgs,
      };
      const result = await api.put("/api/auth/profile/", payload);
      setProfileId(result.id);
      setHadProfile(true);
      toast.success(hadProfile ? "Your profile is updated." : "Your talent profile is live.");
      await refresh();
      navigate(result.is_public ? `/talent/${result.id}` : "/dashboard");
    } catch (err) {
      setFieldErrors(err.errors);
      setFormMessage(err.message);
    } finally {
      setSaving(false);
    }
  }

  const selectedSkillRows = useMemo(
    () => selectedSkills.filter((id) => skills.some((skill) => skill.id === id)),
    [selectedSkills, skills]
  );

  if (loading) return <Loading label="Loading your profile…" large />;
  if (error) {
    return (
      <div className="container section">
        <ErrorNotice message={error.message} />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={hadProfile ? "Profile editor" : "Your talent profile"}
        title={hadProfile ? "Keep your profile up to date" : "Join the talent pool"}
        lead="Tell organizations what you do, when you are available, and which Sustainable Development Goals you care about. Only job seeker and freelancer accounts appear in the public talent directory."
        actions={
          hadProfile && profileId && values.is_public ? (
            <Link className="btn btn--outline" to={`/talent/${profileId}`}>
              View public profile
            </Link>
          ) : null
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
              <section className="form-card" aria-labelledby="basics-heading">
                <div className="form-card__head">
                  <h2 id="basics-heading">Basic details</h2>
                  <p>This is what visitors see first in the directory.</p>
                </div>

                <div className="form-grid">
                  <Field
                    label="Professional title"
                    htmlFor="professional_title"
                    required
                    error={fieldError(fieldErrors, "professional_title")}
                  >
                    <input
                      className={`input${fieldError(fieldErrors, "professional_title") ? " is-invalid" : ""}`}
                      id="professional_title"
                      type="text"
                      value={values.professional_title}
                      onChange={update("professional_title")}
                      maxLength={150}
                      required
                    />
                  </Field>

                  <Field
                    label="Location"
                    htmlFor="location"
                    required
                    error={fieldError(fieldErrors, "location")}
                  >
                    <input
                      className={`input${fieldError(fieldErrors, "location") ? " is-invalid" : ""}`}
                      id="location"
                      type="text"
                      value={values.location}
                      onChange={update("location")}
                      maxLength={120}
                      required
                    />
                  </Field>

                  <SelectField
                    label="Availability"
                    name="availability"
                    value={values.availability}
                    onChange={update("availability")}
                    options={AVAILABILITY_OPTIONS}
                    required
                    error={fieldError(fieldErrors, "availability")}
                  />

                  <Field
                    label="Phone (private, optional)"
                    htmlFor="phone"
                    hint="Stored for your account only. It is never shown on your public profile."
                    error={fieldError(fieldErrors, "phone")}
                  >
                    <input
                      className={`input${fieldError(fieldErrors, "phone") ? " is-invalid" : ""}`}
                      id="phone"
                      type="tel"
                      value={values.phone}
                      onChange={update("phone")}
                      maxLength={30}
                      autoComplete="tel"
                    />
                  </Field>

                  <Field
                    label="Short bio"
                    htmlFor="bio"
                    required
                    full
                    hint="Between 20 and 2,000 characters. Plain text only."
                    error={fieldError(fieldErrors, "bio")}
                  >
                    <textarea
                      className={`textarea${fieldError(fieldErrors, "bio") ? " is-invalid" : ""}`}
                      id="bio"
                      rows={5}
                      maxLength={2000}
                      value={values.bio}
                      onChange={update("bio")}
                      required
                    />
                  </Field>

                  <Field
                    label="Experience (optional)"
                    htmlFor="experience"
                    full
                    hint="Projects, internships, volunteer work, or jobs. Up to 3,000 characters."
                    error={fieldError(fieldErrors, "experience")}
                  >
                    <textarea
                      className={`textarea${fieldError(fieldErrors, "experience") ? " is-invalid" : ""}`}
                      id="experience"
                      rows={4}
                      maxLength={3000}
                      value={values.experience}
                      onChange={update("experience")}
                    />
                  </Field>

                  <Field
                    label="Education (optional)"
                    htmlFor="education"
                    full
                    hint="Degrees, diplomas, courses, or certificates. Up to 3,000 characters."
                    error={fieldError(fieldErrors, "education")}
                  >
                    <textarea
                      className={`textarea${fieldError(fieldErrors, "education") ? " is-invalid" : ""}`}
                      id="education"
                      rows={3}
                      maxLength={3000}
                      value={values.education}
                      onChange={update("education")}
                    />
                  </Field>
                </div>
              </section>

              <section className="form-card" aria-labelledby="links-heading">
                <div className="form-card__head">
                  <h2 id="links-heading">Portfolio and links</h2>
                  <p>Optional public links. Only http:// and https:// addresses are accepted.</p>
                </div>

                <div className="form-grid">
                  <Field
                    label="Portfolio website"
                    htmlFor="portfolio_url"
                    error={fieldError(fieldErrors, "portfolio_url")}
                  >
                    <input
                      className={`input${fieldError(fieldErrors, "portfolio_url") ? " is-invalid" : ""}`}
                      id="portfolio_url"
                      type="url"
                      value={values.portfolio_url}
                      onChange={update("portfolio_url")}
                      maxLength={255}
                      placeholder="https://example.com/your-work"
                    />
                  </Field>

                  <Field
                    label="Professional profile"
                    htmlFor="linkedin_url"
                    error={fieldError(fieldErrors, "linkedin_url")}
                  >
                    <input
                      className={`input${fieldError(fieldErrors, "linkedin_url") ? " is-invalid" : ""}`}
                      id="linkedin_url"
                      type="url"
                      value={values.linkedin_url}
                      onChange={update("linkedin_url")}
                      maxLength={255}
                      placeholder="https://www.linkedin.com/in/your-name"
                    />
                  </Field>
                </div>
              </section>

              <section className="form-card" aria-labelledby="skills-heading">
                <div className="form-card__head">
                  <h2 id="skills-heading">Skills</h2>
                  <p>Choose up to 15 skills and set a level for each one.</p>
                </div>

                {fieldError(fieldErrors, "skill_ids") ? (
                  <p className="field-error">{fieldError(fieldErrors, "skill_ids")}</p>
                ) : null}

                <SkillPicker
                  skills={skills}
                  selected={selectedSkills}
                  levels={skillLevels}
                  onChange={(nextSelected, nextLevels) => {
                    setSelectedSkills(nextSelected);
                    setSkillLevels(nextLevels);
                  }}
                  max={15}
                  title="Your skills"
                />
                <p className="small text-muted">
                  {selectedSkillRows.length} skill{selectedSkillRows.length === 1 ? "" : "s"} selected.
                </p>
              </section>

              <section className="form-card" aria-labelledby="sdgs-heading">
                <div className="form-card__head">
                  <h2 id="sdgs-heading">SDG priorities</h2>
                  <p>Choose the goals your work contributes to.</p>
                </div>
                {fieldError(fieldErrors, "sdg_ids") ? (
                  <p className="field-error">{fieldError(fieldErrors, "sdg_ids")}</p>
                ) : null}
                <SdgPicker sdgs={sdgs} selected={selectedSdgs} onChange={setSelectedSdgs} max={5} />
              </section>

              <section className="form-card">
                <div className="form-card__head">
                  <h2>Directory visibility</h2>
                  <p>
                    Public profiles can appear in the talent directory. Email and phone numbers are
                    never shown publicly, whatever you choose here.
                  </p>
                </div>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={values.is_public}
                    onChange={(event) =>
                      setValues((current) => ({ ...current, is_public: event.target.checked }))
                    }
                  />
                  <span>Show my profile in the public talent directory</span>
                </label>
              </section>

              <div className="profile-form__actions">
                <button className="btn btn--primary btn--lg" type="submit" disabled={saving}>
                  {saving ? "Saving…" : hadProfile ? "Save profile" : "Create profile"}
                </button>
                <Link className="btn btn--ghost" to="/dashboard">Cancel</Link>
              </div>
            </form>
          </div>

          <aside className="profile-editor-side">
            <div className="card">
              <div className="card-body">
                <h2 className="side-heading">Your privacy</h2>
                <ul className="privacy-list">
                  <li>Only your name, title, bio, skills, availability, and links are public.</li>
                  <li>Your email address and phone number are never shown on a public profile.</li>
                  <li>You can hide your profile from the directory at any time.</li>
                </ul>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <h2 className="side-heading">A strong profile</h2>
                <ul className="tips-list">
                  <li>Use a specific professional title.</li>
                  <li>Describe the work you want and the impact you want to have.</li>
                  <li>Add skills you can evidence in your experience.</li>
                  <li>Link to a portfolio if you have one.</li>
                </ul>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <h2 className="side-heading">Signed in as</h2>
                <p className="side-org-name">{user?.name}</p>
                <p className="small text-muted">{user?.email}</p>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
