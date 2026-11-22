import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.get("/api/auth/me/");
      setUser(data);
      return data;
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        setUser(null);
        return null;
      }
      // Network/backend failures should not break the whole app shell.
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      await refresh();
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [refresh]);

  const login = useCallback(async (credentials) => {
    const data = await api.post("/api/auth/login/", credentials);
    setUser(data);
    return data;
  }, []);

  const register = useCallback(async (payload) => {
    const data = await api.post("/api/auth/register/", payload);
    setUser(data);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/api/auth/logout/");
    } catch {
      // Signing out should always clear local state.
    }
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      refresh,
      login,
      register,
      logout,
      setUser,
      isAuthenticated: Boolean(user),
      isTalent: Boolean(user && (user.role === "job_seeker" || user.role === "freelancer")),
      isEmployerSide: Boolean(
        user && (user.role === "employer" || user.role === "organization" || user.role === "admin")
      ),
      isAdmin: Boolean(user && user.role === "admin"),
    }),
    [user, loading, refresh, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
