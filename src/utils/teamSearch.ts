import type { Lang, Team } from '../types'

// common alternate names people actually type (FIFA's official English
// names are formal: "USA", "Korea Republic", "Czechia", "Türkiye"...)
export const SEARCH_ALIASES: Record<string, string> = {
  USA: 'United States America US',
  KOR: 'South Korea',
  CIV: 'Ivory Coast',
  CZE: 'Czech Republic',
  TUR: 'Turkey',
  CPV: 'Cape Verde',
  COD: 'DR Congo Democratic Republic of the Congo Congo-Kinshasa',
  NED: 'Holland',
  GER: 'Deutschland',
  KSA: 'Saudi',
  RSA: 'South Africa',
  NZL: 'New Zealand',
}

/** lowercase + strip diacritics so "cote" finds Côte d'Ivoire, "turkiye" finds Türkiye */
export const norm = (v: string) =>
  v
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

/** space-separated search terms, normalized; empty string → no terms */
export const searchTerms = (query: string): string[] => norm(query.trim()).split(/\s+/).filter(Boolean)

/** searchable text for a team: code + nickname + the names the user can actually
 *  see (their language, the data-fallback language, English) + common aliases.
 *  All 12 name locales would cross-match noise, so we stick to those. */
export function teamHaystack(team: Team, lang: Lang, fallbackLang?: Lang): string {
  return norm(
    [
      team.code,
      team.nickname ?? '',
      team.name[lang] ?? '',
      (fallbackLang && team.name[fallbackLang]) || '',
      team.name.en ?? '',
      SEARCH_ALIASES[team.code] ?? '',
    ].join(' '),
  )
}

/** build a predicate from a query: space-separated terms AND together
 *  ("ko pu" finds Korea Republic, "墨 哥" finds 墨西哥). Empty query matches all. */
export function makeTeamMatcher(query: string, lang: Lang, fallbackLang?: Lang): (team: Team) => boolean {
  const terms = searchTerms(query)
  if (!terms.length) return () => true
  return (team) => {
    const hay = teamHaystack(team, lang, fallbackLang)
    return terms.every((term) => hay.includes(term))
  }
}
