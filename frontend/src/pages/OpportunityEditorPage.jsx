import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ErrorNotice } from "../components/ErrorNotice";
import { EmptyState } from "../components/EmptyState";
import { Field, SelectField } from "../components/Field";
import { Loading } from "../components/Loading";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { api } from "../lib/api";
import { OPPORTUNITY_TYPES, dashboardPathForRole, fieldError, todayISO } from "../lib/format";

const STATUS_OPTIONS = [
  { value: "open", label: "Open — visible and accepting applications" },
  { value: "draft", label: "Draft — only visible to you" },
  { value: "closed", label: "Closed — listed but not accepting applications" },
];

function inDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

const EMPTY = {
  title: "",
  description: "",
  responsibilities: "",
  requirements: "",
  location: "",
  type: "job",
  category: "",
  is_remote: false,
  deadline: inDays(30),
  status: "open",
  sdg_id: "",
  skill_ids: [],
};

const MAX_SKILLS = 20;

export default function OpportunityEditorPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { user, refresh } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [values, setValues] = useState(EMPTY);
  const [skills, setSkills] = useState([]);
  const [sdgs, setSdgs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [skillQuery, setSkillQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [fieldErrors, setFieldErrors] = useState(null);
  const [formMessage, setFormMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const hasOrganization = Boolean(user?.organization_id);

  useEffect(() => {
    let active = true;

    const requests = [
      api.get("/api/catalog/skills/"),
      api.get("/api/catalog/sdgs/"),
      api.get("/api/opportunities/options/").catch(() => ({ categories: [] })),
      isEdit ? api.get(`/api/opportunities/${id}/`) : Promise.resolve(null),
    ];

    Promise.all(requests)
      .then(([skillData, sdgData, optionData, opportunity]) => {
        if (!active) return;
        setSkills(Array.isArray(skillData) ? skillData : []);
        setSdgs(Array.isArray(sdgData) ? sdgData : []);
        setCategories((optionData?.categories || []).map((item) => item.value));

        if (opportunity) {
          setValues({
            title: opportunity.title || "",
            description: opportunity.description || "",
            responsibilities: opportunity.responsibilities || "",
            requirements: opportunity.requirements || "",
            location: opportunity.location || "",
            type: opportunity.type || "job",
            category: opportunity.category || "",
            is_remote: Boolean(opportunity.is_remote),
            deadline: opportunity.deadline || inDays(30),
            status: opportunity.status || "open",
            sdg_id: opportunity.sdg?.id ? String(opportunity.sdg.id) : "",
            skill_ids: (opportunity.skills || []).map((skill) => skill.id),
          });
        }
      })
      .catch((err) => {
        if (!active) return;
        if (err.status === 404) setNotFound(true);
        else setLoadError(err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, isEdit]);

  function update(field) {
    return (event) => setValues((current) => ({ ...current, [field]: event.target.value }));
  }

  function toggleSkill(skillId) {
    setValues((current) => {
      if (current.skill_ids.includes(skillId)) {
        return { ...current, skill_ids: current.skill_ids.filter((item) => item !== skillId) };
      }
      if (current.skill_ids.length >= MAX_SKILLS) return current;
      return { ...current, skill_ids: [...current.skill_ids, skillId] };
    });
  }

  const filteredSkills = useMemo(() => {
    const keyword = skillQuery.trim().toLowerCase();
    if (!keyword) return skills;
    return skills.filter((skill) =>
      `${skill.name} ${skill.category || ""}`.toLowerCase().includes(keyword)
    );
  }, [skills, skillQuery]);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setFieldErrors(null);
    setFormMessage("");

    const payload = {
      title: values.title.trim(),
      description: values.description.trim(),
      responsibilities: values.responsibilities.trim(),
      requirements: values.requirements.trim(),
      location: values.location.trim(),
      type: values.type,
      category: values.category.trim(),
      is_remote: values.is_remote,
      deadline: values.deadline,
      status: values.status,
      sdg_id: values.sdg_id ? Number(values.sdg_id) : null,
      skill_ids: values.skill_ids,
    };

    try {
      const result = isEdit
        ? await api.put(`/api/opportunities/${id}/`, payload)
        : await api.post("/api/opportunities/", payload);

      toast.success(
        isEdit
          ? "Opportunity updated."
          : result.status === "draft"
          ? "Draft saved. Publish it when you are ready."
          : "Opportunity published."
      );
      await refresh();
      navigate(`/opportunities/${result.id}`);
    } catch (err) {
      setFieldErrors(err.errors);
      setFormMessage(err.message);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loading label="Loading the opportunity editor…" large />;

  if (notFound) {
    return (
      <div className="container section">
        <EmptyState
          icon="?"
          title="Opportunity not found"
          text="It may have been deleted, or the link is out of date."
          action={
            <Link className="btn btn--primary" to="/dashboard/employer">
              Back to dashboard
            </Link>
          }
        />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="container section">
        <ErrorNotice message={loadError.message} />
      </div>
    );
  }

  if (!isEdit && !hasOrganization) {
    return (
      <>
        <PageHeader
          eyebrow="Employer workspace"
          title="Post an opportunity"
          lead="Opportunities are published under your organization, so the profile has to exist first."
        />
        <section className="section">
          <div className="container">
            <div className="card">
              <div className="card-body">
                <EmptyState
                  compact
                  icon="?"
                  title="Create your organization profile first"
                  text="Your organization name, description, and contact details are shown on every opportunity you publish."
                  action={
                    <Link className="btn btn--primary" to="/dashboard/organization/edit">
                      Create organization profile
                    </Link>
                  }
                />
              </div>
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Employer workspace"
        title={isEdit ? "Edit opportunity" : "Post an opportunity"}
        lead="Describe the role, who it is for, and how to apply. You can save a draft and publish it later."
        actions={
          <Link className="btn btn--ghost" to="/dashboard/employer">
            Back to dashboard
          </Link>
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
              <section className="form-card" aria-labelledby="role-heading">
                <div className="form-card__head">
                  <h2 id="role-heading">Role details</h2>
                  <p>The essentials talent sees first in the listing.</p>
                </div>

                <div className="form-grid">
                  <Field
                    label="Title"
                    htmlFor="title"
                    required
                    full
                    error={fieldError(fieldErrors, "title")}
                  >
                    <input
                      className={`input${fieldError(fieldErrors, "title") ? " is-invalid" : ""}`}
                      id="title"
                      type="text"
                      value={values.title}
                      onChange={update("title")}
                      maxLength={180}
                      required
                      placeholder="e.g. Programme Officer — Climate Resilience"
                    />
                  </Field>

                  <SelectField
                    label="Type"
                    name="type"
                    value={values.type}
                    onChange={update("type")}
                    options={OPPORTUNITY_TYPES}
                    required
                    error={fieldError(fieldErrors, "type")}
                  />

                  <Field
                    label="Category"
                    htmlFor="category"
                    hint="Optional. Pick an existing category or type a new one."
                    error={fieldError(fieldErrors, "category")}
                  >
                    <input
                      className={`input${fieldError(fieldErrors, "category") ? " is-invalid" : ""}`}
                      id="category"
                      type="text"
                      list="opportunity-categories"
                      value={values.category}
                      onChange={update("category")}
                      maxLength={80}
                    />
                    <datalist id="opportunity-categories">
                      {categories.map((category) => (
                        <option value={category} key={category} />
                      ))}
                    </datalist>
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
                      placeholder="e.g. Kathmandu, Nepal"
                    />
                  </Field>

                  <Field
                    label="Application deadline"
                    htmlFor="deadline"
                    required
                    error={fieldError(fieldErrors, "deadline")}
                  >
                    <input
                      className={`input${fieldError(fieldErrors, "deadline") ? " is-invalid" : ""}`}
                      id="deadline"
                      type="date"
                      value={values.deadline}
                      onChange={update("deadline")}
                      min={todayISO()}
                      required
                    />
                  </Field>

                  <SelectField
                    label="Status"
                    name="status"
                    value={values.status}
                    onChange={update("status")}
                    options={STATUS_OPTIONS}
                    required
                    error={fieldError(fieldErrors, "status")}
                  />

                  <div className="form-field form-field--full">
                    <label className="checkbox-row" htmlFor="is_remote">
                      <input
                        type="checkbox"
                        id="is_remote"
                        checked={values.is_remote}
                        onChange={(event) =>
                          setValues((current) => ({ ...current, is_remote: event.target.checked }))
                        }
                      />
                      This role can be done remotely
                    </label>
                    {fieldError(fieldErrors, "is_remote") ? (
                      <p className="field-error">{fieldError(fieldErrors, "is_remote")}</p>
                    ) : null}
                  </div>
                </div>
              </section>

              <section className="form-card" aria-labelledby="description-heading">
                <div className="form-card__head">
                  <h2 id="description-heading">Description</h2>
                  <p>Explain the work, the day-to-day tasks, and who you are looking for.</p>
                </div>

                <div className="form-grid">
                  <Field
                    label="About the opportunity"
                    htmlFor="description"
                    required
                    full
                    hint="Up to 5,000 characters. Plain text only."
                    error={fieldError(fieldErrors, "description")}
                  >
                    <textarea
                      className={`textarea${fieldError(fieldErrors, "description") ? " is-invalid" : ""}`}
                      id="description"
                      rows={7}
                      maxLength={5000}
                      value={values.description}
                      onChange={update("description")}
                      required
                    />
                  </Field>

                  <Field
                    label="Responsibilities"
                    htmlFor="responsibilities"
                    full
                    hint="One responsibility per line."
                    error={fieldError(fieldErrors, "responsibilities")}
                  >
                    <textarea
                      className={`textarea${fieldError(fieldErrors, "responsibilities") ? " is-invalid" : ""}`}
                      id="responsibilities"
                      rows={5}
                      maxLength={5000}
                      value={values.responsibilities}
                      onChange={update("responsibilities")}
                    />
                  </Field>

                  <Field
                    label="Requirements"
                    htmlFor="requirements"
                    full
                    hint="Qualifications, experience, and skills the applicant needs."
                    error={fieldError(fieldErrors, "requirements")}
                  >
                    <textarea
                      className={`textarea${fieldError(fieldErrors, "requirements") ? " is-invalid" : ""}`}
                      id="requirements"
                      rows={5}
                      maxLength={5000}
                      value={values.requirements}
                      onChange={update("requirements")}
                    />
                  </Field>
                </div>
              </section>

              <section className="form-card" aria-labelledby="focus-heading">
                <div className="form-card__head">
                  <h2 id="focus-heading">Skills and SDG focus</h2>
                  <p>These power the filters talent use to find your role.</p>
                </div>

                <div className="form-grid">
                  <SelectField
                    label="Sustainable Development Goal"
                    name="sdg_id"
                    value={values.sdg_id}
                    onChange={update("sdg_id")}
                    options={sdgs.map((sdg) => ({ value: String(sdg.id), label: `${sdg.code}: ${sdg.name}` }))}
                    placeholder="No specific SDG"
                    full
                    error={fieldError(fieldErrors, "sdg_id")}
                  />

                  <fieldset className="form-field form-field--full picker">
                    <legend className="form-label">Skills ({values.skill_ids.length} selected)</legend>
                    <div className="skills-search">
                      <input
                        className="input"
                        type="search"
                        value={skillQuery}
                        onChange={(event) => setSkillQuery(event.target.value)}
                        placeholder="Search skills by name or category"
                        aria-label="Search skills"
                      />
                      <span className={`picker-count${values.skill_ids.length > MAX_SKILLS ? " is-over" : ""}`}>
                        {values.skill_ids.length} / {MAX_SKILLS} selected
                      </span>
                    </div>
                    <div className="skill-picker-list">
                      {filteredSkills.map((skill) => {
                        const checked = values.skill_ids.includes(skill.id);
                        return (
                          <div className={`skill-picker-item${checked ? " is-selected" : ""}`} key={skill.id}>
                            <label className="checkbox-row">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleSkill(skill.id)}
                                disabled={!checked && values.skill_ids.length >= MAX_SKILLS}
                              />
                              <span>
                                {skill.name}
                                {skill.category ? (
                                  <span className="small text-muted"> · {skill.category}</span>
                                ) : null}
                              </span>
                            </label>
                          </div>
                        );
                      })}
                      {filteredSkills.length === 0 ? (
                        <p className="small text-muted">No skills match “{skillQuery}”.</p>
                      ) : null}
                    </div>
                    {fieldError(fieldErrors, "skill_ids") ? (
                      <p className="field-error">{fieldError(fieldErrors, "skill_ids")}</p>
                    ) : null}
                  </fieldset>
                </div>
              </section>

              <div className="profile-form__actions">
                <button className="btn btn--primary btn--lg" type="submit" disabled={saving}>
                  {saving ? "Saving…" : isEdit ? "Save changes" : values.status === "draft" ? "Save draft" : "Publish opportunity"}
                </button>
                <Link className="btn btn--ghost" to={dashboardPathForRole(user?.role) || "/dashboard/employer"}>
                  Cancel
                </Link>
              </div>
            </form>
          </div>

          <aside className="profile-editor-side" aria-label="Posting guidance">
            <div className="card">
              <div className="card-body">
                <h2 className="side-heading">Before you publish</h2>
                <dl className="side-list side-list--compact">
                  <div>
                    <dt>Published as</dt>
                    <dd>{user?.name}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{values.status}</dd>
                  </div>
                  <div>
                    <dt>Deadline</dt>
                    <dd>{values.deadline || "Not set"}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <h2 className="side-heading">Tips</h2>
                <p className="small text-muted">
                  Be specific about the commitment, location, and required experience. Roles with a
                  clear description and at least four skills get more qualified applicants.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
