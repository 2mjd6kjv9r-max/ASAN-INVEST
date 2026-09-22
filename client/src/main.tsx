import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppProviders } from '@/app/providers'
import { AppRouter } from '@/app/router'
import { persistLocale } from '@/lib/i18n'
import { i18n } from '@/lib/i18n'
import './index.css'

persistLocale(i18n.language)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </AppProviders>
  </StrictMode>,
)
