import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { ErrorNotice } from "../components/ErrorNotice";
import { Loading } from "../components/Loading";
import { PageHeader } from "../components/PageHeader";
import { useToast } from "../context/ToastContext";
import { api } from "../lib/api";
import {
  APPLICATION_STATUS_CLASSES,
  APPLICATION_STATUSES,
  ROLE_LABELS,
  USER_STATUS_CLASSES,
  formatDate,
  formatDateTime,
} from "../lib/format";
import { useApi } from "../lib/useApi";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "users", label: "Accounts" },
  { id: "organizations", label: "Organizations" },
  { id: "applications", label: "Applications" },
  { id: "outbox", label: "Email outbox" },
];

const ASSIGNABLE_ROLES = ["job_seeker", "freelancer", "employer", "organization"];

function StatsPanel({ stats }) {
  const cards = [
    ["users", "Accounts"],
    ["talent", "Talent accounts"],
    ["employers", "Employer-side accounts"],
    ["suspended", "Suspended accounts"],
    ["opportunities", "Opportunities"],
    ["open_opportunities", "Open opportunities"],
    ["organizations", "Organizations"],
    ["applications", "Applications"],
    ["talent_projects", "Talent projects"],
    ["freelance_projects", "Freelance projects"],
    ["proposals", "Proposals"],
    ["community_posts", "Community posts"],
    ["comments", "Comments"],
    ["pending_emails", "Pending emails"],
  ];

  return (
    <>
      <div className="hero-stats">
        {cards.slice(0, 4).map(([key, label]) => (
          <div className="stat-card" key={key}>
            <span className="stat-value">{(stats?.[key] || 0).toLocaleString()}</span>
            <span className="stat-label">{label}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-body">
          <h2 className="dashboard-card-title">Platform totals</h2>
          <div className="table-wrap dashboard-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Measure</th>
                  <th scope="col">Count</th>
                </tr>
              </thead>
              <tbody>
                {cards.slice(4).map(([key, label]) => (
                  <tr key={key}>
                    <td>{label}</td>
                    <td>{(stats?.[key] || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h2 className="dashboard-card-title">Admin notes</h2>
          <ul className="side-list side-list--compact">
            <li>Administrator accounts can only be created from the command line.</li>
            <li>Organization verification is managed here and shown on every listing.</li>
            <li>No real payments are processed anywhere on the platform.</li>
            <li>The skill recommender is rule-based, never AI or machine learning.</li>
          </ul>
        </div>
      </div>
    </>
  );
}

function UsersPanel({ showToast }) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  function load() {
    setLoading(true);
    setError(null);
    const params = { page, per_page: 20 };
    if (query.trim()) params.q = query.trim();
    if (role) params.role = role;
    api
      .get("/api/auth/admin/users/", params)
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, role]);

  const rows = data?.results || (Array.isArray(data) ? data : []);
  const count = data?.count ?? rows.length;

  async function updateUser(user, payload) {
    setBusyId(user.id);
    try {
      await api.patch(`/api/auth/admin/users/${user.id}/`, payload);
      showToast("Account updated.");
      load();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="card">
      <div className="card-body">
        <div className="dashboard-card-head">
          <div>
            <span className="eyebrow">Administration</span>
            <h2 className="dashboard-card-title">Accounts ({count})</h2>
          </div>
          <p className="small text-muted">Administrators are created only from the CLI.</p>
        </div>

        <form
          className="filter-form filter-form--inline"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            load();
          }}
        >
          <div className="form-field">
            <label className="form-label" htmlFor="admin-user-q">Search</label>
            <input
              className="input"
              id="admin-user-q"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name or email"
            />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="admin-user-role">Role</label>
            <select
              className="select"
              id="admin-user-role"
              value={role}
              onChange={(event) => {
                setRole(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Any role</option>
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="filter-form__actions">
            <button className="btn btn--primary" type="submit">Search</button>
          </div>
        </form>

        {error ? (
          <ErrorNotice message={error.message} onRetry={load} />
        ) : loading ? (
          <Loading label="Loading accounts…" />
        ) : rows.length === 0 ? (
          <EmptyState compact icon="?" title="No accounts found" text="Try a different search." />
        ) : (
          <>
            <div className="table-wrap dashboard-table">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Email</th>
                    <th scope="col">Role</th>
                    <th scope="col">Status</th>
                    <th scope="col">Joined</th>
                    <th scope="col">Changes</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((user) => (
                    <tr key={user.id}>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>
                        {user.role === "admin" ? (
                          <span className="badge badge--amber">{ROLE_LABELS.admin}</span>
                        ) : (
                          <select
                            className="select"
                            value={user.role}
                            onChange={(event) => updateUser(user, { role: event.target.value })}
                            disabled={busyId === user.id}
                            aria-label={`Role for ${user.name}`}
                          >
                            {ASSIGNABLE_ROLES.map((value) => (
                              <option key={value} value={value}>{ROLE_LABELS[value]}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${USER_STATUS_CLASSES[user.status] || "badge--slate"}`}>
                          {user.status}
                        </span>
                      </td>
                      <td>{formatDate(user.created_at)}</td>
                      <td>
                        <button
                          className="btn btn--ghost btn--sm"
                          type="button"
                          onClick={() =>
                            updateUser(user, {
                              status: user.status === "active" ? "suspended" : "active",
                            })
                          }
                          disabled={busyId === user.id}
                        >
                          {user.status === "active" ? "Suspend" : "Reactivate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="apply-actions">
              <button className="btn btn--outline btn--sm" type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                Previous
              </button>
              <span className="small text-muted">Page {page}</span>
              <button className="btn btn--outline btn--sm" type="button" onClick={() => setPage((p) => p + 1)} disabled={page * 20 >= count}>
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function OrganizationsPanel({ showToast }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  function load() {
    setLoading(true);
    setError(null);
    const params = { per_page: 50 };
    if (query.trim()) params.q = query.trim();
    if (filter !== "") params.verified = filter;
    api
      .get("/api/admin/organizations/", params)
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const rows = data?.results || (Array.isArray(data) ? data : []);
  const count = data?.count ?? rows.length;
  const total = useMemo(() => rows.length, [rows]);

  async function toggleVerified(organization) {
    setBusyId(organization.id);
    try {
      await api.patch(`/api/admin/organizations/${organization.id}/`, {
        is_verified: !organization.is_verified,
      });
      showToast(organization.is_verified ? "Verification removed." : "Organization verified.");
      load();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="card">
      <div className="card-body">
        <div className="dashboard-card-head">
          <div>
            <span className="eyebrow">Administration</span>
            <h2 className="dashboard-card-title">Organizations ({count})</h2>
          </div>
          <p className="small text-muted">{total} shown</p>
        </div>

        <form
          className="filter-form filter-form--inline"
          onSubmit={(event) => {
            event.preventDefault();
            load();
          }}
        >
          <div className="form-field">
            <label className="form-label" htmlFor="admin-org-q">Search</label>
            <input
              className="input"
              id="admin-org-q"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Organization or owner"
            />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="admin-org-verified">Verification</label>
            <select
              className="select"
              id="admin-org-verified"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="">All</option>
              <option value="1">Verified</option>
              <option value="0">Unverified</option>
            </select>
          </div>
          <div className="filter-form__actions">
            <button className="btn btn--primary" type="submit">Search</button>
          </div>
        </form>

        {error ? (
          <ErrorNotice message={error.message} onRetry={load} />
        ) : loading ? (
          <Loading label="Loading organizations…" />
        ) : rows.length === 0 ? (
          <EmptyState compact icon="?" title="No organizations found" text="Try a different search." />
        ) : (
          <div className="table-wrap dashboard-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Organization</th>
                  <th scope="col">Owner</th>
                  <th scope="col">Location</th>
                  <th scope="col">Listings</th>
                  <th scope="col">Verification</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((organization) => (
                  <tr key={organization.id}>
                    <td>{organization.name}</td>
                    <td>{organization.owner?.name || "—"}</td>
                    <td>{organization.location || "—"}</td>
                    <td>
                      {organization.open_opportunities || 0} open roles ·{" "}
                      {organization.open_talent_projects || 0} projects
                    </td>
                    <td>
                      <span className={`badge ${organization.is_verified ? "badge--green" : "badge--amber"}`}>
                        {organization.is_verified ? "Verified" : "Unverified"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn--outline btn--sm"
                        type="button"
                        onClick={() => toggleVerified(organization)}
                        disabled={busyId === organization.id}
                      >
                        {organization.is_verified ? "Remove verification" : "Verify"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ApplicationsPanel({ showToast }) {
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  function load() {
    setLoading(true);
    setError(null);
    const params = { per_page: 50 };
    if (status) params.status = status;
    if (query.trim()) params.q = query.trim();
    api
      .get("/api/admin/applications/", params)
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const rows = data?.results || (Array.isArray(data) ? data : []);
  const count = data?.count ?? rows.length;

  async function update(application, nextStatus) {
    setBusyId(application.id);
    try {
      await api.patch(`/api/opportunities/applications/${application.id}/status/`, {
        status: nextStatus,
      });
      showToast("Application status updated.");
      load();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="card">
      <div className="card-body">
        <div className="dashboard-card-head">
          <div>
            <span className="eyebrow">Administration</span>
            <h2 className="dashboard-card-title">Applications ({count})</h2>
          </div>
        </div>

        <form
          className="filter-form filter-form--inline"
          onSubmit={(event) => {
            event.preventDefault();
            load();
          }}
        >
          <div className="form-field">
            <label className="form-label" htmlFor="admin-app-q">Search</label>
            <input
              className="input"
              id="admin-app-q"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Applicant or opportunity"
            />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="admin-app-status">Status</label>
            <select
              className="select"
              id="admin-app-status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">Any status</option>
              {APPLICATION_STATUSES.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>
          <div className="filter-form__actions">
            <button className="btn btn--primary" type="submit">Search</button>
          </div>
        </form>

        {error ? (
          <ErrorNotice message={error.message} onRetry={load} />
        ) : loading ? (
          <Loading label="Loading applications…" />
        ) : rows.length === 0 ? (
          <EmptyState compact icon="?" title="No applications found" text="Try a different filter." />
        ) : (
          <div className="table-wrap dashboard-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Applicant</th>
                  <th scope="col">Opportunity</th>
                  <th scope="col">Applied</th>
                  <th scope="col">Status</th>
                  <th scope="col">Update</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((application) => (
                  <tr key={application.id}>
                    <td>{application.user?.name || "Applicant"}</td>
                    <td>{application.opportunity_title}</td>
                    <td>{formatDate(application.created_at)}</td>
                    <td>
                      <span
                        className={`badge ${
                          APPLICATION_STATUS_CLASSES[application.status] || "badge--slate"
                        }`}
                      >
                        {APPLICATION_STATUSES.find((item) => item.value === application.status)?.label ||
                          application.status}
                      </span>
                    </td>
                    <td>
                      <select
                        className="select"
                        value={application.status}
                        onChange={(event) => update(application, event.target.value)}
                        disabled={busyId === application.id}
                        aria-label={`Status for ${application.user?.name || "applicant"}`}
                      >
                        {APPLICATION_STATUSES.map((item) => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function OutboxPanel() {
  const [status, setStatus] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    const params = { per_page: 50 };
    if (status) params.status = status;
    api
      .get("/api/notifications/outbox/", params)
      .then((result) => {
        if (active) setData(result);
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
  }, [status]);

  const rows = data?.results || (Array.isArray(data) ? data : []);
  const count = data?.count ?? rows.length;

  return (
    <div className="card">
      <div className="card-body">
        <div className="dashboard-card-head">
          <div>
            <span className="eyebrow">Administration</span>
            <h2 className="dashboard-card-title">Email outbox ({count})</h2>
          </div>
          <p className="small text-muted">
            Process pending rows with <code>manage.py process_email_outbox</code>.
          </p>
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="outbox-status">Status</label>
          <select
            className="select"
            id="outbox-status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {error ? (
          <ErrorNotice message={error.message} />
        ) : loading ? (
          <Loading label="Loading outbox…" />
        ) : rows.length === 0 ? (
          <EmptyState compact icon="?" title="Nothing in the outbox" text="No email records match this filter." />
        ) : (
          <div className="table-wrap dashboard-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Recipient</th>
                  <th scope="col">Subject</th>
                  <th scope="col">Status</th>
                  <th scope="col">Attempts</th>
                  <th scope="col">Created</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      {row.recipient_name || row.recipient_email}
                      <span className="table-subtext">{row.recipient_email}</span>
                    </td>
                    <td>{row.subject}</td>
                    <td>
                      <span
                        className={`badge ${
                          row.status === "sent"
                            ? "badge--green"
                            : row.status === "failed"
                            ? "badge--rose"
                            : "badge--amber"
                        }`}
                      >
                        {row.status}
                      </span>
                      {row.last_error ? <span className="table-subtext">{row.last_error}</span> : null}
                    </td>
                    <td>{row.attempts}</td>
                    <td>{formatDateTime(row.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const toast = useToast();
  const [tab, setTab] = useState("overview");
  const { data: stats, loading, error, reload } = useApi("/api/admin/stats/");

  if (loading) return <Loading label="Loading admin tools…" large />;
  if (error) {
    return (
      <div className="container section">
        <ErrorNotice message={error.message} onRetry={() => reload()} />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Administrator workspace"
        title="Platform administration"
        lead="Review accounts, verify organizations, follow applications, and inspect the email outbox. Administrator accounts themselves are created only from the command line."
        actions={
          <Link className="btn btn--outline" to="/dashboard">
            Back to dashboard
          </Link>
        }
      />

      <section className="section section--tight">
        <div className="container dashboard-stack">
          <div className="category-nav" role="tablist" aria-label="Admin sections">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                className={`chip${tab === item.id ? " is-active" : ""}`}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {tab === "overview" ? <StatsPanel stats={stats} /> : null}
          {tab === "users" ? (
            <UsersPanel showToast={(message, type) => (type === "error" ? toast.error(message) : toast.success(message))} />
          ) : null}
          {tab === "organizations" ? (
            <OrganizationsPanel
              showToast={(message, type) => (type === "error" ? toast.error(message) : toast.success(message))}
            />
          ) : null}
          {tab === "applications" ? (
            <ApplicationsPanel
              showToast={(message, type) => (type === "error" ? toast.error(message) : toast.success(message))}
            />
          ) : null}
          {tab === "outbox" ? <OutboxPanel /> : null}
        </div>
      </section>
    </>
  );
}
