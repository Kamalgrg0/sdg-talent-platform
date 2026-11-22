import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Breadcrumb, DetailFacts } from "../components/Breadcrumb";
import { DeleteOpportunityButton } from "../components/DeleteOpportunityButton";
import { ErrorNotice } from "../components/ErrorNotice";
import { Loading } from "../components/Loading";
import { MessageButton } from "../components/MessageButton";
import { OpportunityCard } from "../components/OpportunityCard";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { api } from "../lib/api";
import {
  APPLICATION_STATUS_CLASSES,
  APPLICATION_STATUSES,
  daysUntil,
  deadlineLabel,
  formatDate,
  formatDateTime,
  fieldError,
  truncate,
} from "../lib/format";
import { useApi } from "../lib/useApi";

export default function OpportunityDetailPage() {
  const { id } = useParams();
  const { user, isTalent, isEmployerSide } = useAuth();
  const toast = useToast();
  const { data: opportunity, loading, error, reload, setData } = useApi(`/api/opportunities/${id}/`);
  const related = useApi(`/api/opportunities/?per_page=3${opportunity?.sdg ? `&sdg=${opportunity.sdg.id}` : ""}`);
  const [coverLetter, setCoverLetter] = useState("");
  const [fieldErrors, setFieldErrors] = useState(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);

  if (loading) return <Loading label="Loading opportunity…" large />;
  if (error) {
    return (
      <div className="container section">
        <ErrorNotice message={error.message} onRetry={() => reload()} />
      </div>
    );
  }
  if (!opportunity) return null;

  const organization = opportunity.organization || {};
  const skills = opportunity.skills || [];
  const sdg = opportunity.sdg;
  const applied = Boolean(opportunity.application_status || opportunity.has_applied);
  const isOwner = Boolean(user && (user.role === "admin" || opportunity.created_by?.id === user.id));
  const closed = !opportunity.is_open_for_applications;
  const days = daysUntil(opportunity.deadline);

  async function handleApply(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    setFieldErrors(null);
    try {
      await api.post(`/api/opportunities/${opportunity.id}/apply/`, { cover_letter: coverLetter.trim() });
      toast.success("Application submitted. Track it from your dashboard.");
      setCoverLetter("");
      const fresh = await reload();
      if (fresh) setData(fresh);
    } catch (err) {
      setFieldErrors(err.errors);
      setMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const result = await api.post(`/api/opportunities/${opportunity.id}/save/`);
      setData({ ...opportunity, is_saved: result.saved });
      toast.success(result.saved ? "Saved to your list." : "Removed from your saved list.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  const otherRelated = (related.data?.results || []).filter((item) => item.id !== opportunity.id);

  return (
    <>
      <section className="detail-hero">
        <div className="container">
          <Breadcrumb
            items={[
              { label: "Opportunities", to: "/opportunities" },
              { label: truncate(opportunity.title, 70) },
            ]}
          />

          <div className="detail-hero__badges">
            <span className="badge badge--blue">{opportunity.type_label || opportunity.type}</span>
            {closed ? (
              <span className="badge badge--rose">
                {days !== null && days < 0 && opportunity.status === "open" ? "Deadline passed" : "Closed"}
              </span>
            ) : (
              <span className="badge badge--green">Open</span>
            )}
            {opportunity.category ? <span className="badge badge--slate">{opportunity.category}</span> : null}
          </div>

          <h1>{opportunity.title}</h1>

          <p className="detail-org">
            {organization.name || "Independent organization"}
            {organization.is_verified ? <span className="verified">Verified organization</span> : null}
          </p>

          <DetailFacts
            facts={[
              {
                label: "Location",
                value: opportunity.is_remote ? "Remote" : opportunity.location || "Not specified",
              },
              {
                label: "Deadline",
                value: (
                  <>
                    {formatDate(opportunity.deadline)}{" "}
                    {closed ? (
                      <span className="badge badge--rose">Closed</span>
                    ) : days !== null && days <= 7 ? (
                      <span className="badge badge--amber">{deadlineLabel(opportunity.deadline)}</span>
                    ) : (
                      <span className="text-muted small">{deadlineLabel(opportunity.deadline)}</span>
                    )}
                  </>
                ),
              },
              { label: "Posted", value: formatDate(opportunity.created_at) },
              { label: "Reference", value: `OPP-${String(opportunity.id).padStart(4, "0")}` },
            ]}
          />
        </div>
      </section>

      <section className="section">
        <div className="container detail-layout">
          <article className="detail-main">
            <div className="detail-block">
              <h2>About this opportunity</h2>
              <div className="prose">{opportunity.description}</div>
            </div>

            {opportunity.responsibilities ? (
              <div className="detail-block">
                <h2>What you will do</h2>
                <div className="prose">{opportunity.responsibilities}</div>
              </div>
            ) : null}

            {opportunity.requirements ? (
              <div className="detail-block">
                <h2>What we are looking for</h2>
                <div className="prose">{opportunity.requirements}</div>
              </div>
            ) : null}

            {skills.length > 0 ? (
              <div className="detail-block">
                <h2>Skills used in this role</h2>
                <div className="tag-list tag-list--lg">
                  {skills.map((skill) => (
                    <span className="tag" key={skill.id}>
                      {skill.name}
                    </span>
                  ))}
                </div>
                <p className="small text-muted">
                  Skills are listed by the organization and are not a strict checklist. If you meet most
                  of the requirements, apply anyway.
                </p>
              </div>
            ) : null}

            <section className="apply-card" id="apply" aria-labelledby="apply-heading">
              <h2 id="apply-heading">Apply for this opportunity</h2>

              {applied ? (
                <>
                  <div className="notice notice--success">
                    <p>
                      <strong>Your application was submitted.</strong> Status:{" "}
                      <span className={`badge ${APPLICATION_STATUS_CLASSES[opportunity.application_status] || "badge--slate"}`}>
                        {APPLICATION_STATUSES.find((item) => item.value === opportunity.application_status)?.label ||
                          "Submitted"}
                      </span>
                    </p>
                    <p className="small">
                      A second application to the same opportunity is not possible. Track the status from
                      your dashboard.
                    </p>
                  </div>
                  <div className="apply-actions">
                    <Link className="btn btn--outline" to="/dashboard">
                      Go to my dashboard
                    </Link>
                  </div>
                </>
              ) : closed ? (
                <>
                  <div className="notice notice--warning">
                    <p>
                      <strong>Applications are closed.</strong>{" "}
                      {days !== null && days < 0
                        ? `The deadline was ${formatDate(opportunity.deadline)}.`
                        : "This opportunity is no longer accepting applications."}
                    </p>
                  </div>
                  <div className="apply-actions">
                    <Link className="btn btn--primary" to="/opportunities">
                      Browse open opportunities
                    </Link>
                  </div>
                </>
              ) : !user ? (
                <>
                  <p>
                    Applications are open to job seeker and freelancer accounts. Log in or create a free
                    account, then come back to this page.
                  </p>
                  <div className="apply-actions">
                    <Link className="btn btn--primary" to={`/login?next=/opportunities/${opportunity.id}`}>
                      Log in to apply
                    </Link>
                    <Link className="btn btn--outline" to="/register">
                      Create an account
                    </Link>
                  </div>
                </>
              ) : !isTalent ? (
                <>
                  <div className="notice notice--info">
                    <p>
                      You are signed in as <strong>{isEmployerSide ? "an employer-side account" : "a non-talent account"}</strong>.
                      Applications are submitted from job seeker or freelancer accounts, so this form is
                      not available to your role.
                    </p>
                  </div>
                  <p className="small text-muted">
                    Organizations and employers publish opportunities; they do not apply to them.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    Send a short cover letter explaining why this role fits your skills and what you
                    would bring to {organization.name || "the organization"}. You can apply once per
                    opportunity.
                  </p>

                  {message ? (
                    <div className="alert alert--error">
                      <span className="alert-icon" aria-hidden="true">
                        !
                      </span>
                      <p>{message}</p>
                    </div>
                  ) : null}

                  <form className="apply-form" onSubmit={handleApply} noValidate>
                    <div className="form-field">
                      <label className="form-label" htmlFor="cover_letter">
                        Cover letter <span className="required">*</span>
                      </label>
                      <textarea
                        className={`textarea${fieldError(fieldErrors, "cover_letter") ? " is-invalid" : ""}`}
                        id="cover_letter"
                        rows={7}
                        maxLength={4000}
                        value={coverLetter}
                        onChange={(event) => setCoverLetter(event.target.value)}
                        required
                      />
                      <p className="help-text">Between 20 and 4,000 characters. Plain text only.</p>
                      {fieldError(fieldErrors, "cover_letter") ? (
                        <p className="field-error">{fieldError(fieldErrors, "cover_letter")}</p>
                      ) : null}
                    </div>

                    <div className="apply-actions">
                      <button className="btn btn--primary btn--lg" type="submit" disabled={submitting}>
                        {submitting ? "Submitting…" : "Submit application"}
                      </button>
                      <Link className="btn btn--ghost" to="/opportunities">
                        Keep browsing
                      </Link>
                    </div>
                  </form>
                </>
              )}
            </section>
          </article>

          <aside className="detail-side">
            {isTalent ? (
              <div className="card">
                <div className="card-body">
                  <h2 className="side-heading">Shortlist this role</h2>
                  <button
                    className="btn btn--outline btn--block"
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    aria-pressed={Boolean(opportunity.is_saved)}
                  >
                    {saving ? "Saving…" : opportunity.is_saved ? "Saved ✓" : "Save opportunity"}
                  </button>
                  <p className="small text-muted side-copy">
                    Saved roles appear on your dashboard and can be removed at any time.
                  </p>
                </div>
              </div>
            ) : null}

            {isOwner ? (
              <div className="card">
                <div className="card-body">
                  <h2 className="side-heading">Manage</h2>
                  <p className="small text-muted">
                    You published this opportunity. Review applications or update the listing.
                  </p>
                  <div className="stack--sm">
                    <Link
                      className="btn btn--primary btn--block"
                      to={`/dashboard/manage-applicants/${opportunity.id}`}
                    >
                      Review applicants
                    </Link>
                    <Link
                      className="btn btn--outline btn--block"
                      to={`/dashboard/opportunities/${opportunity.id}/edit`}
                    >
                      Edit opportunity
                    </Link>
                    <DeleteOpportunityButton
                      opportunityId={opportunity.id}
                      opportunityTitle={opportunity.title}
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {user && !isOwner && opportunity.created_by?.id ? (
              <div className="card">
                <div className="card-body">
                  <h2 className="side-heading">Contact the organization</h2>
                  <p className="small text-muted">
                    Ask about the role, the process, or next steps. Your conversation stays private to you
                    and {organization.name || "the organization"}.
                  </p>
                  <MessageButton
                    userId={opportunity.created_by.id}
                    subject={`Question about ${opportunity.title}`}
                    label="Message the organization"
                    className="btn btn--primary btn--block"
                  />
                  <p className="small text-muted side-copy">
                    <Link to="/messages">Open your inbox</Link> to see replies.
                  </p>
                </div>
              </div>
            ) : null}

            <div className="card">
              <div className="card-body">
                <h2 className="side-heading">About the organization</h2>
                <p className="side-org-name">
                  {organization.name || "Independent organization"}
                  {organization.is_verified ? <span className="verified">Verified</span> : null}
                </p>
                {organization.description ? (
                  <p className="small text-muted">{truncate(organization.description, 220)}</p>
                ) : null}
                <ul className="side-list side-list--compact">
                  {organization.location ? (
                    <li>
                      <span className="detail-fact-label">Location</span>
                      <span className="detail-fact-value">{organization.location}</span>
                    </li>
                  ) : null}
                  {organization.website ? (
                    <li>
                      <span className="detail-fact-label">Website</span>
                      <span className="detail-fact-value word-break">
                        <a href={organization.website} target="_blank" rel="noreferrer">
                          {organization.website}
                        </a>
                      </span>
                    </li>
                  ) : null}
                </ul>
              </div>
            </div>

            {sdg ? (
              <div className="card sdg-card" style={{ "--sdg-color": sdg.color_hex }}>
                <div className="card-body">
                  <h2 className="side-heading">SDG alignment</h2>
                  <p className="sdg-card__title">
                    <span className="sdg-dot" aria-hidden="true" /> {sdg.code} · {sdg.name}
                  </p>
                  <p className="small text-muted">{sdg.description}</p>
                  <Link className="link-arrow" to={`/opportunities?sdg=${sdg.id}`}>
                    More work on this goal
                  </Link>
                </div>
              </div>
            ) : null}

            <div className="card">
              <div className="card-body">
                <h2 className="side-heading">Good to know</h2>
                <ul className="side-list side-list--compact">
                  <li>Applications are managed inside the platform.</li>
                  <li>Public profiles never show email addresses or phone numbers.</li>
                  <li>No payment or contract is created by applying.</li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {otherRelated.length > 0 ? (
        <section className="section section--muted">
          <div className="container">
            <div className="section-head">
              <div className="section-head__text">
                <span className="eyebrow">Related</span>
                <h2>More roles you might consider</h2>
              </div>
              <Link className="section-link" to="/opportunities">
                All opportunities
              </Link>
            </div>
            <div className="opportunity-grid opportunity-grid--two">
              {otherRelated.slice(0, 3).map((item) => (
                <OpportunityCard key={item.id} opportunity={item} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
