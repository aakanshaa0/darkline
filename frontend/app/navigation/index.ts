// Screens are wired via a single `screen` field in the shared zustand
// store (shared/store/appStore.ts) rather than a router, matching how the
// prototype itself navigates — see app/App.tsx. Swap in react-navigation
// here if/when deep linking, native transitions, or back-gesture handling
// are needed; nothing else in app/ depends on this choice.
export {};
