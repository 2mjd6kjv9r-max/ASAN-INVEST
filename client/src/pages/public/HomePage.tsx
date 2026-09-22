import { useQuery } from '@tanstack/react-query'
import { FlagBadge } from '@/components/FlagBadge'
import { ButtonLink, ErrorState, PageHeader, Skeleton } from '@/components/ui'
import { api } from '@/lib/api'
import type { CmsPage, Flag } from '@/lib/types'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'

const FLAGS: Flag[] = ['AUTO', 'ONLINE', 'PHYSICAL', 'PLANNED']

function useReveal() {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-rv]'))
    if (!nodes.length) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) entry.target.classList.add('rv-in')
        }
      },
      { threshold: 0.12 },
    )
    nodes.forEach((n) => io.observe(n))
    return () => io.disconnect()
  }, [])
}

function splitTitle(title: string) {
  const dash = title.includes(' — ') ? ' — ' : title.includes(' - ') ? ' - ' : null
  if (!dash) return { lead: title, rest: null as string | null }
  const [lead, rest] = title.split(dash)
  return { lead: `${lead}${dash}`, rest: rest ?? null }
}

export function HomePage() {
  const { t, i18n } = useTranslation()
  useReveal()
  const page = useQuery({
    queryKey: ['page', 'home', i18n.language],
    queryFn: () => api.page('home', i18n.language) as Promise<CmsPage>,
  })
  const { lead, rest } = splitTitle(t('home.title'))

  return (
    <div>
      <section className="hero">
        <div className="hero-photo">
          <div className="hero-in" style={{ position: 'relative', zIndex: 2 }}>
            <div className="hero-txt">
              <span className="eyebrow">{t('home.kicker')}</span>
              <h1>
                {lead}
                {rest ? <em>{rest}</em> : null}
              </h1>
              {page.isLoading ? <Skeleton className="mt-4 h-16" /> : null}
              {page.isError ? <ErrorState message={t('common.error')} onRetry={() => void page.refetch()} /> : null}
              {page.data ? <p className="hero-sub">{page.data.body}</p> : null}
              <div className="hero-actions">
                <ButtonLink to="/route" style={{ height: 46, padding: '0 26px' }}>
                  {t('home.primaryRoute')}
                </ButtonLink>
                <ButtonLink to="/opportunities" variant="hero" style={{ height: 46, padding: '0 26px' }}>
                  {t('home.primaryOpp')}
                </ButtonLink>
              </div>
            </div>
            <aside className="hero-card">
              <h3>{t('home.honesty')}</h3>
              <p className="cap" style={{ margin: '4px 0 14px' }}>
                {t('estimatedNote')}
              </p>
              <div className="honesty-row">
                {FLAGS.map((flag) => (
                  <div className="honesty-item" key={flag}>
                    <FlagBadge flag={flag} />
                    <p>{t(`flags.${flag}_hint`)}</p>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </section>

      <div className="statband" data-rv>
        <div className="statgrid">
          {FLAGS.map((flag) => (
            <div className="stat" key={flag}>
              <div className="stat-ic">
                <span className={`flag-dot ${flag.toLowerCase()}`} aria-hidden="true" />
              </div>
              <div className="num">{t(`flags.${flag}`)}</div>
              <div className="lbl">{t('home.honesty')}</div>
              <div className="sub">{t(`flags.${flag}_hint`)}</div>
            </div>
          ))}
        </div>
      </div>

      <section className="ctaband" data-rv>
        <h2>{t('home.title')}</h2>
        <p>{t('home.registerSecondary')}</p>
        <div className="row" style={{ justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
          <ButtonLink to="/register" style={{ height: 46, padding: '0 26px' }}>
            {t('nav.register')}
          </ButtonLink>
          <ButtonLink to="/login" variant="hero" style={{ height: 46, padding: '0 26px' }}>
            {t('nav.login')}
          </ButtonLink>
        </div>
      </section>

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
    </div>
  )
}

export function CmsPageView({ slug }: { slug: string }) {
  const { t, i18n } = useTranslation()
  const page = useQuery({
    queryKey: ['page', slug, i18n.language],
    queryFn: () => api.page(slug, i18n.language) as Promise<CmsPage>,
  })
  if (page.isLoading) return <Skeleton className="h-40" />
  if (page.isError) return <ErrorState message={t('common.error')} onRetry={() => void page.refetch()} />
  if (!page.data) return null
  return (
    <article className="max-w-3xl">
      <PageHeader title={page.data.title} />
      <div className="card">
        <p className="whitespace-pre-wrap" style={{ lineHeight: 1.7 }}>
          {page.data.body}
        </p>
      </div>
    </article>
  )
}

export function OpportunitiesPage() {
  const { i18n } = useTranslation()
  const query = useQuery({
    queryKey: ['opportunities', i18n.language],
    queryFn: () =>
      api.opportunities(i18n.language) as Promise<{
        catalogue: { slug: string; title: string; body: string }[]
        zones: { code: string; names: Record<string, string> }[]
      }>,
  })
  return (
    <div>
      <CmsPageView slug="opportunities" />
      {query.isLoading ? <Skeleton className="mt-6 h-24" /> : null}
      {query.data ? (
        <div className="prj-grid mt-8">
          {query.data.catalogue.map((item) => (
            <article key={item.slug} className="card hover-lift">
              <h2 style={{ fontSize: 18 }}>{item.title}</h2>
              <p className="cap mt-2" style={{ lineHeight: 1.65 }}>
                {item.body}
              </p>
            </article>
          ))}
          {query.data.zones.map((zone) => (
            <article key={zone.code} className="card hover-lift">
              <h2 style={{ fontSize: 18 }}>{zone.names[i18n.language] || zone.names.en || zone.code}</h2>
              <p className="cap">{zone.code}</p>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function OmbudsmanPage() {
  const { t } = useTranslation()
  return (
    <div className="max-w-3xl">
      <PageHeader title={t('ombudsman.title')} subtitle={t('ombudsman.body')} />
    </div>
  )
}

export function CompanyRegistrationPage() {
  const { t } = useTranslation()
  const query = useQuery({ queryKey: ['company-registration'], queryFn: api.companyRegistration })
  return (
    <div className="max-w-3xl space-y-4">
      <PageHeader title={t('company.title')} subtitle={t('company.body')} />
      {query.data ? (
        <div className="card space-y-4">
          <p className="muted">{query.data.message}</p>
          <a className="btn btn-p no-underline" href={query.data.url} rel="noreferrer">
            {t('company.cta')}
          </a>
        </div>
      ) : null}
    </div>
  )
}
