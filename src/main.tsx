import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import './index.css'

// PWA: keeps the app shell cached for offline use and silently picks up new deploys.
// The hourly update() check lets long-lived sessions (HashRouter never issues real
// navigations) pick up new code within an hour; data-only Pages deploys produce a
// byte-identical sw.js, so this never causes spurious reloads.
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    setInterval(() => registration?.update(), 3600000)
  },
})
import App from './App'
import { SettingsProvider } from './settings/SettingsContext'
import { I18nProvider } from './i18n'
import { DataProvider } from './data/DataContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <I18nProvider>
        <DataProvider>
          <HashRouter>
            <App />
          </HashRouter>
        </DataProvider>
      </I18nProvider>
    </SettingsProvider>
  </StrictMode>,
)
