#!/bin/sh
set -eu

RUNTIME_CONFIG_PATH="${COMPANYHELM_WEB_RUNTIME_CONFIG_PATH:-/srv/runtime-config.js}"
AUTH_PROVIDER="${VITE_AUTH_PROVIDER:-local}"
CLERK_PUBLISHABLE_KEY="${VITE_CLERK_PUBLISHABLE_KEY:-}"
GRAPHQL_URL="${VITE_GRAPHQL_URL:-http://localhost:4000/graphql}"
PRIVACY_POLICY_URL="${VITE_CLERK_PRIVACY_POLICY_URL:-}"
TERMS_OF_SERVICE_URL="${VITE_CLERK_TERMS_OF_SERVICE_URL:-}"

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
  authProvider: "$(escape_javascript_string "$AUTH_PROVIDER")",
  clerkPublishableKey: "$(escape_javascript_string "$CLERK_PUBLISHABLE_KEY")",
  graphqlUrl: "$(escape_javascript_string "$GRAPHQL_URL")",
  privacyPolicyUrl: "$(escape_javascript_string "$PRIVACY_POLICY_URL")",
  termsOfServiceUrl: "$(escape_javascript_string "$TERMS_OF_SERVICE_URL")"
});
EOF
}

write_runtime_config

exec "$@"
