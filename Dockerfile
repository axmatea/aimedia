FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
# Local audit tooling must not download browsers/drivers into production builds.
ENV PUPPETEER_SKIP_DOWNLOAD=true CHROMEDRIVER_SKIP_DOWNLOAD=true
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:24-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/scripts/check-runtime-env.mjs ./scripts/check-runtime-env.mjs
COPY --from=builder --chown=node:node /app/scripts/start-runtime.mjs ./scripts/start-runtime.mjs
# Railway mounts volumes as root. The entrypoint prepares this one mount and
# drops to the node user before loading any application code or opening a port.
USER root
EXPOSE 3000
CMD ["node", "scripts/start-runtime.mjs"]
