# syntax=docker/dockerfile:1
# Contexto de build: raíz del monorepo (ver docker-compose.yml)
FROM node:20-alpine AS build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --workspace @boveda/api --include-workspace-root=false
COPY apps/api apps/api
RUN npm run build -w @boveda/api

FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --workspace @boveda/api --include-workspace-root=false --omit=dev \
  && npm cache clean --force
COPY --from=build /repo/apps/api/dist apps/api/dist
WORKDIR /repo/apps/api
USER node
EXPOSE 4000
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
  CMD wget -qO- http://127.0.0.1:4000/health/live || exit 1
CMD ["node", "dist/server.js"]
