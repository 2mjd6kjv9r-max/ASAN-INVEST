import { useAuth, useIsStaff } from '@/app/providers'
import { LanguageSwitch } from '@/components/LanguageSwitch'
import { Alert } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, Outlet } from 'react-router-dom'

const publicLinks = [
  { to: '/why-azerbaijan', key: 'nav.why' },
  { to: '/opportunities', key: 'nav.opportunities' },
  { to: '/investor-guide', key: 'nav.guide' },
  { to: '/kya', key: 'nav.kya' },
  { to: '/route', key: 'nav.route' },
  { to: '/incentives', key: 'nav.incentives' },
  { to: '/ombudsman', key: 'nav.ombudsman' },
  { to: '/about', key: 'nav.about' },
] as const

export function PortalLayout() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const staff = useIsStaff()
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-svh bg-navy-50">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:px-3 focus:py-2">
        {t('skip')}
      </a>
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-950">{t('demoNotice')}</div>
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="font-semibold tracking-tight text-navy no-underline">
            {t('brand')}
          </Link>
          <nav className="hidden items-center gap-4 text-sm lg:flex" aria-label="Primary">
            {publicLinks.map((link) => (
              <NavLink key={link.to} to={link.to} className={({ isActive }) => cn('text-navy no-underline hover:underline', isActive && 'font-semibold')}>
                {t(link.key)}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <LanguageSwitch />
            {user ? (
              <div className="hidden items-center gap-3 sm:flex">
                <NavLink to={staff ? '/backoffice' : '/cabinet'} className="text-sm font-semibold text-navy no-underline">
                  {staff ? t('nav.backoffice') : t('nav.cabinet')}
                </NavLink>
                <button type="button" className="text-sm text-navy" onClick={() => void logout()}>
                  {t('nav.logout')}
                </button>
              </div>
            ) : (
              <div className="hidden gap-2 sm:flex">
                <NavLink to="/login" className="text-sm text-navy no-underline">
                  {t('nav.login')}
                </NavLink>
                <NavLink to="/register" className="text-sm text-muted no-underline">
                  {t('nav.register')}
                </NavLink>
              </div>
            )}
            <button type="button" className="lg:hidden" aria-expanded={open} aria-label={open ? t('nav.close') : t('nav.menu')} onClick={() => setOpen((v) => !v)}>
              Menu
            </button>
          </div>
        </div>
        {open ? (
          <nav className="space-y-2 border-t border-line px-4 py-3 lg:hidden">
            {publicLinks.map((link) => (
              <NavLink key={link.to} to={link.to} className="block text-navy no-underline" onClick={() => setOpen(false)}>
                {t(link.key)}
              </NavLink>
            ))}
          </nav>
        ) : null}
      </header>
      <main id="main" className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-line bg-white px-4 py-6 text-center text-sm text-muted">
        {t('footer.copy', { year: new Date().getFullYear() })}
      </footer>
    </div>
  )
}

function ShellNav({ links }: { links: { to: string; label: string }[] }) {
  return (
    <nav className="space-y-1" aria-label="Section">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.to.split('/').length <= 2}
          className={({ isActive }) =>
            cn('block rounded-sm px-3 py-2 text-sm no-underline', isActive ? 'bg-navy text-white' : 'text-navy hover:bg-navy-50')
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  )
}

export function CabinetLayout() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const links = [
    { to: '/cabinet', label: t('cabinet.title') },
    { to: '/cabinet/projects', label: t('cabinet.projects') },
    { to: '/cabinet/applications', label: t('cabinet.applications') },
    { to: '/cabinet/documents', label: t('cabinet.documents') },
    { to: '/cabinet/notifications', label: t('cabinet.notifications') },
    { to: '/cabinet/profile', label: t('cabinet.profile') },
  ]
  return (
    <AppShell title={t('cabinet.title')} userEmail={user?.email} onLogout={() => void logout()} links={links} notice={t('demoNotice')} />
  )
}

export function BackofficeLayout() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const links = [
    { to: '/backoffice', label: t('backoffice.cases') },
    { to: '/backoffice/evaluations', label: t('backoffice.evaluations') },
    { to: '/backoffice/admin', label: t('backoffice.admin') },
    { to: '/backoffice/analytics', label: t('backoffice.analytics') },
  ]
  return (
    <AppShell
      title={t('backoffice.title')}
      userEmail={user?.email}
      onLogout={() => void logout()}
      links={links}
      notice={t('backoffice.internal')}
    />
  )
}

function AppShell({
  title,
  userEmail,
  onLogout,
  links,
  notice,
}: {
  title: string
  userEmail?: string
  onLogout: () => void
  links: { to: string; label: string }[]
  notice: string
}) {
  const { t } = useTranslation()
  return (
    <div className="min-h-svh bg-navy-50">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:px-3 focus:py-2">
        {t('skip')}
      </a>
      <Alert tone="warning">{notice}</Alert>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-4">
          <div>
            <Link to="/" className="text-sm font-semibold text-navy no-underline">
              {t('brand')}
            </Link>
            <p className="text-lg font-semibold text-navy">{title}</p>
            <p className="text-xs text-muted">{userEmail}</p>
          </div>
          <ShellNav links={links} />
          <LanguageSwitch />
          <button type="button" className="text-sm text-navy" onClick={onLogout}>
            {t('nav.logout')}
          </button>
        </aside>
        <main id="main" className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
