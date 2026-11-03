FROM node:24.22.2-bookworm-slim@sha256:c86ecead9e55a5210ac1727de38a4ca840bf03dcaf34dc9749addbf383b1920c AS base
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm install --global pnpm@12.16.1
WORKDIR /app

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN pnpm install --frozen-lockfile

FROM dependencies AS api-build
COPY backend/ backend/
RUN pnpm --filter @hair-salon/api run build

FROM base AS api-dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN pnpm --filter @hair-salon/api install --prod --frozen-lockfile

FROM node:24.22.2-bookworm-slim@sha256:c86ecead9e55a5210ac1727de38a4ca840bf03dcaf34dc9749addbf383b1920c AS api
ENV NODE_ENV=development HOST=0.0.0.0 PORT=3001
WORKDIR /app
COPY --from=api-dependencies /app/node_modules ./node_modules
COPY --from=api-dependencies /app/backend/node_modules ./backend/node_modules
COPY --from=api-build /app/backend/package.json ./backend/package.json
COPY --from=api-build /app/backend/dist ./backend/dist
COPY --from=api-build /app/backend/drizzle ./backend/drizzle
WORKDIR /app/backend
USER node
EXPOSE 3001
CMD ["node", "dist/main.js"]

FROM dependencies AS frontend-build
# Frontend typechecks browser fixtures that share the backend test DB helper.
COPY backend/ backend/
COPY frontend/ frontend/
ARG BACKEND_ORIGIN=http://api:3001
ENV BACKEND_ORIGIN=$BACKEND_ORIGIN NEXT_BUILD_STANDALONE=1
RUN pnpm --filter @hair-salon/frontend run build

FROM node:24.22.2-bookworm-slim@sha256:c86ecead9e55a5210ac1727de38a4ca840bf03dcaf34dc9749addbf383b1920c AS frontend
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000 BACKEND_ORIGIN=http://api:3001
WORKDIR /app
COPY --from=frontend-build --chown=node:node /app/frontend/.next/standalone ./
COPY --from=frontend-build --chown=node:node /app/frontend/public ./frontend/public
COPY --from=frontend-build --chown=node:node /app/frontend/.next/static ./frontend/.next/static
USER node
EXPOSE 3000
CMD ["node", "frontend/server.js"]
