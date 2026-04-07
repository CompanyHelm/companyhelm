#!/bin/sh
set -eu

DEFAULT_CONFIG_PATH="/app/apps/api/config/container.yaml"
CONFIG_PATH=""
EXPECT_CONFIG_PATH_VALUE=0

for ARG in "$@"; do
  if [ "$EXPECT_CONFIG_PATH_VALUE" -eq 1 ]; then
    CONFIG_PATH="$ARG"
    EXPECT_CONFIG_PATH_VALUE=0
    continue
  fi

  case "$ARG" in
    --config-path)
      EXPECT_CONFIG_PATH_VALUE=1
      ;;
    --config-path=*)
      CONFIG_PATH="${ARG#--config-path=}"
      ;;
  esac
done

if [ "$EXPECT_CONFIG_PATH_VALUE" -eq 1 ]; then
  echo "Missing value for --config-path." >&2
  exit 1
fi

if [ -z "$CONFIG_PATH" ]; then
  CONFIG_PATH="$DEFAULT_CONFIG_PATH"
  set -- --config-path "$CONFIG_PATH" "$@"
fi

if [ -n "${COMPANYHELM_CONFIG_S3_URI:-}" ]; then
  mkdir -p "$(dirname "$CONFIG_PATH")"
  aws s3 cp "$COMPANYHELM_CONFIG_S3_URI" "$CONFIG_PATH"
fi

cd /app
exec npm exec -w @companyhelm/api -- tsx src/main.ts "$@"
