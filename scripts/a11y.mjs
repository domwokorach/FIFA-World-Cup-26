#!/usr/bin/env node
/**
 * Accessibility audit: runs axe-core (WCAG 2.0/2.1 A+AA rules) against every
 * route, in light and dark themes, LTR and RTL. Serves dist/ like smoke.mjs.
 *
 *   bun run build && bun scripts/a11y.mjs
 */
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist')
const PORT = 4174
const CHROME = process.env.CHROME_BIN || '/usr/bin/google-chrome'

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
}

const server = createServer(async (req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0])
  if (p === '/') p = '/index.html'
  try {
    const data = await readFile(path.join(DIST, p))
    res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' })
    res.end(data)
  } catch {
    res.writeHead(404)
    res.end()
  }
})
await new Promise((ok) => server.listen(PORT, ok))

const ROUTES = [
  '#/',
  '#/matches',
  '#/match/400021443',
  '#/groups',
  '#/bracket',
  '#/teams',
  '#/team/FRA',
  '#/venues',
  '#/watch',
  '#/stats',
  '#/game',
  '#/settings',
  '#/more',
]

const PASSES = [
  { lang: 'en', theme: 'light' },
  { lang: 'en', theme: 'dark' },
  { lang: 'ar', theme: 'light' }, // RTL
]

const axeSource = await readFile(path.join(ROOT, 'node_modules/axe-core/axe.min.js'), 'utf8')

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox'],
})

const violations = new Map() // ruleId -> { impact, help, targets:Set, where:Set }
let checks = 0

for (const pass of PASSES) {
  const ctx = await browser.createBrowserContext()
  const page = await ctx.newPage()
  await page.setViewport({ width: 1280, height: 900 })
  await page.evaluateOnNewDocument((s) => {
    localStorage.setItem('wc2026-settings', JSON.stringify(s))
  }, pass)

  for (const route of ROUTES) {
    await page.goto(`http://localhost:${PORT}/${route}`, { waitUntil: 'networkidle2' })
    await new Promise((r) => setTimeout(r, 450))
    await page.evaluate(axeSource)
    const res = await page.evaluate(() =>
      globalThis.axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
      }),
    )
    checks++
    for (const v of res.violations) {
      const cur = violations.get(v.id) ?? {
        impact: v.impact,
        help: v.help,
        targets: new Set(),
        where: new Set(),
      }
      for (const n of v.nodes.slice(0, 4)) cur.targets.add(n.target.join(' '))
      cur.where.add(`${route}@${pass.lang}/${pass.theme}`)
      violations.set(v.id, cur)
    }
    process.stdout.write(
      res.violations.length
        ? `!!   ${route} ${pass.lang}/${pass.theme}: ${res.violations.map((v) => v.id).join(', ')}\n`
        : `ok   ${route} ${pass.lang}/${pass.theme}\n`,
    )
  }
  await ctx.close()
}

await browser.close()
server.close()

console.log(`\n${checks} page-passes audited`)
if (violations.size === 0) {
  console.log('axe: no WCAG A/AA violations')
} else {
  console.log(`axe: ${violations.size} distinct violation rule(s):\n`)
  for (const [id, v] of violations) {
    console.log(`[${v.impact}] ${id} — ${v.help}`)
    console.log(
      `  pages: ${[...v.where].slice(0, 6).join(', ')}${v.where.size > 6 ? ` +${v.where.size - 6}` : ''}`,
    )
    for (const t of [...v.targets].slice(0, 5)) console.log(`  ↳ ${t}`)
    console.log()
  }
  process.exitCode = 1
}
