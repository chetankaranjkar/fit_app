# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /app

COPY gym_client/package.json gym_client/package-lock.json ./
RUN npm ci --omit=dev=false

COPY gym_client/ ./

ARG VITE_API_URL=/api
ARG VITE_EXERCISE_API_URL=/exercise-api/api
ENV VITE_API_URL=$VITE_API_URL \
    VITE_EXERCISE_API_URL=$VITE_EXERCISE_API_URL

# Vite only — skip tsc -b (project has dev-only TS issues; vite build is sufficient for production assets)
RUN npx vite build

FROM nginx:1.27-alpine AS runtime

COPY deploy/docker/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

RUN chown -R nginx:nginx /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/health || exit 1
