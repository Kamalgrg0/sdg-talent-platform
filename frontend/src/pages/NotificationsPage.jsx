import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { ErrorNotice } from "../components/ErrorNotice";
import { Loading } from "../components/Loading";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { api } from "../lib/api";
import {
  NOTIFICATION_TYPE_CLASSES,
  NOTIFICATION_TYPE_LABELS,
  dashboardPathForRole,
  formatDateTime,
} from "../lib/format";

export default function NotificationsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [marking, setMarking] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get("/api/notifications/", { per_page: 50 });
      const rows = Array.isArray(data) ? data : data?.results || [];
      setNotifications(rows);
      setUnread(rows.filter((item) => !item.is_read).length);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function openNotification(notification) {
    setBusyId(notification.id);
    try {
      if (!notification.is_read) {
        await api.patch(`/api/notifications/${notification.id}/read/`);
        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id ? { ...item, is_read: true } : item
          )
        );
        setUnread((current) => Math.max(0, current - 1));
      }
      if (notification.link) {
        // Links are normalised by the API; this is a final safety net for old data.
        const target = notification.link.startsWith("/")
          ? notification.link
          : dashboardPathForRole(user?.role);
        navigate(target);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function markAllRead() {
    setMarking(true);
    try {
      const result = await api.post("/api/notifications/read-all/");
      setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
      setUnread(0);
      toast.success(
        result?.updated
          ? `${result.updated} notification${result.updated === 1 ? "" : "s"} marked as read.`
          : "All notifications are already read."
      );
    } catch (err) {
      toast.error(err.message);
    } finally {
      setMarking(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Private to you"
        title="Notifications"
        lead={
          unread > 0
            ? `You have ${unread} unread notification${unread === 1 ? "" : "s"}. Open one to see the related page.`
            : "You are up to date. Application, proposal, invitation, and hiring updates appear here."
        }
        actions={
          <>
            <Link className="btn btn--outline" to="/dashboard">
              Back to dashboard
            </Link>
            {unread > 0 ? (
              <button className="btn btn--ghost" type="button" onClick={markAllRead} disabled={marking}>
                {marking ? "Marking…" : "Mark all as read"}
              </button>
            ) : null}
          </>
        }
      />

      <section className="section section--tight">
        <div className="container dashboard-stack">
          <div className="card">
            <div className="card-body">
              <div className="dashboard-card-head">
                <div>
                  <span className="eyebrow">Inbox</span>
                  <h2 className="dashboard-card-title">
                    Your notifications ({notifications.length})
                  </h2>
                </div>
                <p className="small text-muted">{unread} unread</p>
              </div>

              <p className="small text-muted">
                Notifications are stored here and, when email delivery is enabled, a copy is emailed
                to your account address.
              </p>

              {error ? (
                <ErrorNotice message={error.message} onRetry={load} />
              ) : loading ? (
                <Loading label="Loading notifications…" />
              ) : notifications.length === 0 ? (
                <EmptyState
                  compact
                  icon="?"
                  title="No notifications yet"
                  text="When an employer reviews your application, a client responds to a proposal, or someone invites you to a project, the update will appear here."
                  action={<Link className="btn btn--primary" to="/opportunities">Browse opportunities</Link>}
                />
              ) : (
                <div className="notification-list">
                  {notifications.map((notification) => (
                    <button
                      className={`notification-item${notification.is_read ? "" : " notification-item--unread"}`}
                      type="button"
                      key={notification.id}
                      onClick={() => openNotification(notification)}
                      disabled={busyId === notification.id}
                    >
                      <span
                        className={`badge ${
                          NOTIFICATION_TYPE_CLASSES[notification.type] || "badge--slate"
                        }`}
                      >
                        {NOTIFICATION_TYPE_LABELS[notification.type] || notification.type}
                      </span>
                      <span className="notification-item__body">
                        <span className="notification-item__title">{notification.title}</span>
                        <span className="notification-item__message">{notification.message}</span>
                        <span className="notification-item__meta">
                          {formatDateTime(notification.created_at)}
                          {notification.is_read ? "" : " · New"}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h2 className="dashboard-card-title">About notifications</h2>
              <ul className="side-list side-list--compact">
                <li>Updates are private to your account.</li>
                <li>Application and proposal decisions arrive here first.</li>
                <li>Email copies are sent to the address on your account when delivery is configured.</li>
              </ul>
              <Link className="btn btn--ghost" to={dashboardPathForRole(user?.role)}>
                Go to my dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
