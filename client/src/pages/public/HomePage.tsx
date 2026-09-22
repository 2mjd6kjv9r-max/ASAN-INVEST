import { useQuery } from '@tanstack/react-query'
import { FlagBadge } from '@/components/FlagBadge'
import { ButtonLink, ErrorState, PageHeader, Skeleton } from '@/components/ui'
import { api } from '@/lib/api'
import type { CmsPage } from '@/lib/types'
import { useTranslation } from 'react-i18next'

export function HomePage() {
  const { t, i18n } = useTranslation()
  const page = useQuery({
    queryKey: ['page', 'home', i18n.language],
    queryFn: () => api.page('home', i18n.language) as Promise<CmsPage>,
  })

  return (
    <div className="space-y-10">
      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-navy-700">{t('home.kicker')}</p>
          <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{t('home.title')}</h1>
          {page.isLoading ? <Skeleton className="mt-4 h-16" /> : null}
          {page.isError ? <ErrorState message={t('common.error')} onRetry={() => void page.refetch()} /> : null}
          {page.data ? <p className="mt-4 max-w-2xl text-muted">{page.data.body}</p> : null}
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink to="/route">{t('home.primaryRoute')}</ButtonLink>
            <ButtonLink to="/opportunities" variant="secondary">
              {t('home.primaryOpp')}
            </ButtonLink>
          </div>
          <p className="mt-3">
            <a href="/register" className="text-sm text-muted">
              {t('home.registerSecondary')}
            </a>
          </p>
        </div>
        <aside className="space-y-3 rounded-sm border border-line bg-white p-5">
          <h2 className="text-lg">{t('home.honesty')}</h2>
          <FlagBadge flag="AUTO" />
          <p className="text-sm text-muted">{t('flags.AUTO_hint')}</p>
          <FlagBadge flag="ONLINE" />
          <p className="text-sm text-muted">{t('flags.ONLINE_hint')}</p>
          <FlagBadge flag="PHYSICAL" />
          <p className="text-sm text-muted">{t('flags.PHYSICAL_hint')}</p>
          <FlagBadge flag="PLANNED" />
          <p className="text-sm text-muted">{t('flags.PLANNED_hint')}</p>
        </aside>
      </section>
      <p className="text-sm text-muted">{t('estimatedNote')}</p>
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
    <article className="prose-none max-w-3xl">
      <PageHeader title={page.data.title} />
      <p className="whitespace-pre-wrap text-ink">{page.data.body}</p>
    </article>
  )
}

export function OpportunitiesPage() {
  const { i18n } = useTranslation()
  const query = useQuery({
    queryKey: ['opportunities', i18n.language],
    queryFn: () => api.opportunities(i18n.language) as Promise<{ catalogue: { slug: string; title: string; body: string }[]; zones: { code: string; names: Record<string, string> }[] }>,
  })
  return (
    <div>
      <CmsPageView slug="opportunities" />
      {query.isLoading ? <Skeleton className="mt-6 h-24" /> : null}
      {query.data ? (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {query.data.catalogue.map((item) => (
            <article key={item.slug} className="rounded-sm border border-line bg-white p-4">
              <h2 className="text-lg">{item.title}</h2>
              <p className="mt-2 text-sm text-muted">{item.body}</p>
            </article>
          ))}
          {query.data.zones.map((zone) => (
            <article key={zone.code} className="rounded-sm border border-line bg-white p-4">
              <h2 className="text-lg">{zone.names[i18n.language] || zone.names.en || zone.code}</h2>
              <p className="text-sm text-muted">{zone.code}</p>
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
        <>
          <p className="text-muted">{query.data.message}</p>
          <a className="inline-flex items-center justify-center rounded-sm bg-navy px-4 py-2 text-sm font-semibold text-white no-underline" href={query.data.url} rel="noreferrer">
            {t('company.cta')}
          </a>
        </>
      ) : null}
    </div>
  )
}
