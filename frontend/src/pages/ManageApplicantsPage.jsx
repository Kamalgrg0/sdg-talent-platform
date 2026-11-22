import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { ErrorNotice } from "../components/ErrorNotice";
import { Loading } from "../components/Loading";
import { MessageButton } from "../components/MessageButton";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { api } from "../lib/api";
import {
  APPLICATION_STATUS_CLASSES,
  APPLICATION_STATUSES,
  EMPLOYER_APPLICATION_STATUSES,
  formatDateTime,
  roleLabel,
} from "../lib/format";

export default function ManageApplicantsPage() {
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const toast = useToast();
  const [opportunity, setOpportunity] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [drafts, setDrafts] = useState({});

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [opportunityData, applicationData] = await Promise.all([
        api.get(`/api/opportunities/${id}/`),
        api.get(`/api/opportunities/${id}/applicants/`, { per_page: 50 }),
      ]);
      setOpportunity(opportunityData);
      const rows = Array.isArray(applicationData)
        ? applicationData
        : applicationData?.results || [];
      setApplications(rows);
      setDrafts(Object.fromEntries(rows.map((item) => [item.id, item.status])));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function updateStatus(application) {
    const nextStatus = drafts[application.id];
    if (!nextStatus || nextStatus === application.status) return;
    setBusyId(application.id);
    try {
      const updated = await api.patch(
        `/api/opportunities/applications/${application.id}/status/`,
        { status: nextStatus }
      );
      setApplications((current) =>
        current.map((item) =>
          item.id === application.id ? { ...item, status: updated.status } : item
        )
      );
      toast.success(
        nextStatus === "offered"
          ? `Offer sent to ${application.user?.name || "the applicant"}. They can accept or decline from their dashboard.`
          : "Application status updated."
      );
      await load();
    } catch (err) {
      toast.error(err.message);
      setDrafts((current) => ({ ...current, [application.id]: application.status }));
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <Loading label="Loading applicants…" large />;
  if (error) {
    return (
      <div className="container section">
        <ErrorNotice message={error.message} onRetry={load} />
      </div>
    );
  }
  if (!opportunity) return null;

  const isOwner =
    isAdmin || (user && opportunity.created_by?.id === user.id && user.id === opportunity.created_by.id);
  if (!isOwner) {
    return (
      <div className="container section">
        <ErrorNotice
          title="Not allowed"
          message="Only the account that published this opportunity can review its applicants."
        />
        <Link className="btn btn--outline" to="/dashboard">Back to dashboard</Link>
      </div>
    );
  }

  const counts = Object.fromEntries(APPLICATION_STATUSES.map((status) => [status.value, 0]));
  applications.forEach((application) => {
    if (counts[application.status] !== undefined) counts[application.status] += 1;
  });

  return (
    <>
      <PageHeader
        eyebrow={opportunity.organization?.name || "Your organization"}
        title={`Applicants: ${opportunity.title}`}
        lead={`${applications.length} application${applications.length === 1 ? "" : "s"} received. Move each applicant through reviewing and shortlisting, then send a formal offer. The candidate accepts or declines, and you are notified when they respond.`}
        actions={
          <>
            <Link className="btn btn--primary" to={`/opportunities/${opportunity.id}`}>
              View public opportunity
            </Link>
            <Link className="btn btn--outline" to="/dashboard">Back to dashboard</Link>
          </>
        }
      />

      <section className="section section--tight">
        <div className="container dashboard-stack">
          <div className="card">
            <div className="card-body">
              <div className="dashboard-card-head">
                <div>
                  <span className="eyebrow">Applicant pipeline</span>
                  <h2 className="dashboard-card-title">Applications ({applications.length})</h2>
                </div>
                <p className="small text-muted">
                  {counts.offered || 0} offers sent · {counts.accepted || 0} accepted ·{" "}
                  {counts.shortlisted || 0} shortlisted · {counts.reviewing || 0} reviewing
                </p>
              </div>

              <div className="applicant-summary">
                {APPLICATION_STATUSES.map((status) => (
                  <span
                    key={status.value}
                    className={`badge ${APPLICATION_STATUS_CLASSES[status.value] || "badge--slate"}`}
                  >
                    {status.label}: {counts[status.value] || 0}
                  </span>
                ))}
              </div>

              {applications.length === 0 ? (
                <EmptyState
                  compact
                  icon="?"
                  title="No applications yet"
                  text="Applications appear here as soon as job seekers or freelancers submit them. Share the public opportunity link to invite more people to apply."
                  action={
                    <Link className="btn btn--outline" to={`/opportunities/${opportunity.id}`}>
                      Open the opportunity page
                    </Link>
                  }
                />
              ) : (
                <div className="proposal-list">
                  {applications.map((application) => (
                    <article
                      className={`proposal-admin-card${
                        ["hired", "accepted"].includes(application.status)
                          ? " proposal-admin-card--accepted"
                          : ""
                      }`}
                      key={application.id}
                    >
                      <div className="proposal-admin-card__head">
                        <div>
                          <h4>
                            {application.profile_id ? (
                              <Link to={`/talent/${application.profile_id}`}>
                                {application.user?.name || "Applicant"}
                              </Link>
                            ) : (
                              application.user?.name || "Applicant"
                            )}
                          </h4>
                          <p className="small text-muted">
                            {application.user?.role ? roleLabel(application.user.role) : "Talent"}
                          </p>
                        </div>
                        <span
                          className={`badge ${
                            APPLICATION_STATUS_CLASSES[application.status] || "badge--slate"
                          }`}
                        >
                          {APPLICATION_STATUSES.find((item) => item.value === application.status)?.label ||
                            application.status}
                        </span>
                      </div>

                      <div className="apply-actions">
                        <MessageButton
                          userId={application.user?.id}
                          subject={`${opportunity.title} application`}
                          label="Message applicant"
                        />
                        {application.profile_id ? (
                          <Link className="btn btn--ghost btn--sm" to={`/talent/${application.profile_id}`}>
                            View profile
                          </Link>
                        ) : null}
                      </div>

                      <dl className="proposal-facts">
                        <div>
                          <dt>Applied</dt>
                          <dd>{formatDateTime(application.created_at)}</dd>
                        </div>
                        <div>
                          <dt>Profile</dt>
                          <dd>
                            {application.profile_id ? (
                              <Link to={`/talent/${application.profile_id}`}>View talent profile</Link>
                            ) : (
                              "No public profile"
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt>Opportunity</dt>
                          <dd>{application.opportunity_title}</dd>
                        </div>
                      </dl>

                      <div className="proposal-cover" style={{ whiteSpace: "pre-wrap" }}>
                        {application.cover_letter}
                      </div>

                      <form
                        className="proposal-status-form"
                        onSubmit={(event) => {
                          event.preventDefault();
                          updateStatus(application);
                        }}
                      >
                        <div className="proposal-status-form__row">
                          <div className="form-field">
                            <label className="form-label" htmlFor={`application-status-${application.id}`}>
                              Change status
                            </label>
                            <select
                              className="select"
                              id={`application-status-${application.id}`}
                              value={drafts[application.id] ?? application.status}
                              onChange={(event) =>
                                setDrafts((current) => ({
                                  ...current,
                                  [application.id]: event.target.value,
                                }))
                              }
                            >
                              {!EMPLOYER_APPLICATION_STATUSES.some(
                                (status) => status.value === application.status
                              ) ? (
                                <option value={application.status} disabled>
                                  {APPLICATION_STATUSES.find(
                                    (status) => status.value === application.status
                                  )?.label || application.status}
                                </option>
                              ) : null}
                              {EMPLOYER_APPLICATION_STATUSES.map((status) => (
                                <option key={status.value} value={status.value}>
                                  {status.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <button
                            className="btn btn--primary"
                            type="submit"
                            disabled={busyId === application.id}
                          >
                            {busyId === application.id ? "Updating…" : "Update status"}
                          </button>
                        </div>
                        <p className="small text-muted">
                          Choosing <strong>Offer sent</strong> asks the candidate to accept or decline. You
                          are notified and emailed as soon as they respond.
                        </p>
                      </form>
                    </article>
                  ))}
                </div>
              )}

              <p className="small text-muted dashboard-footnote">
                Public profiles never show email addresses or phone numbers. Contact happens through
                the platform or the channels talent chooses to share.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
