# Darkline — complete project context

Consolidates everything covered in this conversation: naming/branding, product architecture, the full screen list, backend and frontend implementation plans, the 1M-user scaling plan, and the Docker/WebSocket/Kafka/Firebase infrastructure design.

---

## Part A — Branding

### A.1 App name: Darkline

Chosen after checking several candidates for conflicts — Sealtalk and Ghostwire were dropped (both collided with existing chat apps/products; Hushmesh, Vaultmesh, Cryptomesh, Groundline, Cipherline, Driftline were also checked and dropped for similar reasons). No chat/communication app or notable company conflict found for "Darkline" at the time of checking.

**Note:** this was a web search check, not a formal USPTO trademark search or a live App Store/domain-registrar lookup — run both before committing money or a public launch to the name.

### A.2 Color theme

Three dark-first palette directions were proposed (dark fits the name directly):

| Theme | Background | Surface | Accent | Text | Notes |
|---|---|---|---|---|---|
| **Signal** | `#0B0B0D` | `#16171A` | `#00D9A3` (acid teal) | `#EDEDED` | Closest to the classic "secure messenger" feel; teal reads calm/technical |
| **Midnight** | `#0D1117` | `#1C2128` | `#4C8DFF` (electric blue) | `#E6E8EB` | Easiest on the eyes for long sessions; safest but least distinctive |
| **Ember** | `#121212` | `#1E1E1E` | `#FF6B4A` (warm coral) | `#EFEDEA` | Most differentiated — most privacy apps default to cold blue/green, so warm reads less clinical |

**Recommendation:** Ember, for distinctiveness.

**Open decision:** the presence system needs three *additional* distinct status colors (online/internet, nearby-local, offline) on top of whichever base accent is chosen — plan for exactly three functional colors total, not an ad hoc set that grows over time.

---

## Part B — Product architecture

### B.1 Goals & constraints

- Text chat, audio calls, video calls between two (later, group) users.
- Internet available → media flows directly between peers (WebRTC); signaling goes through the Node.js server.
- Internet unavailable but a shared WiFi network or direct pairing (WiFi Direct) is possible → same WebRTC engine, signaling happens locally instead of through the server.
- No network at all → text messages only, relayed over a Bluetooth LE mesh. No audio/video — BLE bandwidth can't carry media.
- Messages written locally always sync to the server once connectivity returns.
- **Zero-knowledge**: the server, TURN relay, and any BLE hop only ever see ciphertext plus minimal routing metadata (sender/recipient/group ID, timestamp) — never plaintext content, and only the participants can decrypt.

### B.2 Layered view

**Client (React Native)**

| Layer | Responsibility | Key packages |
|---|---|---|
| UI | Screens, call UI, chat UI | `react-navigation`, `react-native-callkeep` |
| State | App state, call state, connectivity state | `zustand` (or Redux Toolkit) |
| Networking — signaling | Talks to Node server when online | `socket.io-client` |
| Networking — media | Captures/streams audio-video, opens data channels | `react-native-webrtc`, `react-native-incall-manager` |
| Networking — local discovery | Finds peers with no internet | `react-native-zeroconf` (mDNS/WiFi), `react-native-wifi-p2p` (Android WiFi Direct), custom Multipeer Connectivity bridge (iOS) |
| Networking — offline mesh | Text-only relay with zero network | `react-native-ble-plx` |
| Data | Local-first message store, sync queue | `WatermelonDB` or `Realm` |
| Security | Token/key storage | `react-native-encrypted-storage` |
| Connectivity detection | Decides which mode to use | `@react-native-community/netinfo` |

**Server (Node.js)**

| Layer | Responsibility | Key packages / services |
|---|---|---|
| API | Auth, contacts, chat history REST endpoints | `Express`/`Fastify`, `jsonwebtoken`, `bcrypt` |
| Signaling | Relays SDP/ICE between peers, presence | `socket.io` (+ `socket.io-redis-adapter`) |
| NAT traversal | Lets WebRTC connect through firewalls/NAT | `coturn` (self-hosted) or Twilio/Xirsys/metered.ca (hosted) |
| Data | Persistent storage | `MongoDB` (Mongoose) |
| Presence/cache | Online status, pub/sub across instances | `Redis` |
| Media storage | Attachments, avatars | AWS S3 |
| Push | Wake the app for incoming calls/messages when backgrounded | Firebase Cloud Messaging (Android/iOS/Web) |

