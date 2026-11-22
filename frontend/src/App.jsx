
import { Navigate, Route, Routes } from "react-router-dom";

import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import { dashboardPathForRole } from "./lib/format";

import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

import OpportunitiesPage from "./pages/OpportunitiesPage";
import OpportunityDetailPage from "./pages/OpportunityDetailPage";
import OpportunityEditorPage from "./pages/OpportunityEditorPage";
import TalentDirectoryPage from "./pages/TalentDirectoryPage";
import TalentProfilePage from "./pages/TalentProfilePage";
import SkillsPage from "./pages/SkillsPage";

import FreelancePage from "./pages/FreelancePage";
import FreelanceDetailPage from "./pages/FreelanceDetailPage";
import EnterprisePage from "./pages/EnterprisePage";

import CommunityPage from "./pages/CommunityPage";
import CommunityPostPage from "./pages/CommunityPostPage";

import DashboardPage from "./pages/DashboardPage";
import AdminPage from "./pages/AdminPage";
import NotificationsPage from "./pages/NotificationsPage";
import MessagesPage from "./pages/MessagesPage";
import ManageApplicantsPage from "./pages/ManageApplicantsPage";
import OrganizationEditorPage from "./pages/OrganizationEditorPage";
import TalentEditorPage from "./pages/TalentEditorPage";
import ProjectEditorPage from "./pages/ProjectEditorPage";

import NotFoundPage from "./pages/NotFoundPage";

const TALENT_ROLES = ["job_seeker", "freelancer"];
const EMPLOYER_ROLES = ["employer", "organization"];

function Protected({ roles, children }) {
  return (
    <ProtectedRoute roles={roles}>
      {children}
    </ProtectedRoute>
  );
}

function DashboardRedirect() {
  const { user } = useAuth();
  return <Navigate to={dashboardPathForRole(user?.role)} replace />;
}

function DashboardRoutes() {
  return (
    <>
      <Route
        path="/dashboard"
        element={
          <Protected>
            <DashboardRedirect />
          </Protected>
        }
      />

      <Route
        path="/dashboard/job-seeker"
        element={
          <Protected roles={["job_seeker"]}>
            <DashboardPage />
          </Protected>
        }
      />

      <Route
        path="/dashboard/freelancer"
        element={
          <Protected roles={["freelancer"]}>
            <DashboardPage />
          </Protected>
        }
      />

      <Route
        path="/dashboard/employer"
        element={
          <Protected roles={EMPLOYER_ROLES}>
            <DashboardPage />
          </Protected>
        }
      />

      <Route
        path="/dashboard/admin"
        element={
          <Protected roles={["admin"]}>
            <AdminPage />
          </Protected>
        }
      />
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public pages */}
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />

        {/* Authentication */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Opportunities */}
        <Route path="/opportunities" element={<OpportunitiesPage />} />
        <Route
          path="/opportunities/:id"
          element={<OpportunityDetailPage />}
        />

        {/* Talent */}
        <Route path="/talent" element={<TalentDirectoryPage />} />
        <Route path="/talent/:id" element={<TalentProfilePage />} />
        <Route path="/skills" element={<SkillsPage />} />

        {/* Freelance and organizations */}
        <Route path="/freelance" element={<FreelancePage />} />
        <Route path="/freelance/:id" element={<FreelanceDetailPage />} />
        <Route path="/enterprise" element={<EnterprisePage />} />

        {/* Community */}
        <Route path="/community" element={<CommunityPage />} />
        <Route
          path="/community/:id"
          element={<CommunityPostPage />}
        />

        {/* Protected dashboards */}
        {DashboardRoutes()}

        {/* Employer-side opportunity editor */}
        <Route
          path="/dashboard/opportunities/new"
          element={
            <Protected roles={EMPLOYER_ROLES}>
              <OpportunityEditorPage />
            </Protected>
          }
        />
        <Route
          path="/dashboard/opportunities/:id/edit"
          element={
            <Protected roles={EMPLOYER_ROLES}>
              <OpportunityEditorPage />
            </Protected>
          }
        />

        {/* Employer-side project editors */}
        <Route
          path="/dashboard/freelance/new"
          element={
            <Protected roles={EMPLOYER_ROLES}>
              <ProjectEditorPage mode="freelance" />
            </Protected>
          }
        />
        <Route
          path="/dashboard/freelance/:id/edit"
          element={
            <Protected roles={EMPLOYER_ROLES}>
              <ProjectEditorPage mode="freelance" />
            </Protected>
          }
        />
        <Route
          path="/dashboard/talent-projects/new"
          element={
            <Protected roles={EMPLOYER_ROLES}>
              <ProjectEditorPage mode="talent" />
            </Protected>
          }
        />
        <Route
          path="/dashboard/talent-projects/:id/edit"
          element={
            <Protected roles={EMPLOYER_ROLES}>
              <ProjectEditorPage mode="talent" />
            </Protected>
          }
        />

        {/* Protected account pages */}
        <Route
          path="/notifications"
          element={
            <Protected>
              <NotificationsPage />
            </Protected>
          }
        />

        <Route
          path="/messages"
          element={
            <Protected>
              <MessagesPage />
            </Protected>
          }
        />

        <Route
          path="/messages/:id"
          element={
            <Protected>
              <MessagesPage />
            </Protected>
          }
        />

        <Route
          path="/dashboard/applicants"
          element={
            <Protected roles={EMPLOYER_ROLES}>
              <ManageApplicantsPage />
            </Protected>
          }
        />

        <Route
          path="/dashboard/manage-applicants/:id"
          element={
            <Protected roles={EMPLOYER_ROLES}>
              <ManageApplicantsPage />
            </Protected>
          }
        />

        <Route
          path="/dashboard/organization/edit"
          element={
            <Protected roles={EMPLOYER_ROLES}>
              <OrganizationEditorPage />
            </Protected>
          }
        />

        {/* Alias used by the dashboard and footer links */}
        <Route
          path="/dashboard/organization-profile"
          element={
            <Protected roles={EMPLOYER_ROLES}>
              <OrganizationEditorPage />
            </Protected>
          }
        />

        <Route
          path="/dashboard/talent/edit"
          element={
            <Protected roles={TALENT_ROLES}>
              <TalentEditorPage />
            </Protected>
          }
        />

        {/* Alias used by the dashboard, talent cards, and footer links */}
        <Route
          path="/dashboard/profile"
          element={
            <Protected roles={TALENT_ROLES}>
              <TalentEditorPage />
            </Protected>
          }
        />

        {/* Unknown pages */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
