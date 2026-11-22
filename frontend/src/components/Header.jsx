import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { dashboardPathForRole } from "../lib/format";
import { Avatar } from "./Avatar";
import { Brand } from "./Brand";

const NAV_ITEMS = [
  { key: "opportunities", label: "Opportunities", to: "/opportunities" },
  { key: "talent", label: "Talent", to: "/talent" },
  { key: "skills", label: "Skills & SDGs", to: "/skills" },
  { key: "freelance", label: "Freelance", to: "/freelance" },
  { key: "enterprise", label: "For organizations", to: "/enterprise" },
];

export function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!user) {
      setUnread(0);
      setUnreadMessages(0);
      return undefined;
    }
    let active = true;
    Promise.all([
      api.get("/api/notifications/unread-count/").catch(() => null),
      api.get("/api/messaging/unread-count/").catch(() => null),
    ]).then(([notifications, messages]) => {
      if (!active) return;
      setUnread(Number(notifications?.count) || 0);
      setUnreadMessages(Number(messages?.count) || 0);
    });
    return () => {
      active = false;
    };
  }, [user, location.pathname]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    function refreshMessageCount() {
      api
        .get("/api/messaging/unread-count/")
        .then((data) => setUnreadMessages(Number(data?.count) || 0))
        .catch(() => null);
    }
    window.addEventListener("messages:read", refreshMessageCount);
    return () => window.removeEventListener("messages:read", refreshMessageCount);
  }, []);

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Brand />

        <button
          className="nav-toggle"
          type="button"
          aria-controls="site-nav"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="nav-toggle-box" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </span>
          <span className="nav-toggle-label">Menu</span>
        </button>

        <nav
          className={`site-nav${menuOpen ? " is-open" : ""}`}
          id="site-nav"
          aria-label="Main navigation"
        >
          <ul className="nav-list">
            {NAV_ITEMS.map((item) => (
              <li key={item.key}>
                <NavLink
                  className={({ isActive }) => `nav-link${isActive ? " is-active" : ""}`}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="nav-actions">
            {user ? (
              <>
                <Link
                  className="notification-link notification-bell"
                  to="/messages"
                  aria-label={`Messages${unreadMessages > 0 ? `, ${unreadMessages} unread` : ""}`}
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
                    <path
                      d="M4 4h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H8l-4 4V5a1 1 0 0 1 1-1Zm3 5v2h10V9H7Zm0 4v2h7v-2H7Z"
                      fill="currentColor"
                    />
                  </svg>
                  {unreadMessages > 0 ? (
                    <span className="notification-count">{unreadMessages > 99 ? "99+" : unreadMessages}</span>
                  ) : null}
                </Link>
                <Link
                  className="notification-link notification-bell"
                  to="/notifications"
                  aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ""}`}
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
                    <path
                      d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-6v-5a7 7 0 0 0-5.5-6.84V3a1.5 1.5 0 0 0-3 0v1.16A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2Z"
                      fill="currentColor"
                    />
                  </svg>
                  {unread > 0 ? (
                    <span className="notification-count">{unread > 99 ? "99+" : unread}</span>
                  ) : null}
                </Link>
                <Link className="account-link" to={dashboardPathForRole(user.role)}>
                  <Avatar name={user.name} />
                  <span className="account-name">{user.name}</span>
                </Link>
                <button className="btn btn--ghost btn--sm" type="button" onClick={handleLogout}>
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link className="nav-login" to="/login">
                  Log in
                </Link>
                <Link className="btn btn--primary btn--sm" to="/register">
                  Join the platform
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