### B.3 The three transport modes

**A. Internet mode** (normal case)
1. App opens a socket.io connection to the Node server.
2. Caller sends a call-invite; server relays it to the callee's socket.
3. Both sides create an `RTCPeerConnection`, exchange SDP offer/answer and ICE candidates *through the signaling server*.
4. Once ICE negotiation completes, audio/video/data flows **directly between the two devices** — the server is out of the media path. TURN only relays when a direct route isn't possible (symmetric NAT, corporate firewalls) — a minority of calls, not the norm.

**B. Local mode** (no internet, shared network reachable)
1. `NetInfo` reports no internet reachability.
2. App switches to `react-native-zeroconf` to discover on the local network (or `react-native-wifi-p2p` for a direct WiFi Direct link with no shared router).
3. SDP/ICE exchange happens over a plain local TCP socket directly between devices — no server involved.
4. Same `RTCPeerConnection` setup takes over. Call quality can exceed internet mode since there's no relay hop.

**C. Offline mesh mode** (no network of any kind)
1. `react-native-ble-plx` advertises/scans for nearby devices running the app.
2. Text messages get chunked and relayed peer-to-peer over BLE, optionally hopping through intermediate devices for a mesh effect (the hop-routing logic is the hard part — budget real time, or consider a purpose-built SDK like Bridgefy).
3. No calling in this mode — BLE bandwidth can't carry audio/video.

### B.4 Data flow examples

**Sending a chat message while offline:** `WatermelonDB` write (status: pending) → local UI updates immediately → sync manager watches `NetInfo` → on reconnect, pending messages POST to the API → server assigns canonical ID/timestamp → client reconciles.

**Receiving a call while backgrounded:** Push notification wakes the app → `react-native-callkeep` shows the native incoming-call screen → accept triggers socket.io reconnect → SDP/ICE exchange → `RTCPeerConnection` established.

### B.5 Data model (MongoDB, starting point)

- `users`: profile, auth, device push tokens
- `contacts`: relationship between users
- `messages`: sender, recipient/room, content, status (sent/delivered/read), timestamp, `localId` (offline reconciliation)
- `calls`: participants, start/end time, mode (internet/local), duration

### B.6 End-to-end encryption (zero-knowledge)

Encryption lives at the application layer, on-device, independent of transport. A message is encrypted before it leaves the device, becomes an opaque ciphertext blob, and travels identically whether over internet signaling, a local WiFi/WiFi Direct link, or a BLE hop.

**Protocol: Signal Protocol**
- **X3DH** for initial key agreement — async via prekey bundles (public keys only) hosted on the server, so a session can start even if one party is offline when the other initiates.
- **Double Ratchet** for 1:1 sessions — every message uses a fresh key (forward secrecy).
- **Sender Keys** for groups — each member encrypts once with their own group session key rather than once per recipient.

**Libraries:** `libsignal` is the reference implementation but React Native bindings are limited; realistic fallback is `react-native-libsodium` (audited primitives) with X3DH + Double Ratchet built on top — this needs a security review before shipping.

**Calls:** WebRTC's DTLS-SRTP already encrypts media between direct peers (E2E by default, no media server in the path). Authenticate the SDP/ICE exchange itself (sign it, or verify the DTLS fingerprint out-of-band) to prevent a compromised server from MITM-ing call setup.

**Key storage:** private keys generated/stored in Keychain (iOS)/Keystore (Android) via `react-native-keychain`, never transmitted. Local messages stored decrypted-at-rest in `WatermelonDB`/`Realm` for search/display; only the encrypted form touches the network or server database. Optional "safety numbers" let users manually verify they're talking to the right person.

**Multi-hop mesh relays cannot decrypt:** in a BLE mesh with more than two participants, most devices a message passes through are just relays, not conversation members. Double Ratchet keys (1:1) and Sender Keys (groups) are only ever shared with actual participants over a pairwise-encrypted channel — never broadcast, never given to a relay. A relay sees only a plaintext routing header (destination/group ID, hop count/TTL) and opaque ciphertext; it forwards bytes unchanged with no key that could decrypt them.

