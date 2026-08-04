// NOTE: unverified in this environment — @react-native-community/netinfo
// needs a real native build to report real connection state; on iOS
// distinguishing "internet via WiFi" from "WiFi with no internet (i.e.
// local-only)" additionally needs a reachability check NetInfo performs
// natively. Not exercised against a real device here.
import NetInfo from "@react-native-community/netinfo";
import type { ConnectivityWatcher, ConnectivityInfo } from "./types";

export const connectivityWatcher: ConnectivityWatcher = {
  subscribe(listener) {
    return NetInfo.addEventListener((state) => {
      const info: ConnectivityInfo = state.isInternetReachable
        ? { status: "online", hasInternet: true }
        : state.isConnected
          ? { status: "wifi", hasInternet: false } // connected to *a* network, just not reaching the internet — treated as local-mode
          : { status: "offline", hasInternet: false };
      listener(info);
    });
  },
};
