import { GuestOnly, RequireAuth, RequireStaff } from '@/app/guards'
import { BackofficeLayout, CabinetLayout, PortalLayout } from '@/app/layouts'
import { AdminPage, AnalyticsPage, CaseDeskPage, CaseDetailPage, EvaluationsPage } from '@/pages/backoffice/BackofficePages'
import {
  ApplicationDetailPage,
  ApplicationNewPage,
  ApplicationsPage,
  CabinetHomePage,
  DocumentsPage,
  NotificationsPage,
  ProfilePage,
  ProjectNewPage,
  ProjectPassportPage,
  ProjectsPage,
} from '@/pages/cabinet/CabinetPages'
import { ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage, VerifyEmailPage } from '@/pages/public/AuthPages'
import { CmsPageView, CompanyRegistrationPage, HomePage, OmbudsmanPage, OpportunitiesPage } from '@/pages/public/HomePage'
import { EResidencyPage } from '@/pages/public/EResidencyPage'
import { IncentivePage } from '@/pages/public/IncentivePage'
import { KyaPage } from '@/pages/public/KyaPage'
import { RoutePage } from '@/pages/public/RoutePage'
import { ButtonLink } from '@/components/ui'
import { useTranslation } from 'react-i18next'
import { Route, Routes } from 'react-router-dom'

export function AppRouter() {
  return (
    <Routes>
      <Route element={<PortalLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/why-azerbaijan" element={<CmsPageView slug="why-azerbaijan" />} />
        <Route path="/opportunities" element={<OpportunitiesPage />} />
        <Route path="/investor-guide" element={<CmsPageView slug="investor-guide" />} />
        <Route path="/about" element={<CmsPageView slug="about" />} />
        <Route path="/route" element={<RoutePage />} />
        <Route path="/incentives" element={<IncentivePage />} />
        <Route path="/e-residency" element={<EResidencyPage />} />
        <Route path="/kya" element={<KyaPage />} />
        <Route path="/ombudsman" element={<OmbudsmanPage />} />
        <Route path="/company-registration" element={<CompanyRegistrationPage />} />
        <Route
          path="/login"
          element={
            <GuestOnly>
              <LoginPage />
            </GuestOnly>
          }
        />
        <Route
          path="/register"
          element={
            <GuestOnly>
              <RegisterPage />
            </GuestOnly>
          }
        />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route
        path="/cabinet"
        element={
          <RequireAuth>
            <CabinetLayout />
          </RequireAuth>
        }
      >
        <Route index element={<CabinetHomePage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/new" element={<ProjectNewPage />} />
        <Route path="projects/:id" element={<ProjectPassportPage />} />
        <Route path="applications" element={<ApplicationsPage />} />
        <Route path="applications/new" element={<ApplicationNewPage />} />
        <Route path="applications/:id" element={<ApplicationDetailPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>

      <Route
        path="/backoffice"
        element={
          <RequireAuth>
            <RequireStaff>
              <BackofficeLayout />
            </RequireStaff>
          </RequireAuth>
        }
      >
        <Route index element={<CaseDeskPage />} />
        <Route path="cases/:id" element={<CaseDetailPage />} />
        <Route path="evaluations" element={<EvaluationsPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
      </Route>
    </Routes>
  )
}

function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div className="space-y-3">
      <h1>{t('errors.notFound')}</h1>
      <ButtonLink to="/">{t('errors.home')}</ButtonLink>
    </div>
  )
}

