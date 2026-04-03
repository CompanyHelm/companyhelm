#!/bin/sh
set -eu

CONFIG_PATH="${COMPANYHELM_API_CONFIG_PATH:-/app/apps/api/config/container.yaml}"

if [ -n "${COMPANYHELM_API_CONFIG_S3_URI:-}" ]; then
  mkdir -p "$(dirname "$CONFIG_PATH")"
  aws s3 cp "$COMPANYHELM_API_CONFIG_S3_URI" "$CONFIG_PATH"
fi

cd /app
exec npm exec -w @companyhelm/api -- tsx server.ts --config-path "$CONFIG_PATH" "$@"
