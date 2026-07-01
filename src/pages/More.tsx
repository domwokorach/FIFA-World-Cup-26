import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useSettings } from '../settings/SettingsContext'
import { useAppData } from '../data/DataContext'
import { LANG_LABEL } from '../i18n/strings'
import type { Lang, Theme } from '../types'
import Icon from '../components/Icon'
import type { IconName } from '../components/Icon'
import { groupStageComplete } from '../utils/helpers'

// everything that is NOT on the bottom tab bar; the first entry mirrors the
// stage-aware tab swap (Groups on the bar -> Bracket here, and vice versa)
const LINKS: { to: string; key: string; icon: IconName }[] = [
  { to: '/venues', key: 'navVenues', icon: 'stadium' },
  { to: '/watch', key: 'navWatch', icon: 'tv' },
  { to: '/stats', key: 'navStats', icon: 'chart' },
  { to: '/settings', key: 'navSettings', icon: 'gear' },
]

export default function More() {
  const { t } = useI18n()
  const { settings, setLang, setTheme } = useSettings()
  const { standings } = useAppData()
  const offBar: { to: string; key: string; icon: IconName } = groupStageComplete(standings)
    ? { to: '/groups', key: 'navGroups', icon: 'table' }
    : { to: '/bracket', key: 'navBracket', icon: 'bracket' }

  return (
    <div>
      <div className="page-head">
        <h1>{t('appName')}</h1>
        <p>{t('appSub')}</p>
      </div>

      <div className="cards-grid">
        {[offBar, ...LINKS].map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="card card-pad"
            style={{ display: 'flex', alignItems: 'center', gap: 12 }}
          >
            <Icon name={l.icon} size={24} />
            <strong>{t(l.key)}</strong>
          </Link>
        ))}
      </div>

      <div className="section-title">
        <h2>{t('settingLang')}</h2>
      </div>
      <div className="seg">
        {(Object.keys(LANG_LABEL) as Lang[]).map((l) => (
          <button
            type="button"
            key={l}
            className={settings.lang === l ? 'on' : ''}
            onClick={() => setLang(l)}
          >
            {LANG_LABEL[l]}
          </button>
        ))}
      </div>

      <div className="section-title">
        <h2>{t('settingTheme')}</h2>
      </div>
      <div className="seg">
        {(['auto', 'light', 'dark'] as Theme[]).map((th) => (
          <button
            type="button"
            key={th}
            className={settings.theme === th ? 'on' : ''}
            onClick={() => setTheme(th)}
          >
            {t(th === 'auto' ? 'themeAuto' : th === 'light' ? 'themeLight' : 'themeDark')}
          </button>
        ))}
      </div>
    </div>
  )
}
