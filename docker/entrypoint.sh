#!/bin/sh
# Pick the nginx /data/ behaviour from $DATA_SOURCE, then hand off to nginx.
#   remote  (default) -> reverse-proxy /data/ to the live published site
#   bundled           -> serve the data snapshot baked into the image
#   self              -> serve /data/ from a volume an updater sidecar refreshes
set -eu

DATA_SOURCE="${DATA_SOURCE:-remote}"
REMOTE_DATA_HOST="${REMOTE_DATA_HOST:-26worldcup.github.io}"
OUT=/etc/nginx/conf.d/default.conf

case "$DATA_SOURCE" in
  remote)
    export REMOTE_DATA_HOST
    envsubst '${REMOTE_DATA_HOST}' \
      < /etc/nginx/wc-templates/remote.conf.template > "$OUT"
    echo "[wc] DATA_SOURCE=remote -> /data/ proxied to https://${REMOTE_DATA_HOST}/data/"
    ;;
  bundled|self)
    cp /etc/nginx/wc-templates/local.conf "$OUT"
    echo "[wc] DATA_SOURCE=${DATA_SOURCE} -> /data/ served from local files"
    ;;
  *)
    echo "[wc] ERROR: invalid DATA_SOURCE='${DATA_SOURCE}' (expected: remote | bundled | self)" >&2
    exit 1
    ;;
esac

exec nginx -g 'daemon off;'
