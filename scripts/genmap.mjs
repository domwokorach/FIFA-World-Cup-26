#!/usr/bin/env node
/**
 * Generates src/data/na-map.json: real North America country outlines (Natural Earth 50m)
 * projected with a Lambert conformal conic (the standard projection for NA maps),
 * simplified for the venues-page SVG. Run: bun run genmap (a build-time tool; the
 * output is committed, so this only needs re-running if the map design changes).
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC_GEOJSON = process.env.NE_GEOJSON || '/tmp/ne50.geojson'
const SRC_LAKES = process.env.NE_LAKES || '/tmp/ne50_lakes.geojson'
const NE_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson'
const NE_LAKES_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_lakes.geojson'
const OUT = path.join(ROOT, 'src', 'data', 'na-map.json')

const HOSTS = ['US', 'CA', 'MX']
const CONTEXT = ['GL', 'GT', 'BZ', 'SV', 'HN', 'NI', 'CR', 'PA', 'CU', 'JM', 'HT', 'DO', 'BS', 'PR']

// ---- Lambert conformal conic (parallels 20°/60°, central meridian 96°W) ----
const D = Math.PI / 180
const PHI1 = 20 * D,
  PHI2 = 60 * D,
  LON0 = -96,
  PHI0 = 40 * D
const n =
  Math.log(Math.cos(PHI1) / Math.cos(PHI2)) /
  Math.log(Math.tan(Math.PI / 4 + PHI2 / 2) / Math.tan(Math.PI / 4 + PHI1 / 2))
const F = (Math.cos(PHI1) * Math.tan(Math.PI / 4 + PHI1 / 2) ** n) / n
const rho0 = F / Math.tan(Math.PI / 4 + PHI0 / 2) ** n

function projectRaw(lat, lon) {
  const rho = F / Math.tan(Math.PI / 4 + (lat * D) / 2) ** n
  const th = n * (lon - LON0) * D
  return [rho * Math.sin(th), rho0 - rho * Math.cos(th)]
}

// ---- ring filtering / simplification ----
function centroid(ring) {
  let x = 0,
    y = 0
  for (const p of ring) {
    x += p[0]
    y += p[1]
  }
  return [x / ring.length, y / ring.length]
}

function keepRing(ring, iso) {
  const [clon, clat] = centroid(ring)
  if (clon > 0) return false // dateline-crossing Aleutians
  if (iso === 'US') {
    if (clon < -169) return false // far Aleutians
    if (clat < 30 && clon < -150) return false // Hawaii
    if (clat < 15) return false // minor outlying islands
  }
  return true
}

function perpDist(p, a, b) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1]
  const len2 = dx * dx + dy * dy
  if (!len2) return Math.hypot(p[0] - a[0], p[1] - a[1])
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2))
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy)
}

function douglasPeucker(pts, eps) {
  if (pts.length < 3) return pts
  let maxD = 0,
    idx = 0
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perpDist(pts[i], pts[0], pts[pts.length - 1])
    if (d > maxD) {
      maxD = d
      idx = i
    }
  }
  if (maxD <= eps) return [pts[0], pts[pts.length - 1]]
  const left = douglasPeucker(pts.slice(0, idx + 1), eps)
  const right = douglasPeucker(pts.slice(idx), eps)
  return left.slice(0, -1).concat(right)
}

function ringArea(pts) {
  let a = 0
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i],
      [x2, y2] = pts[(i + 1) % pts.length]
    a += x1 * y2 - x2 * y1
  }
  return Math.abs(a / 2)
}

async function main() {
  let raw
  try {
    raw = await fs.readFile(SRC_GEOJSON, 'utf8')
  } catch {
    console.log('downloading Natural Earth 50m countries…')
    const res = await fetch(NE_URL)
    raw = await res.text()
    await fs.writeFile(SRC_GEOJSON, raw)
  }
  const geo = JSON.parse(raw)

  const iso = (f) => (f.properties.ISO_A2_EH !== '-99' ? f.properties.ISO_A2_EH : f.properties.ISO_A2)
  const wanted = new Set([...HOSTS, ...CONTEXT])
  const features = geo.features.filter((f) => wanted.has(iso(f)))

  // project all kept polygons (outer ring + holes — the Great Lakes are holes in the US/CA polygons)
  const projected = {} // iso -> [ { outer: [[x,y],...], holes: [ring,...] } ]
  for (const f of features) {
    const code = iso(f)
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
    for (const poly of polys) {
      const outer = poly[0]
      if (!keepRing(outer, code)) continue
      const proj = (ring) => ring.map(([lon, lat]) => projectRaw(lat, lon))
      projected[code] ??= []
      projected[code].push({ outer: proj(outer), holes: poly.slice(1).map(proj) })
    }
  }

  // frame the host region (not the full Arctic extent): lat 14–58.5, lon -129…-61.
  // paths outside the frame are dropped; the SVG viewBox crops anything that overlaps the edge.
  let minX = 1e9,
    minY = 1e9,
    maxX = -1e9,
    maxY = -1e9
  for (let lat = 14; lat <= 58.5; lat += 0.5) {
    for (let lon = -129; lon <= -61; lon += 0.5) {
      const [x, y] = projectRaw(lat, lon)
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  const W = 980
  const PAD = 8
  const scale = (W - 2 * PAD) / (maxX - minX)
  const H = Math.round((maxY - minY) * scale + 2 * PAD)
  const tx = PAD - minX * scale
  // screen y grows downward; projected y grows northward — flip
  const toScreen = ([x, y]) => [x * scale + tx, H - PAD - (y - minY) * scale]

  const inFrame = (pts) => {
    let x0 = 1e9,
      y0 = 1e9,
      x1 = -1e9,
      y1 = -1e9
    for (const [x, y] of pts) {
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
    return x1 > 0 && x0 < W && y1 > 0 && y0 < H
  }

  const ringPath = (ring, eps, minArea) => {
    let pts = ring.map(toScreen)
    if (!inFrame(pts)) return null
    pts = douglasPeucker(pts, eps)
    if (pts.length < 4 || ringArea(pts) < minArea) return null
    return `M${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L')}Z`
  }

  // holes (lakes) render as cut-outs via fill-rule="evenodd"; keep only major ones
  const pathOf = (polys, eps, minArea, holeMinArea) => {
    const parts = []
    for (const poly of polys) {
      const outer = ringPath(poly.outer, eps, minArea)
      if (!outer) continue
      parts.push(outer)
      for (const hole of poly.holes) {
        const hp = ringPath(hole, eps, holeMinArea)
        if (hp) parts.push(hp)
      }
    }
    return parts.join('')
  }

  const countries = {}
  for (const code of HOSTS) countries[code] = pathOf(projected[code] || [], 0.8, 7, 14)
  const context = CONTEXT.map((c) => pathOf(projected[c] || [], 1.2, 9, 30)).join('')

  // major lakes as their own water layer (NE country polygons don't carve them out)
  let lakesRaw
  try {
    lakesRaw = await fs.readFile(SRC_LAKES, 'utf8')
  } catch {
    console.log('downloading Natural Earth 50m lakes…')
    const res = await fetch(NE_LAKES_URL)
    lakesRaw = await res.text()
    await fs.writeFile(SRC_LAKES, lakesRaw)
  }
  const lakesGeo = JSON.parse(lakesRaw)
  const lakeParts = []
  for (const f of lakesGeo.features) {
    if ((f.properties.scalerank ?? 9) > 1) continue // only the big ones
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
    for (const poly of polys) {
      const p = ringPath(
        poly[0].map(([lon, lat]) => projectRaw(lat, lon)),
        0.8,
        5,
      )
      if (p) lakeParts.push(p)
    }
  }
  const lakes = lakeParts.join('')

  const out = {
    w: W,
    h: H,
    countries,
    context,
    lakes,
    // projection params so the app can place venue pins identically
    proj: { n, F, rho0, lon0: LON0, scale, tx, minY, pad: PAD },
  }
  await fs.writeFile(OUT, `${JSON.stringify(out)}\n`)

  const sizes = Object.fromEntries(Object.entries(countries).map(([k, v]) => [k, v.length]))
  console.log('map written:', OUT)
  console.log(
    'viewBox: 0 0',
    W,
    H,
    '| path chars:',
    JSON.stringify(sizes),
    'context:',
    context.length,
    'lakes:',
    lakes.length,
  )
  // sanity: project a few venue cities
  const test = (name, lat, lon) => {
    const [x, y] = toScreen(projectRaw(lat, lon))
    console.log(`  ${name}: ${x.toFixed(0)},${y.toFixed(0)}`)
  }
  test('Mexico City', 19.3029, -99.1505)
  test('Vancouver', 49.2768, -123.112)
  test('NY/NJ', 40.8128, -74.0742)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
