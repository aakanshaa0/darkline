# Backend setup

The backend is a Turborepo-managed pnpm workspace: 4 deployable services under `apps/`
(`api`, `ws-signaling`, `notification-worker`, `fanout-worker`) and 3 shared packages
under `packages/` (`db`, `shared-types`, `config`). See
`docs/design-reference/darkline-complete-context.md` Parts D/F for the full
architecture this scaffold implements.

## 1. Prerequisites

- Node.js 20+
- pnpm 9+ (`corepack enable` ships it via Node's built-in Corepack, or `npm i -g pnpm`)
- Docker Desktop (for local Mongo/Redis/Kafka/coturn via `docker-compose`)

## 2. Install dependencies

```
cd backend
pnpm install
```

This resolves all `workspace:*` cross-package dependencies (`@darkline/db`,
`@darkline/shared-types`, `@darkline/config`) via pnpm's workspace linking —
no publishing needed between packages.

## 3. Configure environment

```
cp .env.example .env
```

Fill in at minimum: `JWT_SECRET`, `JWT_REFRESH_SECRET`. Everything else has a
local-dev-friendly default that matches `docker-compose.yml`. Leave
`GOOGLE_CLIENT_ID`, AWS, and Firebase vars blank until you build the features
that need them (Google auth, media upload, push notifications respectively).

## 4. Start local infrastructure

```
docker-compose up -d mongo redis kafka coturn
```

This brings up MongoDB, Redis, a single-broker Kafka (KRaft mode, no
ZooKeeper), and coturn. The 4 app services are also defined in
`docker-compose.yml` for containerized runs, but for day-to-day development
run them directly with Turborepo instead (next step) — faster iteration,
real stack traces.

## 5. Run the services

```
pnpm dev          # all 4 services in parallel, via turbo
pnpm --filter @darkline/api dev            # just one service
pnpm --filter @darkline/ws-signaling dev
```

Right now each service's `src/index.ts` is a placeholder (`console.log` only)
— routes, the socket.io signaling handlers, and the Kafka consumers are not
implemented yet. This step is here to confirm the workspace wiring is sound
before real logic goes in.

## 6. Type-check / build everything

```
pnpm turbo run typecheck
pnpm turbo run build
```

Turborepo resolves the dependency graph automatically (`packages/db` builds
before `apps/api`, etc. — see each `tsconfig.json`'s `references`).

## 7. When you're ready to build real features

- **Firebase (push notifications, Part F.5):** create a Firebase project,
  enable Cloud Messaging, generate a service-account key, save it locally,
  point `FIREBASE_SERVICE_ACCOUNT_PATH` at it. iOS needs an APNs auth key
  configured in the Firebase console; Web Push uses the same Admin SDK call.
- **coturn (WebRTC NAT traversal):** the `docker-compose.yml` coturn service
  uses `network_mode: host` and needs public UDP ports open in any real
  deployment — the local container is enough to test signaling, not real
  NAT traversal from another network.
- **Google auth:** create OAuth credentials in Google Cloud Console, set
  `GOOGLE_CLIENT_ID`.
- **Media uploads:** create an S3 bucket, set the `AWS_*` vars.
- **OTP codes** for phone verification are intentionally *not* a MongoDB
  collection in `packages/db` — they're short-lived, high-write data that
  belongs in Redis with a TTL. Don't add a Mongo table for them later.

## 8. Path to production (see Part B.7 / G of the context doc)

REST API on Lambda + API Gateway (stateless); `ws-signaling` on ECS/Fargate
(long-running sockets don't suit Lambda); MongoDB Atlas or DocumentDB; Redis
via ElastiCache; Kafka via AWS MSK or Confluent Cloud; coturn on its own EC2
instance(s). Wire `socket.io-redis-adapter` and Kafka from day 1 even at low
traffic — both are listed in Part G.2 as decisions that are expensive to
retrofit under load.