**Known limitation:** true first-contact while fully offline. X3DH normally fetches the other party's prekey bundle from the server; with zero connectivity and no prior contact, there's no server to fetch from — needs an out-of-band exchange instead (e.g. scanning a QR code in person). Decide upfront whether "first contact always happens online" is acceptable, or design this bootstrap flow.

### B.7 Deployment (AWS)

- REST API: Lambda + API Gateway — stateless.
- Signaling server: long-running service (ECS/Fargate) — socket.io needs persistent connections, unsuited to Lambda.
- `coturn`: EC2 instance(s), public UDP ports open.
- MongoDB: Atlas or DocumentDB.
- Redis: ElastiCache.
- Media storage: S3 (+ CloudFront).

---

## Part C — Complete screen list

### C.1 Authentication

| # | Screen | Notes |
|---|---|---|
| 1 | Login landing / method picker | "Continue with email", "Continue with phone", "Continue with Google" |
| 2 | Sign up (email/password) | email, password, confirm password, terms checkbox |
| 3 | Email verification | check-inbox message or code entry |
| 4 | Login (email/password) | email, password, forgot-password link |
| 5 | Forgot password | enter email to request reset |
| 6 | Reset password | set new password via emailed link/token |
| 7 | Phone entry | country code picker + number |
| 8 | OTP verification | 6-digit input, countdown, resend |
| 9 | OTP error/retry state | wrong code, too many attempts |
| 10 | Account-exists-with-different-method prompt | Google email collides with an existing password account |
| 11 | Profile setup (first-time) | name, username, avatar |
| 12 | Terms & privacy consent | standalone or merged into sign up |
| 13 | Session expired / re-authenticate | shown when a token expires mid-use |
| 14 | Account locked / too many attempts | rate-limit/lockout messaging |
| 15 | Linked accounts (settings) | link/unlink Google, add phone to email account or vice versa |

**Mobile-only:** Splash screen (session check) · Biometric login prompt + quick unlock · Push permission prompt
**Web-only:** OAuth redirect/callback page · "Continue in app" banner/page

### C.2 Chats

| # | Screen | Notes |
|---|---|---|
| 16 | Chat list (conversations) | last message preview, unread count, presence indicator per contact |
| 17 | 1:1 chat screen | thread, composer, attachments, per-message status incl. "pending sync" |
| 18 | New chat / contact picker | search + select to start a conversation |
| 19 | In-chat message search | find a message within a thread |
| 20 | Media/attachment viewer | full-screen images/files/videos |
| 21 | Message info | delivery timestamps + which transport mode it went through |

### C.3 Group chat

| # | Screen | Notes |
|---|---|---|
| 22 | Group chat screen | thread UI + sender name/avatar per message |
| 23 | Create group | name, photo, multi-select members |
| 24 | Group info | member list, admin controls, mute, leave |
| 25 | Add/remove members | separate contact-picker flow off group info |

### C.4 Call history

| # | Screen | Notes |
|---|---|---|
| 26 | Call history list (tab) | contact/group, type, duration, missed/answered, mode |
| 27 | Call detail | expanded log entry with call-back button |

### C.5 Audio/video call layout

| # | Screen | Notes |
|---|---|---|
| 28 | Outgoing call screen | avatar, ringing state, cancel |
| 29 | Incoming call screen | accept/decline, native CallKit/ConnectionService |
| 30 | In-call — audio | avatar, timer, mute, speaker toggle, end call |
| 31 | In-call — video | full-screen remote video, draggable self-view PiP, camera flip, mute, audio-only fallback, end call |
| 32 | Group call — grid/gallery layout | tiled participants, active-speaker highlight, participant drawer |
| 33 | Call connecting/reconnecting state | shows *which* mode it's negotiating |
| 34 | Mic/camera permission prompt | first-call-ever interstitial |

### C.6 Presence & network discovery

| # | Screen | Notes |
|---|---|---|
| 35 | People/contacts list with presence | online / nearby-WiFi (chat+call) / nearby-BLE (chat only) / offline — color-coded |
| 36 | Global search | contacts, groups, messages, with presence badges |
| 37 | Nearby devices screen | discoverable-now devices via local WiFi/WiFi Direct/BLE |
| 38 | Add nearby contact / pair device | first-time contact from nearby list, incl. QR-scan bootstrap |
| 39 | Presence detail sheet | tap a status dot to see what it means |

