# syntax=docker/dockerfile:1

# ============ build: compile the static PWA with bun ============
FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build        # tsc -b && vite build  ->  /app/dist

# ============ updater (optional sidecar): runs the data pipeline ============
# Reuses the build image (it already has deps, scripts and a seed public/data).
# Writes refreshed JSON into /app/public/data: mount a volume there and share it
# with a web container running DATA_SOURCE=self. See docker-compose.self.yml.
FROM build AS updater
ENV UPDATE_INTERVAL=900
CMD ["sh", "-c", "while true; do echo '[updater] refreshing data'; bun scripts/update.mjs || echo '[updater] run failed; retrying next cycle'; sleep \"$UPDATE_INTERVAL\"; done"]

# ============ serve: tiny nginx image with the static build (default target) ============
FROM nginx:alpine AS serve
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx/snippets-common.conf  /etc/nginx/snippets/common.conf
COPY docker/nginx/remote.conf.template  /etc/nginx/wc-templates/remote.conf.template
COPY docker/nginx/local.conf            /etc/nginx/wc-templates/local.conf
COPY docker/entrypoint.sh               /docker-entrypoint-wc.sh
RUN chmod +x /docker-entrypoint-wc.sh
# remote (default) = always-fresh data proxied from the live site, no rebuild needed.
# Override at run time: -e DATA_SOURCE=bundled|self  /  -e REMOTE_DATA_HOST=...
ENV DATA_SOURCE=remote \
    REMOTE_DATA_HOST=26worldcup.github.io
EXPOSE 80
ENTRYPOINT ["/docker-entrypoint-wc.sh"]
