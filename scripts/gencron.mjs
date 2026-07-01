#!/usr/bin/env node
/**
 * Generates the cron schedule for .github/workflows/update-data.yml from the
 * fixed match calendar in public/data/matches.json (semi-live scores):
 *
 *   - every match: kickoff - 10 min            (lineups appear pre-match)
 *   - then every 15 min from kickoff:
 *       group stage : kickoff +0..+120 min     (covers full time + stoppage)
 *       knockout    : kickoff +0..+180 min     (extra time / penalties)
 *   - plus a daily run at 00:00 America/New_York (04:00 UTC — the whole
 *     tournament, 2026-06-11..07-19, falls in EDT)
 *
 * Entries sharing the same minute/hour/month are merged into day-lists, so the
 * whole tournament compresses to a manageable set of cron lines. Re-run with
 * `bun run gencron` if FIFA ever shifts a kickoff.
 *
 * `bun scripts/gencron.mjs --check` regenerates the block in memory and
 * compares it with the committed workflow: exit 0 if identical, exit 1 on
 * drift. Nothing is written in --check mode.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const WF = path.join(ROOT, '.github', 'workflows', 'update-data.yml')

const CHECK = process.argv.includes('--check')

const { matches } = JSON.parse(await fs.readFile(path.join(ROOT, 'public', 'data', 'matches.json'), 'utf8'))

// collect update moments (UTC)
const moments = []
for (const m of matches) {
  const ko = Date.parse(m.date)
  moments.push(ko - 10 * 60e3) // pre-match lineups pull
  const lastMin = m.stage === 'group' ? 120 : 180
  for (let t = 0; t <= lastMin; t += 15) moments.push(ko + t * 60e3)
}

// merge: same minute+hour+month -> list of days
const groups = new Map()
for (const ms of moments) {
  const d = new Date(ms)
  const key = `${d.getUTCMinutes()}|${d.getUTCHours()}|${d.getUTCMonth() + 1}`
  const set = groups.get(key) ?? new Set()
  set.add(d.getUTCDate())
  groups.set(key, set)
}

const lines = []
lines.push(`    - cron: '0 4 * * *' # daily, 00:00 America/New_York (EDT)`)
const sortedKeys = [...groups.keys()].sort((a, b) => {
  const [ma, ha, moa] = a.split('|').map(Number)
  const [mb, hb, mob] = b.split('|').map(Number)
  return moa - mob || ha - hb || ma - mb
})
for (const key of sortedKeys) {
  const [min, hour, month] = key.split('|').map(Number)
  const days = [...groups.get(key)].sort((a, b) => a - b).join(',')
  lines.push(`    - cron: '${min} ${hour} ${days} ${month} *'`)
}

const block = [
  '    # BEGIN GENERATED SCHEDULE (bun run gencron — derived from the match calendar)',
  ...lines,
  '    # END GENERATED SCHEDULE',
].join('\n')

const re = / {4}# BEGIN GENERATED SCHEDULE[\s\S]*? {4}# END GENERATED SCHEDULE/
let yml = await fs.readFile(WF, 'utf8')

if (CHECK) {
  const current = re.exec(yml)?.[0]
  if (current === block) {
    console.log('schedule up to date')
  } else {
    console.error('SCHEDULE DRIFT: run bun run gencron')
    process.exit(1)
  }
} else {
  if (re.test(yml)) {
    yml = yml.replace(re, () => block)
  } else {
    // first run: replace the whole schedule list under `schedule:`
    yml = yml.replace(/ {2}schedule:\n(?: {4}- cron: [^\n]*\n)+/, () => `  schedule:\n${block}\n`)
  }
  await fs.writeFile(WF, yml)
  console.log(`wrote ${lines.length} cron entries (${moments.length} match moments merged)`)
}
