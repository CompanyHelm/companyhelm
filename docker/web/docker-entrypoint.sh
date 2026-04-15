#!/bin/sh
set -eu

RUNTIME_CONFIG_PATH="${COMPANYHELM_WEB_RUNTIME_CONFIG_PATH:-/srv/runtime-config.js}"
CLERK_PUBLISHABLE_KEY="${COMPANYHELM_WEB_CLERK_PUBLISHABLE_KEY:-}"
GRAPHQL_URL="${COMPANYHELM_WEB_GRAPHQL_URL:-http://localhost:4000/graphql}"
PRIVACY_POLICY_URL="${COMPANYHELM_WEB_CLERK_PRIVACY_POLICY_URL:-}"
TERMS_OF_SERVICE_URL="${COMPANYHELM_WEB_CLERK_TERMS_OF_SERVICE_URL:-}"
AMPLITUDE_ENABLED="${COMPANYHELM_WEB_AMPLITUDE_ENABLED:-false}"
AMPLITUDE_ID="${COMPANYHELM_WEB_AMPLITUDE_ID:-}"

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

resolve_javascript_boolean() {
  case "$1" in
    true)
      printf 'true'
      ;;
    *)
      printf 'false'
      ;;
  esac
}

write_runtime_config() {
  mkdir -p "$(dirname "$RUNTIME_CONFIG_PATH")"

  cat > "$RUNTIME_CONFIG_PATH" <<EOF
window.__COMPANYHELM_CONFIG__ = Object.freeze({
  clerkPublishableKey: "$(escape_javascript_string "$CLERK_PUBLISHABLE_KEY")",
  graphqlUrl: "$(escape_javascript_string "$GRAPHQL_URL")",
  privacyPolicyUrl: "$(escape_javascript_string "$PRIVACY_POLICY_URL")",
  termsOfServiceUrl: "$(escape_javascript_string "$TERMS_OF_SERVICE_URL")",
  analytics: {
    amplitude: {
      enabled: $(resolve_javascript_boolean "$AMPLITUDE_ENABLED"),
      id: "$(escape_javascript_string "$AMPLITUDE_ID")"
    }
  }
});
EOF
}

write_runtime_config

exec "$@"
