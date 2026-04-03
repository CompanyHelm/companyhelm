FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

RUN npm ci

FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache aws-cli git

COPY --from=deps /app/node_modules /app/node_modules
COPY . .

RUN chmod +x /app/docker/api/docker-entrypoint.sh

ENV COMPANYHELM_API_CONFIG_PATH=/app/apps/api/config/container.yaml

EXPOSE 4000

ENTRYPOINT ["/app/docker/api/docker-entrypoint.sh"]
