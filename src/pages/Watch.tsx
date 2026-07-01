import { useMemo, useRef } from 'react'
import type { BroadcastChannel } from '../types'
import { useI18n } from '../i18n'
import { useAppData } from '../data/DataContext'
import { useSettings } from '../settings/SettingsContext'
import { detectMarketOrNull } from '../utils/helpers'
import { flagEmoji, localizedNote } from '../utils/helpers'
import Icon from '../components/Icon'
import './watch.css'

const TYPE_KEY: Record<BroadcastChannel['type'], string> = {
  tv: 'typeTv',
  streaming: 'typeStreaming',
  'tv+streaming': 'typeTvStreaming',
}

export default function Watch() {
  const { t, countryName, pick } = useI18n()
  const { broadcasters } = useAppData()
  const { settings, setMarket } = useSettings()

  const markets = useMemo(() => {
    const list = broadcasters?.markets ?? []
    return list.slice().sort((a, b) => a.iso2.localeCompare(b.iso2)) // fixed ISO-code order in every language
  }, [broadcasters])

  const codes = useMemo(() => new Set(markets.map((m) => m.iso2)), [markets])
  // auto-detection only applies when the user's country actually has data;
  // otherwise market stays null and the user picks explicitly below
  const sel = settings.market && codes.has(settings.market) ? settings.market : detectMarketOrNull(codes)
  const panelRef = useRef<HTMLDivElement>(null)

  const pickFromGrid = (iso2: string) => {
    setMarket(iso2)
    panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (!broadcasters || markets.length === 0) {
    return (
      <div>
        <div className="page-head">
          <h1>{t('watchTitle')}</h1>
          <p>{t('watchSub')}</p>
        </div>
        <div className="empty">
          <Icon name="tv" size={30} />
          <div>{t('none')}</div>
        </div>
      </div>
    )
  }

  const market = sel ? (markets.find((m) => m.iso2 === sel) ?? null) : null
  const channels = market ? market.channels.slice().sort((a, b) => Number(b.free) - Number(a.free)) : []

  return (
    <div>
      <div className="page-head">
        <h1>{t('watchTitle')}</h1>
        <p>{t('watchSub')}</p>
      </div>

      <div ref={panelRef} className="watch-top">
        <section className="card watch-panel">
          <div className="watch-panel-head">
            {/* the heading itself is the market selector */}
            <select
              className="watch-h2-select"
              value={market?.iso2 ?? ''}
              onChange={(e) => {
                if (e.target.value) setMarket(e.target.value)
              }}
              aria-label={t('yourCountryHint')}
              title={t('yourCountryHint')}
            >
              {!market && <option value="">{t('none')}</option>}
              {markets.map((mk) => (
                <option key={mk.iso2} value={mk.iso2}>
                  {flagEmoji(mk.iso2)}
                  {countryName(mk.iso2, mk.iso2)}
                </option>
              ))}
            </select>
            <p className={market ? 'muted small watch-hint' : 'watch-hint watch-hint-strong'}>
              {t('yourCountryHint')}
            </p>
          </div>
          {market && (
            <div>
              {channels.map((c, i) => (
                <div key={`${c.name}-${i}`} className="watch-ch">
                  <div className="watch-ch-line">
                    <strong className="watch-ch-name">{c.name}</strong>
                    <span className={c.free ? 'chip chip-free' : 'chip'}>
                      {c.free ? t('freeChannel') : t('paidChannel')}
                    </span>
                    <span className="chip">{t(TYPE_KEY[c.type])}</span>
                    {c.lang && <span className="chip watch-ch-lang">{c.lang.toUpperCase()}</span>}
                  </div>
                  {localizedNote(c.note, pick) && (
                    <div className="muted small watch-ch-note">{localizedNote(c.note, pick)}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="section-title watch-overview-head">
        <span className="chip chip-free">{t('freeChannel')}</span>
        <h2>{t('typeTv')}</h2>
      </div>
      <div className="watch-grid">
        {markets.map((mk) => {
          const free = mk.channels.filter((c) => c.free)
          return (
            <button
              key={mk.iso2}
              type="button"
              className={`card watch-mini${mk.iso2 === market?.iso2 ? ' on' : ''}`}
              onClick={() => pickFromGrid(mk.iso2)}
            >
              <span className="watch-mini-head">
                <span className="watch-mini-name">
                  {flagEmoji(mk.iso2)}
                  {countryName(mk.iso2, mk.iso2)}
                </span>
              </span>
              <span className={`watch-mini-free${free.length ? '' : ' none'}`}>
                {free.length ? free.map((c) => c.name).join(' · ') : t('none')}
              </span>
            </button>
          )
        })}
      </div>

      <p className="muted small watch-disclaimer">{t('watchDisclaimer')}</p>
    </div>
  )
}