**Mobile-only:** pull-to-refresh presence · background call banner
**Web-only:** call window (popped-out panel) · desktop notification permission prompt

---

## Part D — Backend implementation plan

### D.1 Tools & services

| Area | Tool | Why |
|---|---|---|
| Runtime | Node.js + TypeScript | type safety across a large API surface |
| API framework | Express or Fastify | REST endpoints |
| Real-time | `socket.io` + `socket.io-redis-adapter` | signaling, presence, typing, live delivery |
| Containerization | Docker | every service (API, signaling, workers) containerized; local dev via `docker-compose` |
| Compute | ECS/Fargate | long-running sockets don't suit Lambda |
| Serverless workers | Lambda | scheduled/cleanup jobs |
| Database | MongoDB (Atlas/DocumentDB) via Mongoose | users, conversations, messages, calls |
| Cache/presence | Redis (ElastiCache) | online status, cross-instance pub/sub, rate limiting |
| Event backbone | **Kafka** (AWS MSK / Confluent Cloud in production) | durable, ordered, multi-consumer event log for messages/presence/calls — see Part F |
| Simple job queue | AWS SQS | single-consumer background jobs (media processing, scheduled cleanup) where Kafka's multi-consumer model isn't needed |
| Push notifications | **Firebase Cloud Messaging** | one SDK for Android, iOS (via APNs bridge), and Web Push — see Part F |
| NAT traversal | `coturn` (self-hosted) or Twilio/Xirsys/metered.ca | TURN/STUN for WebRTC |
| Media storage | S3 (+ CloudFront) | attachments, avatars, pre-signed upload URLs |
| Auth | `jsonwebtoken`, `bcrypt`, Google ID-token verification | tokens, hashing, Google auth |
| Validation | `zod` or `joi` | request schema validation |
| Security middleware | `helmet`, `cors`, `express-rate-limit` | baseline hardening |
| Logging/monitoring | `pino`/`winston` + CloudWatch, optional Sentry | ops visibility |

### D.2 REST routes

**Auth**
```
POST   /auth/signup                  email/password signup
POST   /auth/login                   email/password login
POST   /auth/verify-email
POST   /auth/forgot-password
POST   /auth/reset-password
POST   /auth/phone/send-otp
POST   /auth/phone/verify-otp
POST   /auth/google                  verify Google ID token, create or link account
POST   /auth/refresh-token
POST   /auth/logout
GET    /auth/me
```

**Users & profile**
```
GET    /users/me
PATCH  /users/me
GET    /users/:id
GET    /users/search?q=
POST   /users/me/device-token        register push token
GET    /users/me/linked-accounts
POST   /users/me/linked-accounts     link Google/phone/email
DELETE /users/me/linked-accounts/:provider
```

**Contacts**
```
GET    /contacts
POST   /contacts
DELETE /contacts/:id
```

**Conversations (1:1 and group unified)**
```
GET    /conversations
POST   /conversations                create 1:1 or group
GET    /conversations/:id
PATCH  /conversations/:id            group name/photo/settings
DELETE /conversations/:id            leave or delete
POST   /conversations/:id/members
DELETE /conversations/:id/members/:userId
```

**Messages**
```
GET    /conversations/:id/messages   paginated history
POST   /conversations/:id/messages   send (REST fallback alongside socket delivery)
POST   /messages/sync                bulk-sync offline-queued messages, reconciles localId → canonical id
PATCH  /messages/:id                 edit/delete
```

**Media**
```
POST   /media/upload                 returns pre-signed S3 URL
GET    /media/:id
```

**Calls**
```
POST   /calls                        log call start
PATCH  /calls/:id                    log call end/duration/mode
GET    /calls                        paginated call history
```

**Prekeys (E2EE bootstrap)**
```
POST   /keys/prekeys                 upload identity key + signed prekey + one-time prekeys
GET    /keys/prekeys/:userId         fetch a bundle to start an X3DH session
```

**Presence**
```
GET    /presence/:userId             REST fallback; primary path is socket.io
```

