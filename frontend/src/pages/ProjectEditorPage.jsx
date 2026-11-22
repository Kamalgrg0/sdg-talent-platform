import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { ErrorNotice } from "../components/ErrorNotice";
import { Field, SelectField } from "../components/Field";
import { Loading } from "../components/Loading";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { api } from "../lib/api";
import { fieldError, todayISO } from "../lib/format";

function inDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

const CONFIG = {
  freelance: {
    eyebrow: "Freelance workspace",
    createTitle: "Post a freelance project",
    editTitle: "Edit freelance project",
    listPath: "/freelance",
    detailPath: (id) => `/freelance/${id}`,
    apiBase: "/api/freelance/",
    empty: {
      title: "",
      description: "",
      budget_npr: "",
      duration: "",
      deadline: inDays(30),
      status: "open",
      skill_ids: [],
    },
    statusOptions: [
      { value: "open", label: "Open — accepting proposals" },
      { value: "in_progress", label: "In progress" },
      { value: "completed", label: "Completed" },
      { value: "cancelled", label: "Cancelled" },
    ],
    needsOrganization: false,
  },
  talent: {
    eyebrow: "Employer workspace",
    createTitle: "Post a talent project",
    editTitle: "Edit talent project",
    listPath: "/dashboard/employer",
    detailPath: () => "/dashboard/employer",
    apiBase: "/api/opportunities/talent-projects/",
    empty: {
      title: "",
      description: "",
      duration: "",
      location: "",
      is_remote: false,
      talent_required: 1,
      deadline: inDays(30),
      status: "open",
      sdg_id: "",
      skill_ids: [],
    },
    statusOptions: [
      { value: "open", label: "Open" },
      { value: "closed", label: "Closed" },
    ],
    needsOrganization: true,
  },
};

