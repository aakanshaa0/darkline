# Handoff: Darkline — Chat/Call App (Mobile + Web)

## Overview
Darkline is a hybrid chat/audio/video app that works online (internet), on a local network (WiFi direct, no internet), and fully offline (Bluetooth mesh, text only). This bundle contains clickable HTML prototypes of the core mobile and web experience: onboarding, chat list with presence, 1:1 and group chat, and calling — including the UI treatment for each connectivity mode.

## About the Design Files
The files in this bundle (`Darkline App.dc.html`, `Darkline Web.dc.html`) are **design references built in HTML/React** — clickable prototypes showing intended look, layout, and behavior. They are not production code to copy directly. The task is to **recreate these designs in the target codebase's real environment** (React Native for mobile, React/Vue/etc. for web — or whichever stack the project already uses) using its existing component patterns, navigation, and state management. `ios-frame.jsx` and `browser-window.jsx` are just device-bezel/browser-chrome mockup shells for presentation — do not port them; the real app has no such wrapper.

To view the prototypes: open the `.dc.html` files in a browser. Click through the phone screen (mobile) or browser window (web) to navigate — every screen shown is reachable via tap/click.

## Fidelity
**Low-to-mid fidelity.** Colors, spacing, and copy are representative and close to final, but this is a prototype stage, not pixel-perfect final art. Treat spacing/sizing as approximate; treat the color palette, component structure, and interaction flows as the intended direction.

## Design Tokens

Palette — "charcoal + coral", dark theme only (no light mode designed yet):
- Background: `oklch(18% 0.004 60)` — near-black, very slightly warm
- Raised surface (bubbles, avatars, input pills, cards): `oklch(27% 0.006 60)`
- Tab bar / header strip background: `oklch(15% 0.004 60)`
- Border/divider: `oklch(30% 0.006 60)`
- Text primary: `oklch(95% 0.005 60)`
- Text secondary/muted: `oklch(60% 0.01 60)`
- Accent (coral — primary actions, outgoing bubbles, online status, logo): `oklch(68% 0.16 35)`
- Text-on-accent (dark text sitting on coral): `oklch(20% 0.02 35)`
- Presence colors: online = accent coral `oklch(68% 0.16 35)`; nearby-WiFi = blue `oklch(70% 0.09 240)`; nearby-Bluetooth = amber `oklch(70% 0.1 90)`; offline = gray `oklch(45% 0.005 60)`
- Call banner (internet): bg `oklch(24% 0.05 150)`, text `oklch(78% 0.12 150)` (green)
- Call banner (local network): bg `oklch(24% 0.05 240)`, text `oklch(78% 0.1 240)` (blue)
- Destructive (end call): `#e5484d`

Typography: system font stack (`system-ui, -apple-system, "Segoe UI", sans-serif`) throughout. Sizes range ~11px (section labels, uppercase, letter-spacing .04em) to 26px (screen titles). No custom webfont in use.

Shape: circular avatars (32–96px depending on context), 12–14px rounded bubble corners with a 4px "tail" corner on the sender side, 10–12px rounded corners on buttons/cards/inputs, fully circular call-control buttons (52px).

Logo mark: two circles connected by a diagonal line — one filled coral (representing "online"), one coral-stroked outline (representing "reachable but not connected"). Concept: Darkline always keeps you on a line to your contacts, online or off. Wordmark is lowercase "darkline", 600 weight, slight letter-spacing.

## Screens / Views (Mobile — `Darkline App.dc.html`)

1. **Splash** — full-bleed charcoal background, logo mark + "darkline" wordmark + tagline "always connected, online or off" centered. Tap anywhere → auth.
2. **Auth picker** — "Welcome" headline, subcopy, three stacked buttons: "Continue with email" (filled coral), "Continue with phone" (outlined), "Continue with Google" (outlined). All three currently route straight to Profile setup in the prototype — **real app needs the full email/phone/OAuth sub-flows** (see Known Gaps below).
3. **Profile setup** — avatar placeholder ("add photo", dashed border), name field, username field, filled "Continue" button → Home.
4. **Home (Chats tab)** — screen title "Chats", scrollable list grouped into sections: GROUPS (tap → Group chat), then contacts grouped by presence: ONLINE, NEARBY — WIFI, NEARBY — BLUETOOTH, OFFLINE (offline rows at 55% opacity). Each contact row: avatar, name, subtitle/status text, small presence-colored dot at the right. Bottom tab bar: Chats / Calls / Nearby (active tab colored coral).
5. **Home (Calls tab)** — reverse-chronological call history rows: avatar, name (coral if missed), "{Video|Audio} · {internet|local network|bluetooth} · {time}", duration on the right. Tapping a row re-initiates that call (call-back).
6. **Home (Nearby tab)** — "DISCOVERABLE NOW" section listing already-known contacts currently reachable over WiFi/Bluetooth with a mode label and presence dot; "NOT YET A CONTACT" section for undiscovered devices with an inline "Add" action (turns into "Added" once tapped — demonstrates the pairing/first-contact flow).
7. **1:1 chat thread** — header: back chevron, avatar, name + presence label, and (only if the contact is reachable over internet or WiFi) audio-call and video-call icon buttons. If the contact is Bluetooth-only or offline, the call icons are replaced with an inline note ("Calls aren't available over Bluetooth mesh — text only." / "This contact is offline. Messages sync once they reconnect."). Message bubbles: incoming = raised-surface gray, left-aligned, tail bottom-left; outgoing = coral, right-aligned, tail bottom-right. Composer: pill text field placeholder + circular coral send button (demo: appends a canned reply).
8. **Group chat** — same shell as 1:1 but header shows group name + member count and a single video-call button (→ group call). Incoming bubbles show the sender's name above the bubble.
9. **Call screen (audio)** — top banner (colored per connection mode, see tokens), large circular avatar, name, status text ("Calling…" for ~1.2s, then a running timer placeholder), control row: mute toggle, speaker toggle, red end-call.
10. **Call screen (video)** — full-bleed "REMOTE VIDEO" placeholder panel, small draggable-style self-view PiP box top-right labeled "you", same banner, control row: mute, camera-flip, end-call (no speaker toggle).
11. **Group call** — banner "Group call · {name}", 2×2 grid of participant tiles (initials), active speaker tile gets a coral border, control row: mute + end-call.