### D.3 Socket.io events (signaling channel)
```
connect / disconnect          → presence broadcast to contacts
presence:update
typing:start / typing:stop
message:new                   → real-time delivery to online recipients
call:invite / call:answer / call:reject / call:end
webrtc:offer / webrtc:answer / webrtc:ice-candidate
```

### D.4 Functionality plan by phase

1. Auth (email/password, phone/OTP, Google) + profile + contacts.
2. Conversations + messages (REST + MongoDB schema) + basic socket.io delivery.
3. Call signaling (offer/answer/ICE relay) + coturn integration + call history.
4. Push notifications: Kafka `messages.new` → notification worker → Firebase Cloud Messaging.
5. Prekey bundle endpoints for E2EE bootstrapping.
6. Media upload via S3 pre-signed URLs.
7. Group chat + admin management.
8. Scale-out: Redis adapter across instances, Kafka consumer scaling, CloudWatch alarms, load testing the signaling layer specifically.

---

## Part E — Frontend implementation plan (React Native + web, one codebase)

### E.1 Approach

Use **React Native Web** to share one codebase across iOS, Android, and browser, as a monorepo:

```
/app       shared screens, components, business logic
/mobile    RN entry point, native module config, app store builds
/web       Vite/webpack entry point, react-native-web aliasing
/shared    API client, state, hooks, types
```

Platform differences resolved via `.native.tsx` / `.web.tsx` file extensions rather than scattering `Platform.OS` checks through shared components.

### E.2 Where the codebase actually forks

| Capability | Mobile | Web | Shared? |
|---|---|---|---|
| UI components, layout, navigation | `react-navigation` | `react-navigation` (web support built in) | Yes |
| State management | `zustand` | `zustand` | Yes |
| REST/socket client | `axios`/`fetch`, `socket.io-client` | same | Yes |
| WebRTC | `react-native-webrtc` | native browser `RTCPeerConnection` | No — behind a `WebRTCAdapter` interface |
| Local network discovery | native modules | not available in a browser | No — web disables local/offline mode, always uses internet mode |
| Local-first DB | `WatermelonDB` (SQLite) | `WatermelonDB` web adapter (LokiJS) or Dexie/IndexedDB | Mostly — prototype the web adapter early, riskiest shared piece |
| Secure key storage | `react-native-keychain` (OS keychain) | Web Crypto API + IndexedDB | No — web is a weaker trust boundary for private keys than mobile |
| Native call UI | `react-native-callkeep` | plain in-page call UI | No |
| Push notifications | Firebase Cloud Messaging | Web Push (via Firebase) | Mostly shared — same Firebase Admin SDK on the backend |
| Biometric unlock | `react-native-keychain` biometry | not applicable | No |

### E.3 Functionality/screens plan by phase

1. Monorepo scaffolding: RN-web setup, navigation, shared design tokens/theme.
2. Auth screens (all three methods) wired to backend routes.
3. Chat list + 1:1 chat screen, real-time via socket.io, virtualized list from day 1.
4. Calling: `WebRTCAdapter` abstraction, internet-mode calling on both platforms.
5. Group chat screens + admin flows.
6. Call history + presence UI.
7. Local/offline mode — mobile only; web shows these contacts as unavailable.
8. E2EE client integration: key storage abstraction, X3DH/Double Ratchet session handling.
9. Platform polish: CallKeep + biometrics on mobile, Web Push + notification permission on web.

---

## Part F — Real-time infrastructure: Docker + WebSocket + Kafka + Firebase

### F.1 What each tool does

| Tool | Role |
|---|---|
| **Docker** | Containerizes every backend service (API, WebSocket/signaling, Kafka consumer workers) so local dev matches production and each service scales/deploys independently |
| **WebSocket** | Real-time transport for signaling, presence, typing, live message delivery — `socket.io` (or raw `ws`), in its own container |
| **Kafka** | Event backbone — durable, ordered, multi-consumer event log. Each event (message sent, call ended) is published once and consumed independently by as many workers as need to react |
| **Firebase (FCM)** | Push notification delivery — one SDK covers Android, iOS (via APNs bridging), and Web Push |

### F.2 Why Kafka instead of a simple queue

