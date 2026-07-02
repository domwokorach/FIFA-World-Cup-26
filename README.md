## 🛠️ Development

For developers of this project.

### 🚀 Quick start

```bash
bun install
bun run update   # fetch the latest data
bun run dev      # http://localhost:5173
```

Production build (fully static output in `dist/`):

```bash
bun run build
bun run preview
```

### 📜 Scripts

| Script | What it does |
|---|---|
| `bun run dev` | Vite dev server at `localhost:5173` |
| `bun run build` | type-check and production build into `dist/` |
| `bun run preview` | serve the built `dist/` locally |
| `bun run update` | refresh all tournament data (FIFA, Wikipedia, Open-Meteo) into `public/data/` |
| `bun run gencron` | regenerate the CI cron schedule from the match calendar |
| `bun run genmap` | rebuild the venues map from Natural Earth source data |
| `bun run typecheck` | TypeScript type check (`tsc -b`, no emit) |
| `bun run format` | Biome auto-format (writes) |
| `bun run lint` | Biome lint + format check (includes a11y rules) |
| `bun run smoke` | headless smoke test: every route across languages and themes |
| `bun run a11y` | axe-core WCAG A/AA audit: routes × light/dark × RTL |
| `bun run checkall` | quick gate: typecheck + format + lint |
| `bun run checkall:build` | full gate: checkall + build + smoke + a11y |

<details>
<summary><b>🌐 Adding a language</b></summary>

1. Create `src/i18n/<code>.ts` with every key from `en.ts`, same order (plus `key#one`-style plural variants where the grammar needs them).
2. Wire it: `Lang` union in `types.ts`; `LOCALE_TAG` + `LANG_LABEL` in `i18n/strings.ts` (key order = menu order); loader in `i18n/index.tsx`; detection prefix in `SettingsContext.tsx`; `RTL_LANGS` / `DATA_FALLBACK` if applicable.
3. If `api.fifa.com` serves the language, add it to `LANGS` in `scripts/update.mjs`; otherwise add it to `CLDR_LANGS` there (team names then come from CLDR country names) and add England/Scotland to `team-names-l10n.json` — they are GB subdivisions CLDR cannot name.
4. Translate the curated bits: 16 `rainNote` entries (`climate.json`), 90 broadcaster notes (`broadcasters.json`), the SF Bay Area label (`Venues.tsx`), 16 city names (`city-l10n.json`, non-Latin scripts only), and a full 48-name block in `team-names-l10n.json` only if local naming conventions differ from CLDR (as Traditional Chinese does).
5. Add a smoke pass, update this README's language list, run `bun run update && bun run build && bun run smoke`.

</details>

### 🚢 Deploying

The app is a static site with hash routing and relative asset paths. For GitHub Pages:

1. Push to the repository.
2. `deploy.yml` builds and publishes on every push to `main` (documentation-only and pipeline-only changes are skipped).
3. `update-data.yml` refreshes the data on the match-driven schedule above and redeploys. Its cron table is generated from the fixed match calendar; run `bun run gencron` if a kick-off time ever changes.

### 🐳 Docker (self-hosting)

A small image (nginx serving the built PWA) published to **`ghcr.io/26worldcup/26worldcup`**. Where it reads match data is set by the `DATA_SOURCE` env var; the app is served at **http://localhost:8080** either way.

| `DATA_SOURCE` | `/data/*.json` from | Freshness | Network |
| --- | --- | --- | --- |
| `remote` *(default)* | reverse-proxied from the live site | always current, incl. live scores | outbound to `REMOTE_DATA_HOST` |
| `self` | an updater sidecar that runs the data pipeline | near-live (own `UPDATE_INTERVAL`) | outbound to FIFA/Wikipedia/Open-Meteo |

#### 1. `remote` mode (default): always-fresh data proxied from the live site

**1.1 Use the prebuilt image** (no clone):

```bash
docker run -d -p 8080:80 ghcr.io/26worldcup/26worldcup:latest
```

**1.2 Build your own** (local changes, or before an image is published):

```bash
git clone https://github.com/domwokorach/FIFA-World-Cup-26.git
cd 26worldcup.github.io
docker build -t ghcr.io/26worldcup/26worldcup:latest .          # build the local image
docker run -d -p 8080:80 ghcr.io/26worldcup/26worldcup:latest   # same tag → runs your build, no pull
```

#### 2. `self` mode: self-updating, no dependency on the live site

Two containers share a volume: the web server (`DATA_SOURCE=self`) and an updater that re-runs the data pipeline every `UPDATE_INTERVAL` seconds (default `900` = 15 min). The volume is seeded from the image's baked snapshot, so the site works immediately and is replaced by fresh data after the first run.

**2.1 Use the prebuilt images** (no clone), run the pair directly:

```bash
docker volume create wc-data
docker run -d -p 8080:80 -e DATA_SOURCE=self --restart unless-stopped \
  -v wc-data:/usr/share/nginx/html/data \
  ghcr.io/26worldcup/26worldcup:latest
docker run -d -e UPDATE_INTERVAL=900 --restart unless-stopped \
  -v wc-data:/app/public/data \
  ghcr.io/26worldcup/26worldcup-updater:latest
```

**2.2 Build your own** (Compose builds both the web and updater images):

```bash
git clone https://github.com/domwokorach/FIFA-World-Cup-26.git
cd 26worldcup.github.io
docker compose -f docker-compose.yml -f docker-compose.self.yml up -d --build
```

### ⚙️ Tech

React 19 · TypeScript · Vite · no backend, no runtime dependencies beyond React + Router. SVG throughout: the pitch with line-ups, the projected North America map, the bracket, the logo.

```
scripts/update.mjs    data pipeline (bun run update)
scripts/gencron.mjs   regenerates the match-driven CI schedule
scripts/genmap.mjs    rebuilds the map from Natural Earth data
scripts/smoke.mjs     headless smoke test across routes, languages, themes
scripts/curated/      hand-checked datasets
public/data/          generated JSON the app loads at runtime
src/                  application code (pages, components, i18n, settings)
```

## 📄 License

Code and curated data: [MIT](LICENSE.md). Detailed third-party data and image licensing: [COPYRIGHT](COPYRIGHT.md). Data courtesy of FIFA's public API, Wikipedia, and Open-Meteo; verify broadcast rights with local listings.
# FIFA-World-Cup-26
