import { useState } from 'react'
import Icon from './Icon'

/** small circled "i"; reveals a tooltip on hover, focus, or tap (works on touch
 *  where there is no hover). Tooltip text is plain, already-localized copy. */
export default function InfoDot({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="infodot">
      <button
        type="button"
        className="infodot-btn"
        aria-label={text}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
      >
        <Icon name="info" size={14} />
      </button>
      <span className={`infodot-tip${open ? ' open' : ''}`} role="tooltip">
        {text}
      </span>
    </span>
  )
}
