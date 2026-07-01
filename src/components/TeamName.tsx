import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useAppData } from '../data/DataContext'
import Flag from './Flag'

interface TeamNameProps {
  code: string
  flagSize?: number
  link?: boolean
  bold?: boolean
  className?: string
}

/** flag + localized team name, optionally linking to the team page */
export default function TeamName({
  code,
  flagSize = 22,
  link = true,
  bold = false,
  className = '',
}: TeamNameProps) {
  const { pick } = useI18n()
  const { teams } = useAppData()
  const team = teams[code]
  const name = team ? pick(team.name, code) : code
  const inner = (
    <>
      <Flag team={team} size={flagSize} />
      <span className="nm" style={bold ? { fontWeight: 700 } : undefined}>
        {name}
      </span>
    </>
  )
  if (link && team) {
    return (
      <Link className={`team-inline ${className}`} to={`/team/${code}`}>
        {inner}
      </Link>
    )
  }
  return <span className={`team-inline ${className}`}>{inner}</span>
}
