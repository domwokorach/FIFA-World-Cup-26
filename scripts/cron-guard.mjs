// Gate for the 15-minute cron grid: exit with run=true only when "now" is
// inside a match window (kickoff-25min .. kickoff+3h45min) or in the daily
// full-refresh slot (04:00-04:14 UTC). The dense generated cron table proved
// unreliable: GitHub's scheduler drops entries from very long schedule lists,
// so the workflow now fires on a coarse grid and decides here, cheaply.
import fs from 'node:fs'

const now = process.env.CRON_GUARD_NOW ? Date.parse(process.env.CRON_GUARD_NOW) : Date.now()
const PRE = 25 * 60 * 1000
const POST = 225 * 60 * 1000

const d = new Date(now)
const daily = d.getUTCHours() === 4 && d.getUTCMinutes() < 15

const { matches } = JSON.parse(fs.readFileSync('public/data/matches.json', 'utf8'))
const inWindow = matches.some((m) => {
  const ko = Date.parse(m.date)
  return now >= ko - PRE && now <= ko + POST
})

const run = daily || inWindow

// bridge: if a window opens within 4h, report how long to sleep so a stray
// cron hit (GitHub fires our grid at lottery-like times) can wait for it
const BRIDGE_MAX = 4 * 3600 * 1000
let wait = ''
if (!run) {
  const starts = matches.map((m) => Date.parse(m.date) - PRE).filter((t) => t > now && t - now <= BRIDGE_MAX)
  if (starts.length) wait = String(Math.ceil((Math.min(...starts) - now) / 1000) + 15)
}

console.log(
  `cron-guard: now=${d.toISOString()} daily=${daily} inWindow=${inWindow} -> run=${run} wait=${wait || '-'}`,
)
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `run=${run}\nwait=${wait}\n`)
