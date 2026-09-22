import { Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout } from "../components/AdminLayout";
import { RequireAuth, RequireStaff, Shell } from "../components/Layout";
import { AboutPage } from "../pages/AboutPage";
import { ForgotPasswordPage } from "../pages/ForgotPasswordPage";
import { HomePage } from "../pages/HomePage";
import { InvestPage } from "../pages/InvestPage";
import { InvestmentsPage } from "../pages/InvestmentsPage";
import { LoginPage } from "../pages/LoginPage";
import { ProfilePage } from "../pages/ProfilePage";
import { ProjectDetailPage } from "../pages/ProjectDetailPage";
import { ProjectsPage } from "../pages/ProjectsPage";
import { RegisterPage } from "../pages/RegisterPage";
import { AdminInvestmentsPage } from "../pages/admin/AdminInvestmentsPage";
import { AdminKycPage } from "../pages/admin/AdminKycPage";
import { AdminProjectFormPage } from "../pages/admin/AdminProjectFormPage";
import { AdminProjectsPage } from "../pages/admin/AdminProjectsPage";
import { AdminUsersPage } from "../pages/admin/AdminUsersPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:slug" element={<ProjectDetailPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route
          path="/app/profile"
          element={
            <RequireAuth>
              <ProfilePage />
            </RequireAuth>
          }
        />
        <Route
          path="/app/investments"
          element={
            <RequireAuth>
              <InvestmentsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/projects/:slug/invest"
          element={
            <RequireAuth>
              <InvestPage />
            </RequireAuth>
          }
        />
      </Route>
      <Route
        path="/admin"
        element={
          <RequireStaff>
            <AdminLayout />
          </RequireStaff>
        }
      >
        <Route index element={<Navigate to="projects" replace />} />
        <Route path="projects" element={<AdminProjectsPage />} />
        <Route path="projects/new" element={<AdminProjectFormPage />} />
        <Route path="projects/:id" element={<AdminProjectFormPage />} />
        <Route path="investments" element={<AdminInvestmentsPage />} />
        <Route path="kyc" element={<AdminKycPage />} />
        <Route path="users" element={<AdminUsersPage />} />
      </Route>
    </Routes>
  );
}
