import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { dashboardPathForRole } from "../lib/format";
import { Loading } from "./Loading";

export function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Loading label="Checking your session…" />;
  }

  if (!user) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to={dashboardPathForRole(user.role)} replace />;
  }

  return children;
}