export default function ProjectEditorPage({ mode }) {
  const config = CONFIG[mode] || CONFIG.freelance;
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { user, refresh } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [values, setValues] = useState(config.empty);
  const [skills, setSkills] = useState([]);
  const [sdgs, setSdgs] = useState([]);
  const [skillQuery, setSkillQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [fieldErrors, setFieldErrors] = useState(null);
  const [formMessage, setFormMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const resourceUrl = isEdit ? `${config.apiBase.replace(/\/$/, "")}/${id}/` : null;

  useEffect(() => {
    let active = true;
    const requests = [
      api.get("/api/catalog/skills/"),
      mode === "talent" ? api.get("/api/catalog/sdgs/") : Promise.resolve([]),
      resourceUrl ? api.get(resourceUrl) : Promise.resolve(null),
    ];

    Promise.all(requests)
      .then(([skillData, sdgData, project]) => {
        if (!active) return;
        setSkills(Array.isArray(skillData) ? skillData : []);
        setSdgs(Array.isArray(sdgData) ? sdgData : []);
        if (project) {
          setValues({
            ...config.empty,
            ...Object.fromEntries(
              Object.keys(config.empty)
                .filter((key) => key in project)
                .map((key) => [key, project[key]])
            ),
            deadline: project.deadline || inDays(30),
            sdg_id: project.sdg?.id ? String(project.sdg.id) : "",
            skill_ids: (project.skills || []).map((skill) => skill.id),
          });
        } else {
          setValues(config.empty);
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
  }, [id, mode, resourceUrl]);

  const filteredSkills = useMemo(() => {
    const keyword = skillQuery.trim().toLowerCase();
    if (!keyword) return skills;
    return skills.filter((skill) =>
      `${skill.name} ${skill.category || ""}`.toLowerCase().includes(keyword)
    );
  }, [skills, skillQuery]);

  function update(field) {
    return (event) => {
      const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
      setValues((current) => ({ ...current, [field]: value }));
    };
  }

  function toggleSkill(skillId) {
    setValues((current) => ({
      ...current,
      skill_ids: current.skill_ids.includes(skillId)
        ? current.skill_ids.filter((item) => item !== skillId)
        : [...current.skill_ids, skillId],
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setFieldErrors(null);
    setFormMessage("");

    const payload = { ...values, skill_ids: values.skill_ids };
    if (mode === "freelance") {
      payload.budget_npr = Number(values.budget_npr);
    } else {
      payload.talent_required = Number(values.talent_required);
      payload.sdg_id = values.sdg_id ? Number(values.sdg_id) : null;
    }

    try {
      const result = isEdit
        ? await api.put(resourceUrl, payload)
        : await api.post(config.apiBase, payload);
      toast.success(isEdit ? "Project updated." : "Project published.");
      await refresh();
      navigate(config.detailPath(result.id));
    } catch (err) {
      setFieldErrors(err.errors);
      setFormMessage(err.message);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loading label="Loading the project editor…" large />;

  if (notFound) {
    return (
      <div className="container section">
        <EmptyState
          icon="?"
          title="Project not found"
          text="It may have been deleted, or the link is out of date."
          action={<Link className="btn btn--primary" to={config.listPath}>Back to projects</Link>}
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

  if (!isEdit && config.needsOrganization && !user?.organization_id) {
    return (
      <>
        <PageHeader
          eyebrow={config.eyebrow}
          title={config.createTitle}
          lead="Talent projects are published under your organization profile."
        />
        <section className="section">
          <div className="container">
            <div className="card">
              <div className="card-body">
                <EmptyState
                  compact
                  icon="?"
                  title="Create your organization profile first"
                  text="Your organization details are shown on every talent project you publish."
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
        eyebrow={config.eyebrow}
        title={isEdit ? config.editTitle : config.createTitle}
        lead="Describe the work, the timeline, and the skills that matter. You can change the status at any time."
        actions={<Link className="btn btn--ghost" to={config.listPath}>Back to projects</Link>}
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
              <section className="form-card">
                <div className="form-card__head">
                  <h2>Project details</h2>
                  <p>The essentials every member sees first.</p>
                </div>
                <div className="form-grid">
                  <Field label="Title" htmlFor="project-title" required full error={fieldError(fieldErrors, "title")}>
                    <input
                      className={`input${fieldError(fieldErrors, "title") ? " is-invalid" : ""}`}
                      id="project-title"
                      value={values.title}
                      onChange={update("title")}
                      maxLength={180}
                      required
                    />
                  </Field>
                  <Field label="Description" htmlFor="project-description" required full error={fieldError(fieldErrors, "description")}>
                    <textarea
                      className={`textarea${fieldError(fieldErrors, "description") ? " is-invalid" : ""}`}
                      id="project-description"
                      rows={7}
                      value={values.description}
                      onChange={update("description")}
                      required
                    />
                  </Field>
                  {mode === "freelance" ? (
                    <Field label="Budget (NPR)" htmlFor="project-budget" required error={fieldError(fieldErrors, "budget_npr")}>
                      <input
                        className={`input${fieldError(fieldErrors, "budget_npr") ? " is-invalid" : ""}`}
                        id="project-budget"
                        type="number"
                        min={1}
                        step="0.01"
                        value={values.budget_npr}
                        onChange={update("budget_npr")}
                        required
                      />
                    </Field>
                  ) : null}
                  <Field label="Duration" htmlFor="project-duration" required error={fieldError(fieldErrors, "duration")}>
                    <input
                      className={`input${fieldError(fieldErrors, "duration") ? " is-invalid" : ""}`}
                      id="project-duration"
                      placeholder="e.g. 3 months"
                      value={values.duration}
                      onChange={update("duration")}
                      maxLength={60}
                      required
                    />
                  </Field>
                  {mode === "talent" ? (
                    <>
                      <Field label="Location" htmlFor="project-location" error={fieldError(fieldErrors, "location")}>
                        <input
                          className={`input${fieldError(fieldErrors, "location") ? " is-invalid" : ""}`}
                          id="project-location"
                          value={values.location}
                          onChange={update("location")}
                          maxLength={120}
                        />
                      </Field>
                      <Field label="People needed" htmlFor="project-talent-required" error={fieldError(fieldErrors, "talent_required")}>
                        <input
                          className={`input${fieldError(fieldErrors, "talent_required") ? " is-invalid" : ""}`}
                          id="project-talent-required"
                          type="number"
                          min={1}
                          value={values.talent_required}
                          onChange={update("talent_required")}
                        />
                      </Field>
                      <div className="form-field form-field--full">
                        <label className="checkbox-row" htmlFor="project-remote">
                          <input
                            id="project-remote"
                            type="checkbox"
                            checked={Boolean(values.is_remote)}
                            onChange={update("is_remote")}
                          />{" "}
                          Remote collaboration
                        </label>
                      </div>
                      <SelectField
                        label="Sustainable development goal"
                        name="project-sdg"
                        value={values.sdg_id}
                        onChange={update("sdg_id")}
                        options={sdgs.map((sdg) => ({ value: String(sdg.id), label: sdg.name }))}
                        placeholder="Optional"
                        full
                        error={fieldError(fieldErrors, "sdg_id")}
                      />
                    </>
                  ) : null}
                  <Field label="Deadline" htmlFor="project-deadline" required error={fieldError(fieldErrors, "deadline")}>
                    <input
                      className={`input${fieldError(fieldErrors, "deadline") ? " is-invalid" : ""}`}
                      id="project-deadline"
                      type="date"
                      min={todayISO()}
                      value={values.deadline}
                      onChange={update("deadline")}
                      required
                    />
                  </Field>
                  <SelectField
                    label="Status"
                    name="project-status"
                    value={values.status}
                    onChange={update("status")}
                    options={config.statusOptions}
                    error={fieldError(fieldErrors, "status")}
                  />
                </div>
              </section>

              <section className="form-card">
                <div className="form-card__head">
                  <h2>Skills</h2>
                  <p>Optional, but useful for matching the right people.</p>
                </div>
                <div className="form-field form-field--full">
                  <label className="form-label" htmlFor="project-skill-search">Find skills</label>
                  <input
                    className="input"
                    id="project-skill-search"
                    value={skillQuery}
                    onChange={(event) => setSkillQuery(event.target.value)}
                    placeholder="Search by name or category"
                  />
                </div>
                <div className="skill-picker">
                  {filteredSkills.length === 0 ? (
                    <p className="small text-muted">No matching skills.</p>
                  ) : (
                    filteredSkills.map((skill) => (
                      <label className="skill-option" key={skill.id}>
                        <input
                          type="checkbox"
                          checked={values.skill_ids.includes(skill.id)}
                          onChange={() => toggleSkill(skill.id)}
                        />{" "}
                        {skill.name}
                      </label>
                    ))
                  )}
                </div>
              </section>

              <div className="form-actions">
                <button className="btn btn--primary btn--lg" type="submit" disabled={saving}>
                  {saving ? "Saving…" : isEdit ? "Save changes" : "Publish project"}
                </button>
                <Link className="btn btn--ghost" to={config.listPath}>Cancel</Link>
              </div>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
