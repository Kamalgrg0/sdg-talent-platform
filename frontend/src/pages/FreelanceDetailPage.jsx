import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Breadcrumb, DetailFacts } from "../components/Breadcrumb";
import { ErrorNotice } from "../components/ErrorNotice";
import { FreelanceCard } from "../components/FreelanceCard";
import { Loading } from "../components/Loading";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { api } from "../lib/api";
import {
  PROPOSAL_STATUS_CLASSES,
  PROPOSAL_STATUSES,
  daysUntil,
  deadlineLabel,
  fieldError,
  formatDate,
  formatDateTime,
  formatMoney,
  truncate,
} from "../lib/format";
import { useApi } from "../lib/useApi";

const PROJECT_STATUS_CLASSES = {
  open: "badge--green",
  in_progress: "badge--blue",
  completed: "badge--slate",
  cancelled: "badge--rose",
};

const PROJECT_STATUSES = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const OWNER_PROPOSAL_STATUSES = PROPOSAL_STATUSES.filter((status) => status.value !== "withdrawn");

const EMPTY_PROPOSAL = {
  bid_amount: "",
  delivery_days: "",
  relevant_skills: "",
  cover_letter: "",
  portfolio_url: "",
};

function statusLabel(value) {
  return PROPOSAL_STATUSES.find((item) => item.value === value)?.label || value || "Submitted";
}