A basic queue (SQS) suits single-purpose background jobs. Kafka earns its place once multiple independent consumers need to react to the same event: a new message must (a) trigger a push notification if the recipient's offline, (b) get delivered live if online on a different server instance, (c) possibly feed analytics — without any consumer blocking the others. Kafka also provides:
- **Ordering per partition** — partition by `conversationId` so messages within a conversation stay ordered across many parallel consumers.
- **Replay** — a consumer added later (e.g. analytics) can reprocess recent events without advance planning.

### F.3 Docker: what gets containerized

| Service | Container |
|---|---|
| Auth/REST API | `api` |
| WebSocket/signaling server | `ws-signaling` |
| Notification worker (Kafka consumer → Firebase) | `notification-worker` |
| Group fan-out worker (Kafka consumer → WebSocket delivery) | `fanout-worker` |
| MongoDB, Redis, Kafka broker, coturn | local dev only via `docker-compose.yml`; managed services in production (Atlas, ElastiCache, MSK, EC2 coturn) |

### F.4 Kafka topic design

| Topic | Producer | Partition key | Consumers |
|---|---|---|---|
| `messages.new` | `api`/`ws-signaling`, after MongoDB write | `conversationId` | `fanout-worker`, `notification-worker` |
| `presence.updates` | `ws-signaling` | `userId` | `ws-signaling` instances (cross-instance presence via Redis) |
| `calls.events` | `ws-signaling` | `conversationId` | analytics (optional), call-history writer |

**Ordering guarantee:** write to MongoDB first, then publish to Kafka — or use the transactional outbox pattern (write the event to an `outbox` collection in the same transaction as the message; a separate process publishes from the outbox to Kafka) to close the write-then-publish race properly.

### F.5 Firebase notification worker

1. Create a Firebase project, enable Cloud Messaging, generate a service account key.
2. Store device push tokens per user (`users.deviceTokens: [{ token, platform, updatedAt }]`), collected on login and app foreground.
3. `notification-worker` consumes `messages.new`, checks recipient presence in Redis:
   - **Online** → no action; `fanout-worker` handles live delivery.
   - **Offline** → `admin.messaging().sendEachForMulticast()` to the recipient's device tokens.
4. Handle `messaging/registration-token-not-registered` by removing the dead token immediately.
5. iOS uses the same code path once the APNs auth key is configured in the Firebase console; Web Push uses the same Admin SDK call.

### F.6 Step-by-step build order

1. Local dev: `docker-compose.yml` with `mongo`, `redis`, single-broker Kafka (KRaft mode), `coturn`, service containers with hot-reload.
2. Dockerize the API and WebSocket services individually (multi-stage `node:20-alpine` builds).
3. Wire the WebSocket layer: `socket.io` + `socket.io-redis-adapter`, verify cross-instance delivery with two local containers.
4. Stand up Kafka topics; get a single produce → single consume loop working before adding real logic.
5. Build the notification worker: Firebase setup, device token storage, online/offline branch, dead-token cleanup.
6. Build the fan-out worker: look up online group members via Redis presence, deliver over WebSocket via the Redis adapter's cross-instance messaging.
7. Add the transactional outbox pattern once the basic flow works end-to-end.
8. Move Kafka to a managed service (AWS MSK or Confluent Cloud) before production.
9. Observability: alert on Kafka consumer lag specifically — more important than plain container health here.
10. Load test: simulate large group fan-outs, confirm partition count and consumer instance count scale together.

### F.7 Open question

Does Kafka fully replace SQS everywhere, or does SQS stay for simple single-consumer jobs (media processing, scheduled cleanup) while Kafka is reserved specifically for the multi-consumer event stream (messages, presence, calls)? Current recommendation in Part D.1: keep both, split by that criterion.

---

## Part G — Scaling to 1M users

### G.1 The core principle

Build for 1M, don't start at 1M. Some architecture decisions are cheap to change later; a few are genuinely expensive to retrofit once there's real traffic and data. Over-engineering day-1 code for scale you don't have yet slows the MVP down for capacity you won't need for a while.

### G.2 Day-1 decisions (hard to retrofit later)