## Screens / Views (Web — `Darkline Web.dc.html`)

Three-pane layout inside a browser chrome mockup:
1. **Nav rail** (76px, left) — logo mark, then Chats/Calls/Nearby icon+label nav items (active = coral), avatar/account icon pinned to the bottom.
2. **List panel** (300px) — same content as the mobile Home tabs (grouped contacts / call history / nearby devices), reused row styling, selected row gets a subtle highlighted background.
3. **Main panel** — empty state ("Select a conversation to start chatting") when nothing is selected; otherwise renders the 1:1 thread, group thread, or call UI (audio/video/group) inline, same structure and copy as the mobile versions, just wider bubbles/tiles.

Web currently has no splash/auth/profile-setup screens — it opens directly into the app shell. Add those if the web product needs its own sign-in (vs. e.g. an authenticated redirect from a marketing site).

## Interactions & Behavior implemented in the prototype
- Full tap-through navigation between all listed screens (both files) via React state — no page reloads.
- Tab switching (Chats/Calls/Nearby) preserves list scroll position per tab.
- Starting a call sets a 1.2s "ringing" phase before flipping to "active" (via `setTimeout`), to demonstrate the connecting → connected transition.
- Mute/speaker toggles are stateful (visually flip background/icon).
- "Add" on an unknown nearby device flips to "Added" and stays that way (demonstrates pairing).
- Composer send buttons append a canned message to the thread (demonstrates live message state, not real text input).
- Call/group-call buttons are conditionally rendered/disabled based on the contact's presence mode (BLE and offline contacts cannot start calls).

## State Management (as modeled in the prototype — mirror this shape in the real app)
- `screen` / `rightView`: current top-level view (mobile uses a single active screen; web uses a persistent list + a `rightView` for the main panel).
- `tab`: which list is showing (`chats` / `calls` / `nearby`).
- `activeContactId`, `callContactId`, `callKind` (`audio`/`video`), `callPhase` (`ringing`/`active`).
- `muted`, `speakerOn`: call control toggle state.
- `addedNearby`: map of device-id → added boolean, for the pairing demo.
- `contacts[]`: `{ id, name, initials, presence, sub }` — `presence` is one of `online` / `wifi` / `ble` / `offline` and drives dot color, section grouping, and call availability.
- `messages` / `groupMessages`: per-contact/group message arrays, `{ fromMe, text, senderName? }`.
- Real data needed: actual connectivity detection (internet/local/BLE) feeding `presence`, real message persistence/sync status per the architecture doc (pending/sent/delivered), real call signaling state, real contact/group data from the backend.

## Known Gaps — screens intentionally not built yet in this round
These were flagged as out of scope for this prototype pass and would need their own screens before this is dev-ready:
- Full auth: sign-up form, email verification, forgot/reset password, phone entry + OTP verification (with resend/countdown), account-exists-with-different-method prompt, terms & privacy consent, session-expired/re-auth, account-locked, linked-accounts settings, biometric login.
- Profile/Settings screen with logout, notification settings, linked accounts.
- In-chat search, media/attachment viewer, message info (delivery timestamps + transport mode used).
- Group info screen (member list, admin controls, mute, leave) and add/remove members flow.
- Presence-detail explainer sheet, global search across contacts/groups/messages.
- Call detail (expanded call-history entry with call-back), mid-call "reconnecting" state.
- Mic/camera permission prompt, push/notification permission prompt, QR-code bootstrap for fully-offline first contact.

## Assets
No external images/icons — everything is inline SVG (logo mark, status icons) or emoji placeholders (📞 📹 🎤 🔇 🔊 🔄 ✕) standing in for real icons; replace with the app's icon set in production. No custom fonts (system font stack only).

## Files
- `Darkline App.dc.html` — mobile prototype (all screens above), self-contained.
- `Darkline Web.dc.html` — web prototype (three-pane app shell), self-contained.
- `ios-frame.jsx`, `browser-window.jsx` — presentation-only device/browser chrome used by the prototypes; not part of the real app.
