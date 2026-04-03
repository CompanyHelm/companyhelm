#!/bin/sh
set -eu

RUNTIME_CONFIG_PATH="${COMPANYHELM_WEB_RUNTIME_CONFIG_PATH:-/srv/runtime-config.js}"
CLERK_PUBLISHABLE_KEY="${COMPANYHELM_WEB_CLERK_PUBLISHABLE_KEY:-}"
GRAPHQL_URL="${COMPANYHELM_WEB_GRAPHQL_URL:-http://localhost:4000/graphql}"

escape_javascript_string() {
  printf '%s' "$1" | awk '
    BEGIN { first = 1 }
    {
      if (!first) {
        printf "\\n"
      }
      first = 0
      gsub(/\\/, "\\\\")
      gsub(/"/, "\\\"")
      gsub(/\r/, "\\r")
      gsub(/\t/, "\\t")
      printf "%s", $0
    }
  '
}

write_runtime_config() {
  mkdir -p "$(dirname "$RUNTIME_CONFIG_PATH")"

  cat > "$RUNTIME_CONFIG_PATH" <<EOF
window.__COMPANYHELM_CONFIG__ = Object.freeze({
  clerkPublishableKey: "$(escape_javascript_string "$CLERK_PUBLISHABLE_KEY")",
  graphqlUrl: "$(escape_javascript_string "$GRAPHQL_URL")"
});
EOF
}

write_runtime_config

exec "$@"
