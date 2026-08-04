import type { ConnectivityWatcher, ConnectivityInfo } from "./types";

// Browsers can't see WiFi-Direct/BLE local-only connectivity the way the
// native watcher can — web only ever reports online/offline (Part E.2:
// "web disables local/offline mode, always uses internet mode").
export const connectivityWatcher: ConnectivityWatcher = {
  subscribe(listener) {
    const report = () => {
      const info: ConnectivityInfo = navigator.onLine
        ? { status: "online", hasInternet: true }
        : { status: "offline", hasInternet: false };
      listener(info);
    };
    window.addEventListener("online", report);
    window.addEventListener("offline", report);
    report();
    return () => {
      window.removeEventListener("online", report);
      window.removeEventListener("offline", report);
    };
  },
};
