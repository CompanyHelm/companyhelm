#!/bin/sh
set -eu

RUNTIME_CONFIG_PATH="${COMPANYHELM_WEB_RUNTIME_CONFIG_PATH:-/srv/runtime-config.js}"
AUTH_PROVIDER="${VITE_AUTH_PROVIDER:-clerk}"
CLERK_PUBLISHABLE_KEY="${VITE_CLERK_PUBLISHABLE_KEY:-}"
GRAPHQL_URL="${VITE_GRAPHQL_URL:-http://localhost:4000/graphql}"
PRIVACY_POLICY_URL="${VITE_CLERK_PRIVACY_POLICY_URL:-}"
TERMS_OF_SERVICE_URL="${VITE_CLERK_TERMS_OF_SERVICE_URL:-}"
AMPLITUDE_ENABLED="${VITE_AMPLITUDE_ENABLED:-false}"
AMPLITUDE_ID="${VITE_AMPLITUDE_ID:-}"
GOOGLE_ADS_ID="${VITE_GOOGLE_ADS_ID:-}"
PADDLE_CLIENT_TOKEN="${VITE_PADDLE_CLIENT_TOKEN:-}"
PADDLE_ENVIRONMENT="${VITE_PADDLE_ENVIRONMENT:-sandbox}"

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

build_optional_amplitude_id_property() {
  if [ -n "$AMPLITUDE_ID" ]; then
    printf ',\n      id: "%s"' "$(escape_javascript_string "$AMPLITUDE_ID")"
  fi
}

build_optional_google_ads_properties() {
  if [ -n "$GOOGLE_ADS_ID" ]; then
    printf '\n      id: "%s"' "$(escape_javascript_string "$GOOGLE_ADS_ID")"
  fi
}

build_optional_paddle_property() {
  if [ -n "$PADDLE_CLIENT_TOKEN" ]; then
    printf '  paddle: {\n    clientToken: "%s",\n    environment: "%s"\n  },\n' \
      "$(escape_javascript_string "$PADDLE_CLIENT_TOKEN")" \
      "$(escape_javascript_string "$PADDLE_ENVIRONMENT")"
  fi
}

write_runtime_config() {
  mkdir -p "$(dirname "$RUNTIME_CONFIG_PATH")"

  cat > "$RUNTIME_CONFIG_PATH" <<EOF
window.__COMPANYHELM_CONFIG__ = Object.freeze({
  authProvider: "$(escape_javascript_string "$AUTH_PROVIDER")",
  clerkPublishableKey: "$(escape_javascript_string "$CLERK_PUBLISHABLE_KEY")",
  graphqlUrl: "$(escape_javascript_string "$GRAPHQL_URL")",
  privacyPolicyUrl: "$(escape_javascript_string "$PRIVACY_POLICY_URL")",
  termsOfServiceUrl: "$(escape_javascript_string "$TERMS_OF_SERVICE_URL")",
$(build_optional_paddle_property)  analytics: {
    amplitude: {
      enabled: $(resolve_javascript_boolean "$AMPLITUDE_ENABLED")$(build_optional_amplitude_id_property)
    },
    googleAds: {$(build_optional_google_ads_properties)
    }
  }
});
EOF
}

write_runtime_config

exec "$@"
