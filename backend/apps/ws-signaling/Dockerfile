FROM node:20-alpine AS base
WORKDIR /repo

FROM base AS build
COPY . .
RUN corepack enable && pnpm install --frozen-lockfile
RUN pnpm --filter @darkline/config --filter @darkline/db --filter @darkline/shared-types --filter @darkline/ws-signaling build

FROM node:20-alpine
WORKDIR /repo
COPY --from=build /repo .
ENV NODE_ENV=production
EXPOSE 4001
CMD ["node", "apps/ws-signaling/dist/index.js"]
