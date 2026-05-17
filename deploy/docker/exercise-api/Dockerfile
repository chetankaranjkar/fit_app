# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /app

COPY exercise_management_api/package.json exercise_management_api/package-lock.json ./
RUN npm ci

COPY exercise_management_api/ ./
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup -S app && adduser -S app -G app

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

USER app
EXPOSE 4300

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4300/health || exit 1

CMD ["node", "dist/server.js"]
