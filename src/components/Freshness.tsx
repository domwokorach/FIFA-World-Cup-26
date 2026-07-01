import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'
import { useData } from '../data/DataContext'
import { fmtDateTime } from '../utils/time'

/** "4 minutes ago" via Intl.RelativeTimeFormat — localized with no extra dict keys */
function relative(then: number, now: number, locale: string): string {
  let rtf: Intl.RelativeTimeFormat
  try {
    rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  } catch {
    rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  }
  const sec = Math.round((then - now) / 1000)
  const min = Math.round(sec / 60)
  if (Math.abs(min) < 60) return rtf.format(min, 'minute')
  const hr = Math.round(sec / 3600)
  if (Math.abs(hr) < 24) return rtf.format(hr, 'hour')
  return rtf.format(Math.round(sec / 86400), 'day')
}

/** footer line: "Data updated <date> (<relative>)" — ticks once a minute to stay current */
export default function Freshness() {
  const { t, locale } = useI18n()
  const { data } = useData()
  const [now, setNow] = useState(() => Date.now())

  // tick once a minute so the relative label stays current
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60e3)
    return () => clearInterval(id)
  }, [])

  const iso = data?.meta.updatedAt
  if (!iso) return null
  const then = Date.parse(iso)
  if (!Number.isFinite(then)) return null

  return (
    <>
      {t('updatedAt', { date: fmtDateTime(iso, locale) })} ({relative(then, now, locale)})
    </>
  )
}
