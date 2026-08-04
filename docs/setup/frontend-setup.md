# Frontend setup

One React Native (bare CLI, not Expo) codebase shared across iOS, Android,
and web via `react-native-web` + Vite. See
`docs/design-reference/darkline-complete-context.md` Part E for the full
rationale, and `docs/design-reference/design-handoff.md` for every screen
this app needs to eventually have.

`app/`, `web/`, `shared/` are already scaffolded (folders + theme tokens +
placeholder module files). What's **not** scaffolded yet: the native
`ios/`/`android/` projects — those come from actually running the React
Native CLI, not from hand-written files, so that's the first step below.

## 1. Prerequisites

- Node.js 20+
- **iOS:** macOS, Xcode (latest stable), CocoaPods (`sudo gem install cocoapods`)
- **Android:** Android Studio, an Android SDK + at least one emulator image,
  `ANDROID_HOME` set
- Watchman (macOS/Linux) recommended for Metro's file watching

## 2. Generate the native projects

The `frontend/` folder already has `package.json`, `app.json`, `index.js`,
`babel.config.js`, `metro.config.js`, and `tsconfig.json` in place, so
running `react-native init` directly into it would collide. Generate into a
throwaway folder instead and move just the native output in:

```
npx @react-native-community/cli init DarklineMobile --directory darkline-rn-tmp --skip-install
```

Then, from `darkline-rn-tmp`, copy `ios/`, `android/`, and `Gemfile` (iOS
Ruby/CocoaPods pin) into `frontend/`, and delete `darkline-rn-tmp`. Diff the
generated `package.json` against `frontend/package.json` and merge any
native-template dependencies (e.g. `react-native-gesture-handler` if the RN
version's template includes it) into the real one instead of overwriting it.

## 3. Install dependencies

```
cd frontend
npm install        # or yarn — RN's tooling assumes npm/yarn, not pnpm, for the native side
cd ios && pod install && cd ..
```

## 4. Run it

```
npm run android     # requires an emulator running or a device attached
npm run ios         # macOS only
npm run web          # Vite dev server for the browser target
```

At this stage `App.tsx` renders a bare "Darkline" placeholder — confirming
each target boots without error is the bar for this pass, not a working UI.

## 5. Native module checklist (wire up when their screens get built)

Per `darkline-complete-context.md` Part B.2/E.2, these need Podfile/Gradle
changes and platform permission entries — don't install them speculatively:

| Module | Needed for | Notes |
|---|---|---|
| `react-native-webrtc` | Calling (all platforms) | Web uses the browser's native `RTCPeerConnection` instead — see `shared/webrtc/`. |
| `react-native-ble-plx` | Offline BLE mesh (mobile only) | No web equivalent — web disables offline mode entirely (Part E.2). |
| `react-native-wifi-p2p` | Local-mode WiFi Direct pairing (Android) | iOS local mode goes through a custom Multipeer Connectivity bridge instead. |
| `react-native-callkeep` | Native incoming-call UI (mobile only) | Requires `VoIP Services` background mode on iOS. |
| `react-native-keychain` | Private key storage (E2EE) | Web uses Web Crypto API + IndexedDB instead — weaker trust boundary, noted as intentional in Part E.2. |
| `@react-native-community/netinfo` | Connectivity-mode detection | Drives the online/local/offline switch described throughout the context doc. |
| `socket.io-client` | Signaling | Talks to `@darkline/ws-signaling` in the backend. |

## 6. Type-check

```
npx tsc --noEmit
```

## 7. What's deliberately not built yet

Screens, navigation, and state (`app/screens/*`, `app/navigation/`,
`shared/store/`, `shared/api/`) are folders with placeholder `index.ts`
files only — see the per-folder comments for what belongs there and which
part of the context doc it maps to. Build order suggestion: auth screens →
chat list/thread → calling → group chat → presence/nearby, matching Part
E.3/G.4 of the context doc.
