#!/bin/sh
# Runs at container start (as an nginx docker-entrypoint.d hook) before nginx
# boots. It writes a fresh env.js from the process environment so runtime
# config is never baked into the static bundle and redeploys pick up changes.
# Values absent from the environment become empty strings.
set -eu

TARGET="/usr/share/nginx/html/env.js"

esc() {
  # Escape backslashes and double quotes for safe embedding in a JS string.
  printf '%s' "${1:-}" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

cat > "$TARGET" <<EOF
window.__ENV__ = {
  "SENTRY_DSN": "$(esc "${SENTRY_DSN:-}")",
  "UMAMI_URL": "$(esc "${UMAMI_URL:-}")",
  "UMAMI_WEBSITE_ID": "$(esc "${UMAMI_WEBSITE_ID:-}")",
  "SEED_DEMO": "$(esc "${SEED_DEMO:-}")"
};
EOF

echo "Wrote runtime config to $TARGET"
