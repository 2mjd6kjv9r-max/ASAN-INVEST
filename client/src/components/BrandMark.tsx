import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function FlowerMark() {
  return (
    <svg className="flw" viewBox="0 0 100 100" aria-hidden="true">
      <g fill="#fff">
        <ellipse cx="50" cy="21" rx="7" ry="18" transform="rotate(0 50 50)" opacity="1" />
        <ellipse cx="50" cy="21" rx="7" ry="18" transform="rotate(45 50 50)" opacity="0.72" />
        <ellipse cx="50" cy="21" rx="7" ry="18" transform="rotate(90 50 50)" opacity="1" />
        <ellipse cx="50" cy="21" rx="7" ry="18" transform="rotate(135 50 50)" opacity="0.72" />
        <ellipse cx="50" cy="21" rx="7" ry="18" transform="rotate(180 50 50)" opacity="1" />
        <ellipse cx="50" cy="21" rx="7" ry="18" transform="rotate(225 50 50)" opacity="0.72" />
        <ellipse cx="50" cy="21" rx="7" ry="18" transform="rotate(270 50 50)" opacity="1" />
        <ellipse cx="50" cy="21" rx="7" ry="18" transform="rotate(315 50 50)" opacity="0.72" />
      </g>
      <circle cx="50" cy="50" r="9" fill="#1B72E8" />
      <circle cx="50" cy="50" r="5" fill="#fff" />
    </svg>
  )
}

export function BrandMark({ to = '/' }: { to?: string }) {
  const { t } = useTranslation()
  return (
    <Link to={to} className="logo">
      <FlowerMark />
      <span className="lgw">
        asan <b>invest</b>
        <i>{t('brandSub')}</i>
      </span>
    </Link>
  )
}
