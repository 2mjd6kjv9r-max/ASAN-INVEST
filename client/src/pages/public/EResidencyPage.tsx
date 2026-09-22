import { FlagBadge } from '@/components/FlagBadge'
import { PlanNotice } from '@/components/PlanNotice'
import { Alert, Button, ButtonLink, Field, PageHeader, Textarea } from '@/components/ui'
import { useAuth } from '@/app/providers'
import { api, isApiError } from '@/lib/api'
import type { ApplicationDto, EResidencyPage } from '@/lib/types'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

export function EResidencyPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [motivation, setMotivation] = useState('')
  const page = useQuery({ queryKey: ['e-residency'], queryFn: () => api.eResidency() as Promise<EResidencyPage> })
  const apply = useMutation({
    mutationFn: () =>
      api.createApplication({
        typeCode: 'e_residency',
        source: 'NEW_APPLICATION',
        answers: { motivation },
      }) as Promise<ApplicationDto>,
    onSuccess: (row) => navigate(`/cabinet/applications/${row.id}`),
  })

  const data = page.data ?? {
    flag: 'PLANNED' as const,
    legalStatus: 'not_in_force',
    grantAvailable: false,
    applyEnabled: false,
    title: t('phase3.eResidencyTitle'),
    body: t('phase3.eResidencyInterest'),
  }
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title={data.title || t('phase3.eResidencyTitle')} subtitle={t('phase3.eResidencyLegal')} />
      <div className="card space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <FlagBadge flag={data.flag} />
            <span className="cap">{t('phase3.availableFalse')}</span>
            <span className="badge b-gray">{data.legalStatus}</span>
          </div>
          <p style={{ lineHeight: 1.7 }}>{data.body}</p>
          <PlanNotice available={data.applyEnabled} flag={data.flag} message={t('phase3.eResidencyInterest')} />
        </div>

      {user ? (
        <form
          className="card space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            apply.mutate()
          }}
        >
          <h2 className="text-lg">{t('phase3.eResidencyForm')}</h2>
          <Field label={t('phase3.motivation')} hint={t('phase3.eResidencyFormHint')}>
            <Textarea value={motivation} onChange={(e) => setMotivation(e.target.value)} />
          </Field>
          {apply.isError ? (
            <Alert tone="warning">{isApiError(apply.error) ? apply.error.message : t('common.error')}</Alert>
          ) : null}
          <Button type="submit" loading={apply.isPending}>
            {t('phase3.expressInterest')}
          </Button>
        </form>
      ) : (
        <div className="card space-y-3">
          <p className="muted">{t('phase3.eResidencySignIn')}</p>
          <ButtonLink to="/register">{t('nav.register')}</ButtonLink>
        </div>
      )}
    </div>
  )
}
