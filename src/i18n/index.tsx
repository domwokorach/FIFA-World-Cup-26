import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Lang, LocalizedName } from '../types'
import type { Dict } from './strings'
import { LOCALE_TAG } from './strings'
import en from './en'
import { useSettings } from '../settings/SettingsContext'

// English ships in the main bundle (it is the fallback for every missing key)
const loadedDicts: Partial<Record<Lang, Dict>> = { en }
const loaders: Record<Lang, () => Promise<{ default: Dict }>> = {
  en: () => Promise.resolve({ default: en }),
  zh: () => import('./zh'),
  'zh-TW': () => import('./zh-TW'),
  fr: () => import('./fr'),
  ar: () => import('./ar'),
  fa: () => import('./fa'),
  es: () => import('./es'),
  de: () => import('./de'),
  'pt-BR': () => import('./pt-BR'),
  pt: () => import('./pt'),
  it: () => import('./it'),
  nl: () => import('./nl'),
  sv: () => import('./sv'),
  no: () => import('./no'),
  cs: () => import('./cs'),
  hr: () => import('./hr'),
  tr: () => import('./tr'),
  id: () => import('./id'),
  ru: () => import('./ru'),
  uk: () => import('./uk'),
  ko: () => import('./ko'),
  ja: () => import('./ja'),
  uz: () => import('./uz'),
}

interface I18n {
  lang: Lang
  locale: string // BCP-47 tag for Intl
  t: (key: string, vars?: Record<string, string | number>) => string
  /** pick the right variant from a {en,fr,zh} localized name (falls back to en) */
  pick: (name: LocalizedName | null | undefined, fallback?: string) => string
  /** localized country name from an ISO2 code (via Intl.DisplayNames) */
  countryName: (iso2: string | null | undefined, fallback?: string) => string
}

// language variants fall back to the data language FIFA actually serves
// (FIFA's pt feed is Brazilian; zh feed is Simplified)
export const DATA_FALLBACK: Partial<Record<Lang, Lang>> = { 'pt-BR': 'pt', 'zh-TW': 'zh' }

const I18nContext = createContext<I18n | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings()
  const lang = settings.lang
  const [, bump] = useState(0)

  useEffect(() => {
    if (loadedDicts[lang]) return
    let on = true
    loaders[lang]()
      .then((m) => {
        loadedDicts[lang] = m.default
        if (on) bump((x) => x + 1)
      })
      .catch((e: unknown) => {
        // chunk failed to load (offline, deploy replaced hashed files…): keep the
        // English fallback active and leave loadedDicts untouched so a later
        // switch to this language retries the import
        console.error(`i18n: failed to load "${lang}" dictionary`, e)
      })
    return () => {
      on = false
    }
  }, [lang])

  // English placeholder until the selected language's chunk arrives (first switch only)
  const dict = loadedDicts[lang] ?? en

  const value = useMemo<I18n>(() => {
    const locale = LOCALE_TAG[lang]
    let display: Intl.DisplayNames | null = null
    try {
      display = new Intl.DisplayNames([locale], { type: 'region' })
    } catch {
      display = null
    }
    let plural: Intl.PluralRules | null = null
    try {
      plural = new Intl.PluralRules(locale)
    } catch {
      plural = null
    }
    return {
      lang,
      locale,
      t: (key, vars) => {
        // minimal plural support: a dictionary may carry CLDR variants such as
        // 'matchesShown#one' / 'matchesShown#few'; when {n} is a number and the
        // matching variant exists it wins, otherwise the base key is used
        let k = key
        if (plural && vars && typeof vars.n === 'number') {
          const variant = `${key}#${plural.select(vars.n)}`
          if (dict[variant] !== undefined) k = variant
        }
        let s = dict[k] ?? en[key] ?? key
        if (vars) for (const [k2, v] of Object.entries(vars)) s = s.replaceAll(`{${k2}}`, String(v))
        return s
      },
      pick: (name, fallback = '') =>
        (name && (name[lang] || (DATA_FALLBACK[lang] && name[DATA_FALLBACK[lang]]) || name.en)) || fallback,
      countryName: (iso2, fallback = '') => {
        if (!iso2) return fallback
        // Intl.DisplayNames only handles plain region codes, not GB-SCT etc.
        const base = iso2.includes('-') ? null : iso2
        if (base && display) {
          try {
            const n = display.of(base)
            if (n && n !== base) return n
          } catch {
            /* fall through */
          }
        }
        return fallback || iso2
      },
    }
  }, [lang, dict])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n outside I18nProvider')
  return ctx
}
