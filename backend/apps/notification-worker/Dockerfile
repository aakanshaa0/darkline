FROM node:20-alpine AS base
WORKDIR /repo

FROM base AS build
COPY . .
RUN corepack enable && pnpm install --frozen-lockfile
RUN pnpm --filter @darkline/config --filter @darkline/db --filter @darkline/shared-types --filter @darkline/notification-worker build

FROM node:20-alpine
WORKDIR /repo
COPY --from=build /repo .
ENV NODE_ENV=production
CMD ["node", "apps/notification-worker/dist/index.js"]