export default function FreelanceDetailPage() {
  const { id } = useParams();
  const { user, isEmployerSide } = useAuth();
  const toast = useToast();
  const { data: project, loading, error, reload: reloadProject } = useApi(`/api/freelance/${id}/`);
  const isFreelancer = Boolean(user && user.role === "freelancer");
  const isOwner = Boolean(user && project && (user.role === "admin" || project.client?.id === user.id));
  const canManage = isOwner;

  const {
    data: myProposals,
    reload: reloadMine,
  } = useApi(isFreelancer ? "/api/freelance/proposals/mine/" : null);
  const {
    data: projectProposals,
    reload: reloadProjectProposals,
  } = useApi(canManage ? `/api/freelance/${id}/proposals/` : null);
  const related = useApi(canManage ? null : "/api/freelance/?per_page=4");

  const [form, setForm] = useState(EMPTY_PROPOSAL);
  const [fieldErrors, setFieldErrors] = useState(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [projectStatus, setProjectStatus] = useState("open");
  const [proposalDrafts, setProposalDrafts] = useState({});

  useEffect(() => {
    if (project) setProjectStatus(project.status);
  }, [project?.id, project?.status]);

  useEffect(() => {
    if (!projectProposals) return;
    const drafts = {};
    projectProposals.forEach((proposal) => {
      drafts[proposal.id] = proposal.status;
    });
    setProposalDrafts(drafts);
  }, [projectProposals]);

  const myProposal = useMemo(() => {
    if (!Array.isArray(myProposals) || !project) return null;
    return (
      myProposals.find(
        (proposal) => String(proposal.project_id) === String(project.id)
      ) || null
    );
  }, [myProposals, project?.id]);

  const acceptedProposal = (projectProposals || []).find((proposal) => proposal.status === "accepted") || null;
  const acceptedCount = (projectProposals || []).filter((proposal) => proposal.status === "accepted").length;

  if (loading) return <Loading label="Loading project…" large />;
  if (error) {
    return (
      <div className="container section">
        <ErrorNotice message={error.message} onRetry={() => reloadProject()} />
      </div>
    );
  }
  if (!project) return null;

  const clientLabel = project.organization?.name || project.client?.name || "Independent client";
  const skills = project.skills || [];
  const days = daysUntil(project.deadline);
  const expired = days !== null && days < 0;
  const isOpen = project.status === "open" && !expired;
  const statusClass = PROJECT_STATUS_CLASSES[project.status] || "badge--slate";

  async function submitProposal(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    setFieldErrors(null);
    try {
      await api.post(`/api/freelance/${project.id}/proposals/submit/`, {
        ...form,
        bid_amount: Number(form.bid_amount),
        delivery_days: Number(form.delivery_days),
      });
      toast.success("Proposal submitted. Track it from your dashboard.");
      setForm(EMPTY_PROPOSAL);
      await reloadMine();
      await reloadProject();
    } catch (err) {
      setFieldErrors(err.errors);
      setMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function withdrawProposal() {
    if (!myProposal) return;
    setBusy(true);
    try {
      await api.patch(`/api/freelance/proposals/${myProposal.id}/withdraw/`);
      toast.success("Proposal withdrawn.");
      await reloadMine();
      await reloadProject();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveProjectStatus(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.patch(`/api/freelance/${project.id}/`, { status: projectStatus });
      toast.success("Project status updated.");
      await reloadProject();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveProposalStatus(proposal) {
    const nextStatus = proposalDrafts[proposal.id] || proposal.status;
    if (nextStatus === proposal.status) return;
    if (acceptedCount > 0 && nextStatus === "accepted" && acceptedProposal && acceptedProposal.id !== proposal.id) {
      const confirmed = window.confirm(
        `Accepting this proposal declines the accepted proposal from ${acceptedProposal.freelancer?.name || "another freelancer"}. Continue?`
      );
      if (!confirmed) return;
    }
    setBusy(true);
    try {
      if (acceptedCount > 0 && nextStatus === "accepted" && acceptedProposal && acceptedProposal.id !== proposal.id) {
        await api.patch(`/api/freelance/proposals/${acceptedProposal.id}/status/`, { status: "rejected" });
      }
      await api.patch(`/api/freelance/proposals/${proposal.id}/status/`, { status: nextStatus });
      toast.success("Proposal status updated.");
      await reloadProjectProposals();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  const otherRelated = (related.data?.results || []).filter((item) => item.id !== project.id);

  return (
    <>
      <section className="detail-hero">
        <div className="container">
          <Breadcrumb
            items={[
              { label: "Freelance projects", to: "/freelance" },
              { label: truncate(project.title, 70) },
            ]}
          />

          <div className="detail-hero__badges">
            <span className="budget-pill budget-pill--lg">{formatMoney(project.budget_npr)}</span>
            <span className={`badge ${statusClass}`}>{project.status_label || project.status}</span>
            <span className="badge badge--slate">{project.duration}</span>
            {canManage ? <span className="badge badge--amber">You manage this project</span> : null}
          </div>

          <h1>{project.title}</h1>

          <p className="detail-org">
            {clientLabel}
            {project.organization?.is_verified ? <span className="verified">Verified organization</span> : null}
          </p>

          <DetailFacts
            facts={[
              {
                label: "Budget",
                value: (
                  <>
                    {formatMoney(project.budget_npr)} <span className="text-muted small">total</span>
                  </>
                ),
              },
              {
                label: "Deadline",
                value: (
                  <>
                    {formatDate(project.deadline)}{" "}
                    {expired ? (
                      <span className="badge badge--rose">Passed</span>
                    ) : days !== null && days <= 7 ? (
                      <span className="badge badge--amber">
                        {days} day{days === 1 ? "" : "s"} left
                      </span>
                    ) : (
                      <span className="text-muted small">{deadlineLabel(project.deadline)}</span>
                    )}
                  </>
                ),
              },
              { label: "Duration", value: project.duration },
              { label: "Reference", value: `FRP-${String(project.id).padStart(4, "0")}` },
            ]}
          />
        </div>
      </section>

      <section className="section">
        <div className="container detail-layout">
          <article className="detail-main">
            <div className="detail-block">
              <h2>Project brief</h2>
              <div className="prose">{project.description}</div>
            </div>

            <div className="detail-block">
              <h2>Skills the client is looking for</h2>
              {skills.length > 0 ? (
                <div className="tag-list tag-list--lg">
                  {skills.map((skill) => (
                    <span className="tag" key={skill.id}>
                      {skill.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-muted">The client has not listed specific skills for this project.</p>
              )}
              <p className="small text-muted">
                This is a guide, not a strict checklist. Explain in your proposal how your experience
                covers the work.
              </p>
            </div>

            {canManage ? (
              <section className="manage-panel" id="manage" aria-labelledby="manage-heading">
                <div className="manage-panel__head">
                  <div>
                    <span className="eyebrow">Client tools</span>
                    <h2 id="manage-heading">Manage this project</h2>
                  </div>
                  <span className={`badge ${statusClass}`}>{project.status_label || project.status}</span>
                </div>

                <p className="small text-muted">
                  Project state controls whether freelancers can submit proposals. Only you and site
                  administrators can see the proposals below.
                </p>

                <form className="manage-status-form" onSubmit={saveProjectStatus}>
                  <div className="form-field">
                    <label className="form-label" htmlFor="project_status">
                      Project status
                    </label>
                    <select
                      className="select"
                      id="project_status"
                      value={projectStatus}
                      onChange={(event) => setProjectStatus(event.target.value)}
                    >
                      {PROJECT_STATUSES.map((status) => (
                        <option value={status.value} key={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button className="btn btn--primary" type="submit" disabled={busy}>
                    Save status
                  </button>
                </form>

                <div className="proposal-admin" id="proposals">
                  <div className="proposal-admin__head">
                    <h3>Proposals ({(projectProposals || []).length})</h3>
                    {acceptedProposal ? (
                      <span className="badge badge--green">Accepted: {acceptedProposal.freelancer?.name}</span>
                    ) : null}
                  </div>

                  {(projectProposals || []).length === 0 ? (
                    <div className="empty-state empty-state--compact">
                      <h3>No proposals yet</h3>
                      <p>Freelancers who meet the brief will appear here after they submit.</p>
                    </div>
                  ) : (
                    <div className="proposal-list">
                      {projectProposals.map((proposal) => {
                        const proposalSkills = String(proposal.relevant_skills || "")
                          .split(",")
                          .map((item) => item.trim())
                          .filter(Boolean);
                        const frozen = !["open", "in_progress"].includes(project.status);
                        const otherAccepted =
                          acceptedProposal !== null && acceptedProposal.id !== proposal.id;
                        return (
                          <article
                            className={`proposal-admin-card${proposal.status === "accepted" ? " proposal-admin-card--accepted" : ""}`}
                            key={proposal.id}
                          >
                            <div className="proposal-admin-card__head">
                              <div>
                                <h4>
                                  <Link to={`/talent/${proposal.freelancer?.id}`}>
                                    {proposal.freelancer?.name || "Freelancer"}
                                  </Link>
                                </h4>
                                <p className="small text-muted">Freelancer</p>
                              </div>
                              <span className={`badge ${PROPOSAL_STATUS_CLASSES[proposal.status] || "badge--slate"}`}>
                                {statusLabel(proposal.status)}
                              </span>
                            </div>

                            <dl className="proposal-facts">
                              <div>
                                <dt>Bid</dt>
                                <dd>{formatMoney(proposal.bid_amount)}</dd>
                              </div>
                              <div>
                                <dt>Delivery</dt>
                                <dd>{proposal.delivery_days} days</dd>
                              </div>
                              <div>
                                <dt>Submitted</dt>
                                <dd>{formatDate(proposal.created_at)}</dd>
                              </div>
                            </dl>

                            <div className="proposal-cover">{proposal.cover_letter}</div>

                            {proposalSkills.length > 0 ? (
                              <div className="tag-list">
                                {proposalSkills.map((skill) => (
                                  <span className="tag" key={skill}>
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            ) : null}

                            {proposal.portfolio_url ? (
                              <p className="small">
                                <a href={proposal.portfolio_url} target="_blank" rel="noopener noreferrer">
                                  View portfolio
                                </a>
                              </p>
                            ) : null}

                            {frozen ? (
                              <p className="small text-muted">
                                Proposal statuses are frozen while the project is {project.status_label?.toLowerCase()}.
                              </p>
                            ) : (
                              <form
                                className="proposal-status-form"
                                onSubmit={(event) => {
                                  event.preventDefault();
                                  saveProposalStatus(proposal);
                                }}
                              >
                                <div className="proposal-status-form__row">
                                  <div className="form-field">
                                    <label className="form-label" htmlFor={`proposal-status-${proposal.id}`}>
                                      Change status
                                    </label>
                                    <select
                                      className="select"
                                      id={`proposal-status-${proposal.id}`}
                                      value={proposalDrafts[proposal.id] || proposal.status}
                                      onChange={(event) =>
                                        setProposalDrafts((current) => ({
                                          ...current,
                                          [proposal.id]: event.target.value,
                                        }))
                                      }
                                    >
                                      {OWNER_PROPOSAL_STATUSES.map((status) => (
                                        <option value={status.value} key={status.value}>
                                          {status.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <button className="btn btn--outline" type="submit" disabled={busy}>
                                    Update
                                  </button>
                                </div>
                                {otherAccepted ? (
                                  <p className="small text-muted">
                                    Accepting this proposal declines the currently accepted proposal from{" "}
                                    {acceptedProposal.freelancer?.name}.
                                  </p>
                                ) : null}
                              </form>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            ) : (
              <section className="apply-card" id="proposal" aria-labelledby="proposal-heading">
                <h2 id="proposal-heading">Send a proposal</h2>

                {myProposal ? (
                  <>
                    <div className="notice notice--success">
                      <p>
                        <strong>Your proposal was submitted.</strong> Status:{" "}
                        <span className={`badge ${PROPOSAL_STATUS_CLASSES[myProposal.status] || "badge--slate"}`}>
                          {statusLabel(myProposal.status)}
                        </span>
                      </p>
                      <p className="small">
                        Sent {formatDateTime(myProposal.created_at)}. You bid{" "}
                        {formatMoney(myProposal.bid_amount)} with a {myProposal.delivery_days}-day delivery
                        estimate.
                      </p>
                    </div>
                    <div className="apply-actions">
                      <Link className="btn btn--primary" to="/dashboard/freelancer">
                        Go to my dashboard
                      </Link>
                      <Link className="btn btn--outline" to="/freelance">
                        Find another project
                      </Link>
                      {!["accepted", "withdrawn"].includes(myProposal.status) ? (
                        <button className="btn btn--ghost" type="button" onClick={withdrawProposal} disabled={busy}>
                          Withdraw proposal
                        </button>
                      ) : null}
                    </div>
                  </>
                ) : !isOpen ? (
                  <>
                    <div className="notice notice--warning">
                      <p>
                        <strong>Proposals are closed.</strong>{" "}
                        {expired
                          ? `The deadline was ${formatDate(project.deadline)}.`
                          : `This project is ${String(project.status_label || project.status).toLowerCase()} and is not accepting new proposals.`}
                      </p>
                    </div>
                    <div className="apply-actions">
                      <Link className="btn btn--primary" to="/freelance">
                        Browse open projects
                      </Link>
                    </div>
                  </>
                ) : !user ? (
                  <>
                    <p>
                      Proposals are submitted from freelancer accounts. Log in or create a free freelancer
                      account, then come back to this brief with your bid and delivery time.
                    </p>
                    <div className="apply-actions">
                      <Link className="btn btn--primary" to={`/login?next=/freelance/${project.id}`}>
                        Log in to propose
                      </Link>
                      <Link className="btn btn--outline" to="/register">
                        Create an account
                      </Link>
                    </div>
                  </>
                ) : !isFreelancer ? (
                  <>
                    <div className="notice notice--info">
                      <p>
                        You are signed in as <strong>{user.role.replace("_", " ")}</strong>. Proposals are
                        submitted from freelancer accounts only, so this form is not available to your role.
                      </p>
                    </div>
                    <p className="small text-muted">
                      Job seeker accounts can apply for opportunities and join the talent pool. Freelancer
                      accounts can do that and also bid on projects.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      Offer a clear price and delivery estimate. Your bid is visible only to the client who
                      posted this project, and you can submit one proposal per project.
                    </p>

                    {message ? (
                      <div className="alert alert--error">
                        <span className="alert-icon" aria-hidden="true">
                          !
                        </span>
                        <p>{message}</p>
                      </div>
                    ) : null}

                    <form className="apply-form proposal-form" onSubmit={submitProposal} noValidate>
                      <div className="form-grid">
                        <div className="form-field">
                          <label className="form-label" htmlFor="bid_amount">
                            Your bid in NPR <span className="required">*</span>
                          </label>
                          <input
                            className={`input${fieldError(fieldErrors, "bid_amount") ? " is-invalid" : ""}`}
                            type="number"
                            id="bid_amount"
                            value={form.bid_amount}
                            onChange={(event) => setForm((current) => ({ ...current, bid_amount: event.target.value }))}
                            min={1}
                            max={99999999}
                            step="0.01"
                            inputMode="decimal"
                            required
                          />
                          <p className="help-text">
                            The client&apos;s budget is {formatMoney(project.budget_npr)}. A bid may differ
                            from it.
                          </p>
                          {fieldError(fieldErrors, "bid_amount") ? (
                            <p className="field-error">{fieldError(fieldErrors, "bid_amount")}</p>
                          ) : null}
                        </div>

                        <div className="form-field">
                          <label className="form-label" htmlFor="delivery_days">
                            Delivery time in days <span className="required">*</span>
                          </label>
                          <input
                            className={`input${fieldError(fieldErrors, "delivery_days") ? " is-invalid" : ""}`}
                            type="number"
                            id="delivery_days"
                            value={form.delivery_days}
                            onChange={(event) =>
                              setForm((current) => ({ ...current, delivery_days: event.target.value }))
                            }
                            min={1}
                            max={365}
                            step={1}
                            inputMode="numeric"
                            required
                          />
                          <p className="help-text">A whole number from 1 to 365 days.</p>
                          {fieldError(fieldErrors, "delivery_days") ? (
                            <p className="field-error">{fieldError(fieldErrors, "delivery_days")}</p>
                          ) : null}
                        </div>

                        <div className="form-field form-field--full">
                          <label className="form-label" htmlFor="relevant_skills">
                            Relevant skills <span className="required">*</span>
                          </label>
                          <input
                            className={`input${fieldError(fieldErrors, "relevant_skills") ? " is-invalid" : ""}`}
                            type="text"
                            id="relevant_skills"
                            value={form.relevant_skills}
                            onChange={(event) =>
                              setForm((current) => ({ ...current, relevant_skills: event.target.value }))
                            }
                            maxLength={255}
                            placeholder="Graphic Design, Data Visualization"
                            required
                          />
                          <p className="help-text">
                            Separate skills with commas. Up to 8 skills, 255 characters in total.
                          </p>
                          {fieldError(fieldErrors, "relevant_skills") ? (
                            <p className="field-error">{fieldError(fieldErrors, "relevant_skills")}</p>
                          ) : null}
                        </div>

                        <div className="form-field form-field--full">
                          <label className="form-label" htmlFor="cover_letter">
                            Cover letter <span className="required">*</span>
                          </label>
                          <textarea
                            className={`textarea${fieldError(fieldErrors, "cover_letter") ? " is-invalid" : ""}`}
                            id="cover_letter"
                            rows={7}
                            maxLength={2000}
                            value={form.cover_letter}
                            onChange={(event) =>
                              setForm((current) => ({ ...current, cover_letter: event.target.value }))
                            }
                            required
                          />
                          <p className="help-text">
                            Between 20 and 2,000 characters. Explain your approach, relevant experience, and
                            what you will deliver. Plain text only.
                          </p>
                          {fieldError(fieldErrors, "cover_letter") ? (
                            <p className="field-error">{fieldError(fieldErrors, "cover_letter")}</p>
                          ) : null}
                        </div>

                        <div className="form-field form-field--full">
                          <label className="form-label" htmlFor="portfolio_url">
                            Portfolio URL <span className="text-muted small">(optional)</span>
                          </label>
                          <input
                            className={`input${fieldError(fieldErrors, "portfolio_url") ? " is-invalid" : ""}`}
                            type="url"
                            id="portfolio_url"
                            value={form.portfolio_url}
                            onChange={(event) =>
                              setForm((current) => ({ ...current, portfolio_url: event.target.value }))
                            }
                            maxLength={255}
                            placeholder="https://example.com/your-work"
                          />
                          <p className="help-text">An http or https link to work samples.</p>
                          {fieldError(fieldErrors, "portfolio_url") ? (
                            <p className="field-error">{fieldError(fieldErrors, "portfolio_url")}</p>
                          ) : null}
                        </div>
                      </div>

                      <div className="apply-actions">
                        <button className="btn btn--primary btn--lg" type="submit" disabled={submitting}>
                          {submitting ? "Submitting…" : "Submit proposal"}
                        </button>
                        <Link className="btn btn--ghost" to="/freelance">
                          Keep browsing
                        </Link>
                      </div>
                    </form>

                    <p className="small text-muted apply-note">
                      Your proposal appears in your dashboard and in the client&apos;s proposal list. You
                      are notified when the status changes, and payments are arranged directly with the
                      client.
                    </p>
                  </>
                )}
              </section>
            )}
          </article>

          <aside className="detail-side">
            <div className="card">
              <div className="card-body">
                <h2 className="side-heading">At a glance</h2>
                <dl className="side-list">
                  <div>
                    <dt>Budget</dt>
                    <dd>{formatMoney(project.budget_npr)}</dd>
                  </div>
                  <div>
                    <dt>Duration</dt>
                    <dd>{project.duration}</dd>
                  </div>
                  <div>
                    <dt>Deadline</dt>
                    <dd>{formatDate(project.deadline)}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{project.status_label || project.status}</dd>
                  </div>
                  <div>
                    <dt>Proposals</dt>
                    <dd>
                      {canManage ? `${(projectProposals || []).length} received` : "Visible to the client only"}
                    </dd>
                  </div>
                  <div>
                    <dt>Posted</dt>
                    <dd>{formatDate(project.created_at)}</dd>
                  </div>
                </dl>

                {isOpen && !user ? (
                  <Link className="btn btn--primary btn--block side-action" to={`/login?next=/freelance/${project.id}`}>
                    Log in to propose
                  </Link>
                ) : isOpen && isFreelancer && !myProposal ? (
                  <a className="btn btn--primary btn--block side-action" href="#proposal">
                    Write a proposal
                  </a>
                ) : null}
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <h2 className="side-heading">Client</h2>
                <p className="side-org-name">
                  {clientLabel}
                  {project.organization?.is_verified ? <span className="verified">Verified</span> : null}
                </p>
                <dl className="side-list side-list--compact">
                  <div>
                    <dt>Posted by</dt>
                    <dd>{project.client?.name || "Independent client"}</dd>
                  </div>
                  <div>
                    <dt>Account type</dt>
                    <dd>{project.client?.role?.replace("_", " ") || "Client"}</dd>
                  </div>
                  {project.organization?.location ? (
                    <div>
                      <dt>Based in</dt>
                      <dd>{project.organization.location}</dd>
                    </div>
                  ) : null}
                </dl>

                {project.organization?.description ? (
                  <p className="small side-copy">{truncate(project.organization.description, 260)}</p>
                ) : null}

                {project.organization?.website ? (
                  <p className="small">
                    <a href={project.organization.website} target="_blank" rel="noopener noreferrer">
                      Visit website
                    </a>
                  </p>
                ) : null}

                <p className="small text-muted side-copy">
                  Contact details are shared by the client after a proposal is accepted. Public pages never
                  expose private email addresses or phone numbers.
                </p>
              </div>
            </div>

            {canManage ? (
              <div className="card manage-shortcut">
                <div className="card-body">
                  <h2 className="side-heading">Client shortcuts</h2>
                  <p className="small text-muted">
                    Review bids and change the project state from the management panel.
                  </p>
                  <a className="btn btn--outline btn--block" href="#manage">
                    Open client tools
                  </a>
                </div>
              </div>
            ) : isOpen ? (
              <div className="card">
                <div className="card-body">
                  <h2 className="side-heading">How proposals work</h2>
                  <ul className="feature-list feature-list--compact">
                    <li>Send one proposal per project.</li>
                    <li>The client compares bids privately.</li>
                    <li>You are notified when the status changes.</li>
                    <li>Payment and contract terms are agreed directly with the client.</li>
                  </ul>
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </section>

      {otherRelated.length > 0 ? (
        <section className="section section--muted">
          <div className="container">
            <div className="section-head">
              <div className="section-head__text">
                <span className="eyebrow">More projects</span>
                <h2>Other freelance briefs</h2>
              </div>
              <Link className="section-link" to="/freelance">
                All freelance projects
              </Link>
            </div>
            <div className="opportunity-grid opportunity-grid--two">
              {otherRelated.slice(0, 3).map((item) => (
                <FreelanceCard key={item.id} project={item} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
