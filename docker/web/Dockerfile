FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

RUN npm ci

COPY . .

RUN npm run build -w @companyhelm/web

FROM caddy:2-alpine

COPY docker/web/Caddyfile /etc/caddy/Caddyfile
COPY docker/web/docker-entrypoint.sh /usr/local/bin/companyhelm-web-entrypoint.sh
COPY --from=builder /app/apps/web/dist /srv

RUN chmod +x /usr/local/bin/companyhelm-web-entrypoint.sh

EXPOSE 4173

ENTRYPOINT ["/usr/local/bin/companyhelm-web-entrypoint.sh"]
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
