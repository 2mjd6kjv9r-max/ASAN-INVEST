import { useAuth, useIsStaff } from '@/app/providers'
import { BrandMark } from '@/components/BrandMark'
import { LanguageSwitch } from '@/components/LanguageSwitch'
import { cn } from '@/lib/cn'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

const navGroups = [
  {
    labelKey: 'nav.groupWhy',
    links: [
      { to: '/why-azerbaijan', key: 'nav.why' },
      { to: '/about', key: 'nav.about' },
    ],
  },
  {
    labelKey: 'nav.groupInvestor',
    links: [
      { to: '/kya', key: 'nav.kya' },
      { to: '/route', key: 'nav.route' },
      { to: '/investor-guide', key: 'nav.guide' },
    ],
  },
  {
    labelKey: 'nav.groupOpps',
    links: [
      { to: '/opportunities', key: 'nav.opportunities' },
      { to: '/incentives', key: 'nav.incentives' },
    ],
  },
  {
    labelKey: 'nav.groupPractical',
    links: [
      { to: '/company-registration', key: 'nav.company' },
      { to: '/e-residency', key: 'nav.eResidency' },
      { to: '/ombudsman', key: 'nav.ombudsman' },
    ],
  },
] as const

function initials(value?: string) {
  if (!value) return 'AI'
  const part = value.split('@')[0] ?? value
  return part.slice(0, 2).toUpperCase()
}

function MenuIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 6h12M4 10h12M4 14h12" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function TopNav({ publicNav }: { publicNav: boolean }) {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const staff = useIsStaff()
  const [open, setOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.classList.toggle('nav-open', open)
    return () => document.body.classList.remove('nav-open')
  }, [open])

  return (
    <header className={cn('topnav', publicNav ? 'topnav-pub' : 'topnav-app')}>
      <BrandMark />
      {publicNav ? (
        <nav className="desk" aria-label="Primary">
          {navGroups.map((group) => (
            <div className="mm" key={group.labelKey}>
              <a className="nl" tabIndex={0} href={group.links[0]?.to} onClick={(e) => e.preventDefault()}>
                {t(group.labelKey)} ▾
              </a>
              <div className="mm-p">
                {group.links.map((link) => (
                  <NavLink key={link.to} to={link.to} className={({ isActive }) => cn(isActive && 'font-medium')}>
                    {t(link.key)}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      ) : (
        <div className="topnav-spacer" />
      )}
      <div className="topnav-tools">
        <button type="button" className="iconbtn burger" aria-expanded={open} aria-label={open ? t('nav.close') : t('nav.menu')} onClick={() => setOpen((v) => !v)}>
          <MenuIcon open={open} />
        </button>
        <div className="lang-slot">
          <LanguageSwitch />
        </div>
        {user ? (
          <>
            <NavLink to={staff ? '/backoffice' : '/cabinet'} className="pill no-underline">
              {staff ? t('nav.backoffice') : t('nav.cabinet')}
            </NavLink>
            <div className="userchip">
              <div className="av">{initials(user.email)}</div>
              <div className="userchip-meta">
                <div className="nm">{user.email.split('@')[0]}</div>
                <div className="em">{user.email}</div>
              </div>
            </div>
            <button type="button" className="btn btn-sm topnav-cta" style={{ background: '#fff', color: 'var(--navy)' }} onClick={() => void logout()}>
              {t('nav.logout')}
            </button>
          </>
        ) : (
          <>
            <NavLink to="/register" className="nl topnav-register">
              {t('nav.register')}
            </NavLink>
            <NavLink to="/login" className="btn btn-sm no-underline topnav-cta">
              {t('nav.login')}
            </NavLink>
          </>
        )}
      </div>
      {open ? (
        <div className="mob-p">
          {publicNav
            ? navGroups.map((group) => (
                <div className="g" key={group.labelKey}>
                  <div className="label">{t(group.labelKey)}</div>
                  {group.links.map((link) => (
                    <NavLink key={link.to} to={link.to} onClick={() => setOpen(false)} className={location.pathname === link.to ? 'on' : undefined}>
                      {t(link.key)}
                    </NavLink>
                  ))}
                </div>
              ))
            : null}
          <div className="g lang-mobile">
            <div className="label">{t('nav.language')}</div>
            <LanguageSwitch light />
          </div>
          {user ? (
            <div className="g">
              <NavLink to={staff ? '/backoffice' : '/cabinet'} onClick={() => setOpen(false)}>
                {staff ? t('nav.backoffice') : t('nav.cabinet')}
              </NavLink>
              <button type="button" className="mob-logout" onClick={() => void logout()}>
                {t('nav.logout')}
              </button>
            </div>
          ) : (
            <div className="g">
              <NavLink to="/login" onClick={() => setOpen(false)}>
                {t('nav.login')}
              </NavLink>
              <NavLink to="/register" onClick={() => setOpen(false)}>
                {t('nav.register')}
              </NavLink>
            </div>
          )}
        </div>
      ) : null}
    </header>
  )
}

export function PortalLayout() {
  const { t } = useTranslation()
  const location = useLocation()
  const home = location.pathname === '/'

  return (
    <div className="min-h-svh" style={{ background: 'var(--canvas)' }}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:px-3 focus:py-2">
        {t('skip')}
      </a>
      <div className="notice-bar">{t('demoNotice')}</div>
      <TopNav publicNav />
      <main id="main" className={home ? undefined : 'pub'}>
        <Outlet />
      </main>
      {home ? null : (
        <footer className="pubfoot">
          <div className="b">
            <span>{t('footer.copy', { year: new Date().getFullYear() })}</span>
            <span>
              <NavLink to="/ombudsman">{t('nav.ombudsman')}</NavLink>
              {' · '}
              <NavLink to="/about">{t('nav.about')}</NavLink>
            </span>
          </div>
        </footer>
      )}
    </div>
  )
}

function ShellIcon({ name }: { name: string }) {
  const common = { width: 18, height: 18, fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, 'aria-hidden': true as const }
  switch (name) {
    case 'home':
      return (
        <svg {...common} viewBox="0 0 18 18">
          <path d="M3 8.5L9 3.5l6 5V15H3V8.5Z" />
        </svg>
      )
    case 'doc':
      return (
        <svg {...common} viewBox="0 0 18 18">
          <path d="M5 2.5h6l3 3V15.5H5V2.5Z" />
          <path d="M11 2.5V6h3" />
        </svg>
      )
    case 'bld':
      return (
        <svg {...common} viewBox="0 0 18 18">
          <path d="M4 15.5V5l5-2.5 5 2.5v10.5H4Z" />
          <path d="M7 8h1M10 8h1M7 11h1M10 11h1" />
        </svg>
      )
    case 'fold':
      return (
        <svg {...common} viewBox="0 0 18 18">
          <path d="M3 5h4l1.5 1.5H15v8H3V5Z" />
        </svg>
      )
    case 'bell':
      return (
        <svg {...common} viewBox="0 0 18 18">
          <path d="M4.5 13.5h9l-1-2V8A3.5 3.5 0 0 0 9 4.5 3.5 3.5 0 0 0 5.5 8v3.5l-1 2Z" />
          <path d="M8 15h2" />
        </svg>
      )
    case 'user':
      return (
        <svg {...common} viewBox="0 0 18 18">
          <circle cx="9" cy="6.5" r="2.5" />
          <path d="M4 14.5c.8-2.4 2.4-3.5 5-3.5s4.2 1.1 5 3.5" />
        </svg>
      )
    case 'grid':
      return (
        <svg {...common} viewBox="0 0 18 18">
          <rect x="3" y="3" width="5" height="5" rx="1" />
          <rect x="10" y="3" width="5" height="5" rx="1" />
          <rect x="3" y="10" width="5" height="5" rx="1" />
          <rect x="10" y="10" width="5" height="5" rx="1" />
        </svg>
      )
    case 'chart':
      return (
        <svg {...common} viewBox="0 0 18 18">
          <path d="M3 14.5h12M5 12V8M9 12V5.5M13 12V7" />
        </svg>
      )
    default:
      return (
        <svg {...common} viewBox="0 0 18 18">
          <circle cx="9" cy="9" r="6" />
        </svg>
      )
  }
}

function ShellNav({ links }: { links: { to: string; label: string; icon: string }[] }) {
  return (
    <nav aria-label="Section">
      {links.map((link) => (
        <NavLink key={link.to} to={link.to} end={link.to.split('/').length <= 2} className={({ isActive }) => cn(isActive && 'on')}>
          <ShellIcon name={link.icon} />
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
    { to: '/cabinet', label: t('cabinet.title'), icon: 'home' },
    { to: '/cabinet/applications', label: t('cabinet.applications'), icon: 'doc' },
    { to: '/cabinet/projects', label: t('cabinet.projects'), icon: 'bld' },
    { to: '/cabinet/documents', label: t('cabinet.documents'), icon: 'fold' },
    { to: '/cabinet/notifications', label: t('cabinet.notifications'), icon: 'bell' },
    { to: '/cabinet/profile', label: t('cabinet.profile'), icon: 'user' },
  ]
  return <AppShell userEmail={user?.email} onLogout={() => void logout()} links={links} notice={t('demoNotice')} />
}

export function BackofficeLayout() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const links = [
    { to: '/backoffice', label: t('backoffice.cases'), icon: 'grid' },
    { to: '/backoffice/evaluations', label: t('backoffice.evaluations'), icon: 'doc' },
    { to: '/backoffice/admin', label: t('backoffice.admin'), icon: 'bld' },
    { to: '/backoffice/analytics', label: t('backoffice.analytics'), icon: 'chart' },
  ]
  return <AppShell userEmail={user?.email} onLogout={() => void logout()} links={links} notice={t('backoffice.internal')} />
}

function AppShell({
  userEmail,
  onLogout,
  links,
  notice,
}: {
  userEmail?: string
  onLogout: () => void
  links: { to: string; label: string; icon: string }[]
  notice: string
}) {
  const { t } = useTranslation()
  return (
    <div className="min-h-svh" style={{ background: 'var(--canvas)' }}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:px-3 focus:py-2">
        {t('skip')}
      </a>
      <div className="notice-bar">{notice}</div>
      <TopNav publicNav={false} />
      <div className="shell">
        <aside className="sb">
          <ShellNav links={links} />
          <div className="sb-foot">
            <LanguageSwitch light />
            <p className="cap" style={{ margin: '10px 0 8px' }}>
              {userEmail}
            </p>
            <button type="button" className="btn btn-t" onClick={onLogout}>
              {t('nav.logout')}
            </button>
          </div>
        </aside>
        <main id="main" className="main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
