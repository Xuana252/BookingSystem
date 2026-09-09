# Build context is ui/Booking.UI (see docker-compose.yml).
FROM node:22-alpine
WORKDIR /app

# Copy just the lockfile first so `npm ci` is its own cached layer, invalidated only when a
# dependency changes, not on every source edit.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite bakes VITE_* vars into the bundle at build time, not read at container startup — so this
# has to be a build ARG, not a docker-compose environment: entry (which only affects runtime).
# "/api" (relative, not an absolute localhost:8080 URL) — Nginx reverse-proxies /api/ to the api
# container, so the browser only ever talks to whatever origin serves this page, same-origin.
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

EXPOSE 5173

CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5173"]
