FROM node:20-alpine AS base
WORKDIR /repo

FROM base AS build
COPY . .
RUN corepack enable && pnpm install --frozen-lockfile
RUN pnpm --filter @darkline/config --filter @darkline/db --filter @darkline/shared-types --filter @darkline/api build

FROM node:20-alpine
WORKDIR /repo
COPY --from=build /repo .
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "apps/api/dist/index.js"]
