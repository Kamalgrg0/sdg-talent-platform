import { useState } from "react";
import { Link } from "react-router-dom";
import { Avatar } from "../components/Avatar";
import { DeleteOpportunityButton } from "../components/DeleteOpportunityButton";
import { EmptyState } from "../components/EmptyState";
import { ErrorNotice } from "../components/ErrorNotice";
import { Loading } from "../components/Loading";
import { MessageButton } from "../components/MessageButton";
import { OpportunityCard } from "../components/OpportunityCard";
import { PageHeader } from "../components/PageHeader";
import { ProfileCompleteness } from "../components/ProfileCompleteness";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { api } from "../lib/api";
import {
  APPLICATION_STATUS_CLASSES,
  APPLICATION_STATUSES,
  INVITATION_STATUS_CLASSES,
  PROPOSAL_STATUS_CLASSES,
  PROPOSAL_STATUSES,
  availabilityLabel,
  formatDate,
  formatDateTime,
  formatMoney,
  roleLabel,
} from "../lib/format";
import { useApi } from "../lib/useApi";

const FREELANCE_STATUS_LABELS = {
  open: "Open",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const TALENT_PROJECT_STATUS_LABELS = {
  open: "Open",
  closed: "Closed",
  draft: "Draft",
};

function statusBadge(status, classes) {
  return <span className={`badge ${classes[status] || "badge--slate"}`}>{status}</span>;
}

function InvitationsPanel({ invitations, onUpdate, busyId }) {
  const { user } = useAuth();
  if (!invitations || invitations.length === 0) return null;
  const pending = invitations.filter((item) => item.status === "sent");

  return (
    <div className="card">
      <div className="card-body">
        <div className="dashboard-card-head">
          <div>
            <span className="eyebrow">Invitations</span>
            <h2 className="dashboard-card-title">
              Invitations ({invitations.length})
            </h2>
          </div>
          <p className="small text-muted">
            {pending.length} awaiting your reply
          </p>
        </div>

        <div className="notification-list">
          {invitations.map((invitation) => (
            <div className="notification-item" key={invitation.id}>
              <div className="notification-item__body">
                <p className="notification-item__title">
                  {invitation.organization?.name || invitation.sender?.name || "Organization"}{" "}
                  invited you
                  {invitation.target_title ? (
                    <>
                      {" "}to <strong>{invitation.target_title}</strong>
                    </>
                  ) : null}
                </p>
                <p className="notification-item__message">{invitation.message}</p>
                <p className="notification-item__meta">
                  {formatDateTime(invitation.created_at)} ·{" "}
                  <span className={`badge ${INVITATION_STATUS_CLASSES[invitation.status] || "badge--slate"}`}>
                    {invitation.status}
                  </span>
                </p>
                {invitation.status === "sent" ? (
                  <div className="apply-actions">
                    <button
                      className="btn btn--primary btn--sm"
                      type="button"
                      onClick={() => onUpdate(invitation.id, "accepted")}
                      disabled={busyId === invitation.id}
                    >
                      Accept
                    </button>
                    <button
                      className="btn btn--outline btn--sm"
                      type="button"
                      onClick={() => onUpdate(invitation.id, "declined")}
                      disabled={busyId === invitation.id}
                    >
                      Decline
                    </button>
                  </div>
                ) : null}
                {invitation.sender?.id && invitation.sender.id !== user?.id ? (
                  <div className="apply-actions">
                    <MessageButton
                      userId={invitation.sender.id}
                      subject={
                        invitation.target_title
                          ? `Invitation: ${invitation.target_title}`
                          : "About your invitation"
                      }
                      label="Message sender"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TalentDashboard({ dashboard, role }) {
  const toast = useToast();
  const isFreelancer = role === "freelancer";
  const applications = useApi("/api/opportunities/applications/mine/");
  const saved = useApi("/api/opportunities/saved/mine/");
  const proposals = useApi(isFreelancer ? "/api/freelance/proposals/mine/" : null);
  const [busyId, setBusyId] = useState(null);
  const [respondingId, setRespondingId] = useState(null);

  const applicationRows = Array.isArray(applications.data) ? applications.data : [];
  const savedRows = Array.isArray(saved.data) ? saved.data : [];
  const proposalRows = Array.isArray(proposals.data) ? proposals.data : [];

  const openOffers = applicationRows.filter((item) => item.status === "offered");
  const activeApplications = applicationRows.filter((item) =>
    ["submitted", "reviewing", "shortlisted", "offered"].includes(item.status)
  );
  const hiredApplications = applicationRows.filter((item) =>
    ["hired", "accepted"].includes(item.status)
  );
  const activeProposals = proposalRows.filter((item) =>
    ["submitted", "shortlisted"].includes(item.status)
  );
  const acceptedProposals = proposalRows.filter((item) => item.status === "accepted");

  const profile = dashboard.profile;
  const completeness = dashboard.completeness || { percent: 0, missing: [] };
  const invitations = dashboard.invitations || [];
  const recommended = dashboard.recommended || [];

  async function updateInvitation(id, status) {
    setBusyId(id);
    try {
      await api.patch(`/api/opportunities/invitations/${id}/status/`, { status });
      toast.success(status === "accepted" ? "Invitation accepted." : "Invitation declined.");
      window.location.reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function respondToOffer(application, action) {
    setRespondingId(application.id);
    try {
      await api.post(`/api/opportunities/applications/${application.id}/respond/`, { action });
      toast.success(
        action === "accept"
          ? `You accepted the offer for ${application.opportunity_title}.`
          : `You declined the offer for ${application.opportunity_title}.`
      );
      await applications.reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRespondingId(null);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={isFreelancer ? "Freelance workspace" : "Job seeker workspace"}
        title={`Welcome, ${dashboard.user?.name || "there"}`}
        lead={
          isFreelancer
            ? "Track every proposal you send, see which projects are still deciding, and keep your profile ready for the next brief. Hiring decisions also appear in your notifications."
            : "Follow every application, respond to offers, and keep your profile ready for the next opportunity."
        }
        actions={
          <>
            <Link className="btn btn--primary" to={isFreelancer ? "/freelance" : "/opportunities"}>
              {isFreelancer ? "Find freelance work" : "Browse opportunities"}
            </Link>
            <Link className="btn btn--outline" to="/dashboard/profile">
              Edit your profile
            </Link>
            <Link className="btn btn--ghost" to="/notifications">
              Notifications
              {dashboard.unread_notifications > 0 ? ` (${dashboard.unread_notifications})` : ""}
            </Link>
          </>
        }
      />

      <section className="section section--tight">
        <div className="container dashboard-stack">
          <div className="hero-stats">
            <div className="stat-card">
              <span className="stat-value">{applicationRows.length}</span>
              <span className="stat-label">Applications sent</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{activeApplications.length}</span>
              <span className="stat-label">Awaiting a decision</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{hiredApplications.length}</span>
              <span className="stat-label">Hired</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{completeness.percent || 0}%</span>
              <span className="stat-label">Profile complete</span>
            </div>
          </div>

          {openOffers.length > 0 ? (
            <div className="notice notice--success">
              <p>
                <strong>
                  You have {openOffers.length} open offer{openOffers.length === 1 ? "" : "s"}.
                </strong>{" "}
                Review each one and accept or decline it from the applications table below.
              </p>
            </div>
          ) : null}

          {isFreelancer ? (
            <div className="card">
              <div className="card-body">
                <div className="dashboard-card-head">
                  <div>
                    <span className="eyebrow">Private to you</span>
                    <h2 className="dashboard-card-title">
                      Your proposals ({proposalRows.length})
                    </h2>
                  </div>
                  <p className="small text-muted">
                    {activeProposals.length} awaiting a decision · {acceptedProposals.length} accepted
                  </p>
                </div>

                {acceptedProposals.length > 0 ? (
                  <div className="notice notice--success">
                    <p>
                      <strong>
                        You have been hired for {acceptedProposals.length} project
                        {acceptedProposals.length === 1 ? "" : "s"}!
                      </strong>
                    </p>
                    <p className="small">
                      {acceptedProposals.map((item) => item.project_title).join(", ")}.
                    </p>
                  </div>
                ) : null}

                {proposals.loading ? (
                  <Loading label="Loading proposals…" />
                ) : proposals.error ? (
                  <ErrorNotice message={proposals.error.message} />
                ) : proposalRows.length === 0 ? (
                  <EmptyState
                    compact
                    icon="?"
                    title="No proposals yet"
                    text="Browse the freelance board for a project that fits your skills, then send a bid with a clear delivery estimate."
                    action={<Link className="btn btn--primary" to="/freelance">Browse projects</Link>}
                  />
                ) : (
                  <div className="table-wrap dashboard-table">
                    <table className="data-table">
                      <caption className="sr-only">Your freelance proposals</caption>
                      <thead>
                        <tr>
                          <th scope="col">Project</th>
                          <th scope="col">Bid</th>
                          <th scope="col">Delivery</th>
                          <th scope="col">Sent</th>
                          <th scope="col">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {proposalRows.map((proposal) => (
                          <tr key={proposal.id}>
                            <td>
                              <Link to={`/freelance/${proposal.project_id}`}>
                                {proposal.project_title}
                              </Link>
                            </td>
                            <td>{formatMoney(proposal.bid_amount)}</td>
                            <td>{proposal.delivery_days} days</td>
                            <td>{formatDate(proposal.created_at)}</td>
                            <td>
                              <span className={`badge ${PROPOSAL_STATUS_CLASSES[proposal.status] || "badge--slate"}`}>
                                {PROPOSAL_STATUSES.find((item) => item.value === proposal.status)?.label ||
                                  proposal.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <p className="small text-muted dashboard-footnote">
                  An accepted proposal is shown here and on the project page. Payment and contracts are
                  arranged directly with the client.
                </p>
              </div>
            </div>
          ) : null}

          <div className="card">
            <div className="card-body">
              <div className="dashboard-card-head">
                <div>
                  <span className="eyebrow">Opportunities</span>
                  <h2 className="dashboard-card-title">
                    Your applications ({applicationRows.length})
                  </h2>
                </div>
                <p className="small text-muted">
                  {activeApplications.length} active · {hiredApplications.length} hired
                </p>
              </div>

              {applications.loading ? (
                <Loading label="Loading applications…" />
              ) : applications.error ? (
                <ErrorNotice message={applications.error.message} />
              ) : applicationRows.length === 0 ? (
                <EmptyState
                  compact
                  icon="?"
                  title="No applications yet"
                  text="Browse the opportunities board and send your first application."
                  action={<Link className="btn btn--primary" to="/opportunities">Browse opportunities</Link>}
                />
              ) : (
                <div className="table-wrap dashboard-table">
                  <table className="data-table">
                    <caption className="sr-only">Your applications</caption>
                    <thead>
                      <tr>
                        <th scope="col">Opportunity</th>
                        <th scope="col">Applied</th>
                        <th scope="col">Status</th>
                        <th scope="col">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {applicationRows.map((application) => (
                        <tr key={application.id}>
                          <td>
                            <Link to={`/opportunities/${application.opportunity}`}>
                              {application.opportunity_title}
                            </Link>
                          </td>
                          <td>{formatDate(application.created_at)}</td>
                          <td>
                            <span className={`badge ${APPLICATION_STATUS_CLASSES[application.status] || "badge--slate"}`}>
                              {APPLICATION_STATUSES.find((item) => item.value === application.status)?.label ||
                                application.status}
                            </span>
                          </td>
                          <td>
                            {application.status === "offered" ? (
                              <div className="apply-actions">
                                <button
                                  className="btn btn--primary btn--sm"
                                  type="button"
                                  onClick={() => respondToOffer(application, "accept")}
                                  disabled={respondingId === application.id}
                                >
                                  Accept
                                </button>
                                <button
                                  className="btn btn--outline btn--sm"
                                  type="button"
                                  onClick={() => respondToOffer(application, "decline")}
                                  disabled={respondingId === application.id}
                                >
                                  Decline
                                </button>
                              </div>
                            ) : (
                              <span className="text-muted small">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <InvitationsPanel invitations={invitations} onUpdate={updateInvitation} busyId={busyId} />

          <div className="dashboard-layout">
            <div className="card">
              <div className="card-body">
                <h2 className="dashboard-card-title">Your account</h2>
                <div className="account-row">
                  <Avatar name={dashboard.user?.name} size="lg" />
                  <div>
                    <p className="account-name-lg">{dashboard.user?.name}</p>
                    <p className="text-muted small">{dashboard.user?.email}</p>
                    <p className="account-badges">
                      <span className="badge badge--blue">{roleLabel(dashboard.user?.role)}</span>
                      <span className="badge badge--green">Active</span>
                    </p>
                  </div>
                </div>
                <dl className="account-list">
                  <div>
                    <dt>Member since</dt>
                    <dd>{formatDate(dashboard.user?.created_at)}</dd>
                  </div>
                  <div>
                    <dt>Account type</dt>
                    <dd>{roleLabel(dashboard.user?.role)}</dd>
                  </div>
                  <div>
                    <dt>{isFreelancer ? "Proposals sent" : "Applications sent"}</dt>
                    <dd>{isFreelancer ? proposalRows.length : applicationRows.length}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <h2 className="dashboard-card-title">Your talent profile</h2>
                {!profile ? (
                  <>
                    <span className="badge badge--amber">Not created</span>
                    <p className="small text-muted">
                      A public profile helps organisations understand your skills before they read
                      your application or proposal.
                    </p>
                    <Link className="btn btn--primary" to="/dashboard/profile">
                      Create your profile
                    </Link>
                  </>
                ) : (
                  <>
                    <span className={`badge ${profile.is_public ? "badge--green" : "badge--slate"}`}>
                      {profile.is_public ? "Public" : "Private"}
                    </span>
                    <p className="small text-muted">
                      {profile.professional_title || "Profile without a professional title"}
                      {profile.location ? ` · ${profile.location}` : ""}
                      {profile.availability ? ` · ${availabilityLabel(profile.availability)}` : ""}
                    </p>
                    <ProfileCompleteness completeness={completeness} />
                    <div className="apply-actions">
                      {profile.is_public ? (
                        <Link className="btn btn--outline" to={`/talent/${profile.id}`}>
                          View your public profile
                        </Link>
                      ) : null}
                      <Link className="btn btn--ghost" to="/dashboard/profile">Edit profile</Link>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {savedRows.length > 0 ? (
            <div className="card">
              <div className="card-body">
                <div className="dashboard-card-head">
                  <h2 className="dashboard-card-title">Saved opportunities ({savedRows.length})</h2>
                  <Link className="link-arrow" to="/opportunities">Browse more</Link>
                </div>
                <div className="opportunity-grid opportunity-grid--two">
                  {savedRows.map((item) => (
                    <OpportunityCard key={item.id} opportunity={item} />
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {recommended.length > 0 ? (
            <div className="card">
              <div className="card-body">
                <div className="dashboard-card-head">
                  <div>
                    <span className="eyebrow">Recommended</span>
                    <h2 className="dashboard-card-title">Matches for your skills and goals</h2>
                  </div>
                  <Link className="link-arrow" to="/skills">Explore skills</Link>
                </div>
                <div className="opportunity-grid opportunity-grid--two">
                  {recommended.map((item) => (
                    <OpportunityCard key={item.id} opportunity={item} />
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          <div className="card">
            <div className="card-body">
              <h2 className="dashboard-card-title">Notifications</h2>
              {dashboard.unread_notifications > 0 ? (
                <span className="badge badge--amber">{dashboard.unread_notifications} unread</span>
              ) : (
                <span className="badge badge--green">All read</span>
              )}
              <p className="small text-muted">
                Application and proposal updates appear in your private inbox and are also emailed
                to your account address.
              </p>
              <Link className="btn btn--primary" to="/notifications">Open notifications</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function EmployerDashboard({ dashboard, reload }) {
  const organization = dashboard.organization;
  const counts = dashboard.counts || {};
  const opportunities = dashboard.opportunities || [];
  const invitations = dashboard.invitations || [];
  const talentProjects = dashboard.talent_projects || [];
  const freelanceProjects = dashboard.freelance_projects || [];
  const isAdmin = dashboard.role === "admin";

  return (
    <>
      <PageHeader
        eyebrow={isAdmin ? "Administrator workspace" : `${roleLabel(dashboard.role)} workspace`}
        title={`Welcome, ${dashboard.user?.name || "there"}`}
        lead="Review applications for your opportunities, send offers, track who accepted, and respond to proposals on your freelance projects."
        actions={
          <>
            <Link className="btn btn--primary" to="/dashboard/opportunities/new">
              Post an opportunity
            </Link>
            <Link className="btn btn--outline" to="/dashboard/freelance/new">
              Post a freelance project
            </Link>
            <Link className="btn btn--ghost" to="/dashboard/organization-profile">
              Organization profile
            </Link>
          </>
        }
      />

      <section className="section section--tight">
        <div className="container dashboard-stack">
          <div className="hero-stats">
            <div className="stat-card">
              <span className="stat-value">{counts.opportunities || 0}</span>
              <span className="stat-label">Opportunities</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{counts.applicants || 0}</span>
              <span className="stat-label">Applicants</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{counts.offers_accepted || 0}</span>
              <span className="stat-label">Offers accepted</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{counts.proposals || 0}</span>
              <span className="stat-label">Proposals received</span>
            </div>
          </div>

          <div className="dashboard-layout">
            <div className="card">
              <div className="card-body">
                <div className="dashboard-card-head">
                  <h2 className="dashboard-card-title">Organization</h2>
                  <Link className="link-arrow" to="/dashboard/organization-profile">Edit</Link>
                </div>
                {organization ? (
                  <>
                    <div className="account-row">
                      <Avatar name={organization.name} size="lg" />
                      <div>
                        <p className="account-name-lg">{organization.name}</p>
                        <p className="text-muted small">{organization.location || "Location not set"}</p>
                        <p className="account-badges">
                          <span className={`badge ${organization.is_verified ? "badge--green" : "badge--slate"}`}>
                            {organization.is_verified ? "Verified" : "Unverified"}
                          </span>
                        </p>
                      </div>
                    </div>
                    {organization.description ? (
                      <p className="small text-muted">{organization.description}</p>
                    ) : null}
                    <Link className="btn btn--outline" to="/dashboard/opportunities/new">
                      Post an opportunity
                    </Link>
                  </>
                ) : (
                  <EmptyState
                    compact
                    icon="?"
                    title="No organization profile"
                    text="Add your organization details before posting opportunities."
                    action={<Link className="btn btn--primary" to="/dashboard/organization-profile">Create profile</Link>}
                  />
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <h2 className="dashboard-card-title">Hiring at a glance</h2>
                <dl className="account-list">
                  <div>
                    <dt>Open opportunities</dt>
                    <dd>{opportunities.filter((item) => item.status === "open").length}</dd>
                  </div>
                  <div>
                    <dt>Applications received</dt>
                    <dd>{counts.applicants || 0}</dd>
                  </div>
                  <div>
                    <dt>Invitations sent</dt>
                    <dd>{counts.invitations || 0}</dd>
                  </div>
                  <div>
                    <dt>Offers sent</dt>
                    <dd>{counts.offers_sent || 0}</dd>
                  </div>
                  <div>
                    <dt>Offers accepted</dt>
                    <dd>{counts.offers_accepted || 0}</dd>
                  </div>
                  <div>
                    <dt>Offers declined</dt>
                    <dd>{counts.offers_declined || 0}</dd>
                  </div>
                  <div>
                    <dt>Freelance projects</dt>
                    <dd>{counts.freelance_projects || 0}</dd>
                  </div>
                </dl>
                <Link className="btn btn--ghost" to="/notifications">
                  Notifications
                  {dashboard.unread_notifications > 0 ? ` (${dashboard.unread_notifications})` : ""}
                </Link>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="dashboard-card-head">
                <div>
                  <span className="eyebrow">Opportunities</span>
                  <h2 className="dashboard-card-title">Your opportunities ({opportunities.length})</h2>
                </div>
                <Link className="link-arrow" to="/dashboard/opportunities/new">Post a new role</Link>
              </div>

              {opportunities.length === 0 ? (
                <EmptyState
                  compact
                  icon="?"
                  title="No opportunities yet"
                  text="Publish a role to start receiving applications."
                  action={<Link className="btn btn--primary" to="/dashboard/opportunities/new">Post an opportunity</Link>}
                />
              ) : (
                <div className="table-wrap dashboard-table">
                  <table className="data-table">
                    <caption className="sr-only">Your opportunities</caption>
                    <thead>
                      <tr>
                        <th scope="col">Opportunity</th>
                        <th scope="col">Status</th>
                        <th scope="col">Deadline</th>
                        <th scope="col">Applicants</th>
                        <th scope="col">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {opportunities.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <Link to={`/opportunities/${item.id}`}>{item.title}</Link>
                            <span className="table-subtext">{item.type_label || item.type}</span>
                          </td>
                          <td>
                            <span
                              className={`badge ${
                                item.status === "open"
                                  ? "badge--green"
                                  : item.status === "draft"
                                  ? "badge--amber"
                                  : "badge--slate"
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td>{formatDate(item.deadline)}</td>
                          <td>{item.applicant_count || 0}</td>
                          <td>
                            <div className="apply-actions">
                              <Link className="btn btn--outline btn--sm" to={`/dashboard/manage-applicants/${item.id}`}>
                                Review
                              </Link>
                              <Link className="btn btn--ghost btn--sm" to={`/dashboard/opportunities/${item.id}/edit`}>
                                Edit
                              </Link>
                              <DeleteOpportunityButton
                                opportunityId={item.id}
                                opportunityTitle={item.title}
                                onDeleted={reload}
                                label="Delete"
                                className="btn btn--danger btn--sm"
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="dashboard-card-head">
                <div>
                  <span className="eyebrow">Freelance projects</span>
                  <h2 className="dashboard-card-title">Freelance projects ({freelanceProjects.length})</h2>
                </div>
                <Link className="link-arrow" to="/dashboard/freelance/new">Post a project</Link>
              </div>
              {freelanceProjects.length === 0 ? (
                <EmptyState
                  compact
                  icon="?"
                  title="No freelance projects yet"
                  text="Publish a short project brief and receive proposals from freelancers."
                  action={<Link className="btn btn--primary" to="/dashboard/freelance/new">Post a freelance project</Link>}
                />
              ) : (
                <div className="table-wrap dashboard-table">
                  <table className="data-table">
                    <caption className="sr-only">Your freelance projects</caption>
                    <thead>
                      <tr>
                        <th scope="col">Project</th>
                        <th scope="col">Status</th>
                        <th scope="col">Budget</th>
                        <th scope="col">Deadline</th>
                        <th scope="col">Proposals</th>
                        <th scope="col">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {freelanceProjects.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <Link to={`/freelance/${item.id}`}>{item.title}</Link>
                          </td>
                          <td>
                            <span
                              className={`badge ${
                                item.status === "open"
                                  ? "badge--green"
                                  : item.status === "in_progress"
                                  ? "badge--amber"
                                  : "badge--slate"
                              }`}
                            >
                              {FREELANCE_STATUS_LABELS[item.status] || item.status}
                            </span>
                          </td>
                          <td>{formatMoney(item.budget_npr)}</td>
                          <td>{formatDate(item.deadline)}</td>
                          <td>{item.proposal_count || 0}</td>
                          <td>
                            <div className="apply-actions">
                              <Link className="btn btn--outline btn--sm" to={`/freelance/${item.id}`}>
                                Review
                              </Link>
                              <Link className="btn btn--ghost btn--sm" to={`/dashboard/freelance/${item.id}/edit`}>
                                Edit
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="dashboard-card-head">
                <div>
                  <span className="eyebrow">Talent projects</span>
                  <h2 className="dashboard-card-title">Talent projects ({talentProjects.length})</h2>
                </div>
                <Link className="link-arrow" to="/dashboard/talent-projects/new">Post a project</Link>
              </div>
              {talentProjects.length === 0 ? (
                <EmptyState
                  compact
                  icon="?"
                  title="No talent projects yet"
                  text="Create a project to recruit collaborators for a specific piece of work."
                  action={<Link className="btn btn--primary" to="/dashboard/talent-projects/new">Post a talent project</Link>}
                />
              ) : (
                <div className="table-wrap dashboard-table">
                  <table className="data-table">
                    <caption className="sr-only">Your talent projects</caption>
                    <thead>
                      <tr>
                        <th scope="col">Project</th>
                        <th scope="col">Status</th>
                        <th scope="col">Deadline</th>
                        <th scope="col">People needed</th>
                        <th scope="col">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {talentProjects.map((item) => (
                        <tr key={item.id}>
                          <td>{item.title}</td>
                          <td>
                            <span
                              className={`badge ${
                                item.status === "open"
                                  ? "badge--green"
                                  : item.status === "draft"
                                  ? "badge--amber"
                                  : "badge--slate"
                              }`}
                            >
                              {TALENT_PROJECT_STATUS_LABELS[item.status] || item.status}
                            </span>
                          </td>
                          <td>{formatDate(item.deadline)}</td>
                          <td>{item.talent_required}</td>
                          <td>
                            <Link className="btn btn--ghost btn--sm" to={`/dashboard/talent-projects/${item.id}/edit`}>
                              Edit
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="dashboard-card-head">
                <h2 className="dashboard-card-title">Invitations sent ({invitations.length})</h2>
                <Link className="link-arrow" to="/talent">Find talent</Link>
              </div>
              {invitations.length === 0 ? (
                <EmptyState
                  compact
                  icon="?"
                  title="No invitations sent"
                  text="Browse public talent profiles and invite someone to collaborate."
                  action={<Link className="btn btn--primary" to="/talent">Browse talent</Link>}
                />
              ) : (
                <div className="notification-list">
                  {invitations.map((invitation) => (
                    <div className="notification-item" key={invitation.id}>
                      <div className="notification-item__body">
                        <p className="notification-item__title">
                          {invitation.talent?.name || "Talent"}{" "}
                          {invitation.target_title ? `· ${invitation.target_title}` : ""}
                        </p>
                        <p className="notification-item__message">{invitation.message}</p>
                        <p className="notification-item__meta">
                          {formatDateTime(invitation.created_at)} ·{" "}
                          <span className={`badge ${INVITATION_STATUS_CLASSES[invitation.status] || "badge--slate"}`}>
                            {invitation.status}
                          </span>
                        </p>
                        {invitation.talent?.id ? (
                          <div className="apply-actions">
                            <MessageButton
                              userId={invitation.talent.id}
                              subject={
                                invitation.target_title
                                  ? `Invitation: ${invitation.target_title}`
                                  : "About your invitation"
                              }
                              label="Message talent"
                            />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {isAdmin ? (
            <div className="card">
              <div className="card-body">
                <div className="dashboard-card-head">
                  <h2 className="dashboard-card-title">Administration</h2>
                  <Link className="link-arrow" to="/dashboard/admin">Open admin tools</Link>
                </div>
                <p className="small text-muted">
                  Manage users, verify organizations, review applications, and moderate community
                  content.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: dashboard, loading, error, reload } = useApi("/api/dashboard/");

  if (loading) return <Loading label="Loading your dashboard…" large />;
  if (error) {
    return (
      <div className="container section">
        <ErrorNotice message={error.message} onRetry={() => reload()} />
      </div>
    );
  }
  if (!dashboard) return null;

  const role = dashboard.role || user?.role;
  if (role === "job_seeker" || role === "freelancer") {
    return <TalentDashboard dashboard={dashboard} role={role} />;
  }
  return <EmployerDashboard dashboard={dashboard} reload={reload} />;
}
