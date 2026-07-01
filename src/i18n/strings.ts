import type { Lang } from '../types'

// Dictionaries live in one file per language (en.ts / zh.ts / fr.ts).
// English is always bundled as the fallback; other languages are loaded
// on demand by I18nProvider (see ./index.tsx).

export type Dict = Record<string, string>

// ar uses Latin digits (-u-nu-latn) so Intl output matches the raw numbers in markup
export const LOCALE_TAG: Record<Lang, string> = {
  en: 'en',
  fr: 'fr',
  es: 'es',
  pt: 'pt-PT',
  'pt-BR': 'pt-BR',
  de: 'de',
  nl: 'nl',
  cs: 'cs',
  hr: 'hr',
  sv: 'sv',
  no: 'nb',
  ar: 'ar-u-nu-latn',
  fa: 'fa-u-nu-latn',
  tr: 'tr',
  uz: 'uz',
  ja: 'ja',
  ko: 'ko',
  zh: 'zh-CN',
  'zh-TW': 'zh-TW',
  it: 'it',
  ru: 'ru',
  uk: 'uk',
  id: 'id',
}

// key order = display order: languages of qualified nations first (grouped by
// family/region), then languages kept for non-qualified audiences (zh/it/id...)
export const LANG_LABEL: Record<Lang, string> = {
  en: 'English',
  fr: 'Français',
  es: 'Español',
  pt: 'Português (Portugal)',
  'pt-BR': 'Português (Brasil)',
  de: 'Deutsch',
  nl: 'Nederlands',
  cs: 'Čeština',
  hr: 'Hrvatski',
  sv: 'Svenska',
  no: 'Norsk',
  ar: 'العربية',
  fa: 'فارسی',
  tr: 'Türkçe',
  uz: 'Oʻzbekcha',
  ja: '日本語',
  ko: '한국어',
  zh: '简体中文',
  'zh-TW': '繁體中文',
  it: 'Italiano',
  ru: 'Русский',
  uk: 'Українська',
  id: 'Bahasa Indonesia',
}

export const RTL_LANGS: ReadonlySet<Lang> = new Set<Lang>(['ar', 'fa'])