| Decision | Why it can't wait |
|---|---|
| Wire `socket.io-redis-adapter` from the start, even with one instance | Retrofitting cross-instance pub/sub later means re-architecting presence and signaling while live |
| Sortable unique IDs (ULID/UUID) for messages, not auto-increment | Sharding later needs an ID scheme that doesn't depend on a single counter |
| Every message carries `conversationId` as the shard-key candidate | Mongo sharding by conversation later requires this to already be the query pattern |
| Stateless auth (JWT, no server-side session store) | Horizontal scaling of the API tier is trivial only if any instance can handle any request |
| TURN (`coturn`) runs as its own service, never bundled into app servers | It scales on different axes (bandwidth, not request count) |
| Push dispatch goes through Kafka/a queue from day 1, never inline in the request | Retrofitting this under load means changing the message-send code path live |
| Structured logging + health checks from the first commit | Debugging a distributed system without this is genuinely painful |

### G.3 Backend — step-by-step to start coding

1. Scaffold: TypeScript repo, env config, Docker Compose for local dev (MongoDB, Redis, Kafka, coturn).
2. Auth module: email/password, phone/OTP, Google — with tests.
3. Core data models: Mongoose schemas with the indexes actually queried by (`conversationId + timestamp` compound index on messages).
4. Conversations & messages REST: paginated history using sortable IDs, not offset pagination.
5. socket.io server wired to the Redis adapter immediately, presence, typing indicators.
6. WebRTC signaling: offer/answer/ICE relay + `coturn` integration + call history writes.
7. Kafka infrastructure: topics, notification worker, fan-out worker (see Part F).
8. Media upload: S3 pre-signed URLs.
9. Prekey/E2EE endpoints.
10. Observability: CloudWatch structured logs, health checks, dashboards, Kafka consumer lag alerts — built in alongside steps 1-9, not after.
11. Load test the signaling layer specifically before any wider rollout.
12. Infra as code (CDK/Terraform) once stable.

### G.4 Frontend — step-by-step to start coding

1. Monorepo scaffold: React Native + React Native Web, shared design tokens, navigation shell.
2. API + socket client with reconnect (exponential backoff + jitter) built in from day 1 — without jitter, a server restart causes every client to reconnect simultaneously and re-triggers the outage.
3. Auth screens wired to the backend.
4. Chat list + 1:1 chat using a virtualized list (`FlashList`/`react-window`) from day 1 — much harder to retrofit later.
5. `WebRTCAdapter` abstraction + internet-mode calling on both platforms.
6. Local-first DB (WatermelonDB) with proper indices and sync manager.
7. Group chat screens and admin flows.
8. Presence & nearby-discovery UI.
9. E2EE client integration.
10. Crash reporting/analytics (e.g. Sentry) wired in from day 1.
11. Platform polish: CallKeep + biometrics (mobile), Web Push (web).

### G.5 Deliberately deferred (don't build until real scale demands it)

- Multi-region deployment — single-region, multi-AZ is enough for a long time.
- MongoDB sharding — keep the schema shard-ready but don't turn it on until query latency or storage size says so.
- A custom multi-region TURN fleet with geo-routing — start with one or two `coturn` instances (or a hosted provider); most calls won't need TURN at all.
- Sophisticated feature-flagging/staged-rollout infrastructure — a simple remote-config flag is enough until team size and release cadence need more.
- Multi-hop BLE mesh routing — ship reliable single-hop first; general mesh routing is a genuinely hard research problem.

### G.6 Scale-readiness checklist (pull in as usage grows toward 1M)

- ALB + auto-scaling for the signaling ECS/Fargate service, scaling on connection count, not just CPU.
- ElastiCache Redis in cluster mode.
- MongoDB Atlas read replicas, then sharding once query patterns justify it.
- CloudFront in front of S3.
- WAF + per-user rate limiting (Redis-backed).
- Cost monitoring specifically on TURN relay bandwidth — most calls stay peer-to-peer and cost nothing in relay bandwidth, but the percentage that falls back to TURN scales with total call volume and is worth tracking from the first thousand users, not the millionth.

---

## Part H — Build order (recap, across everything above)

1. Auth + 1:1 text chat over REST/MongoDB.
2. Internet-mode WebRTC calling (signaling server + TURN/STUN).
3. Connectivity-driven mode switching + LAN fallback (Zeroconf).
4. WiFi Direct pairing for no-router local calls.
5. BLE mesh text-only fallback.
6. Offline-first sync polish, Kafka + Firebase push notifications, CallKeep UI.
7. E2EE (Signal Protocol) integration across all transport modes.
8. Scale-out per Part G once real usage justifies it.
