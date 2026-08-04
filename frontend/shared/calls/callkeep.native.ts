// NOTE: unverified in this environment — react-native-callkeep wraps
// CallKit (iOS) / ConnectionService (Android); both need a real device
// build (iOS also needs the "Voice over IP" background mode capability
// enabled in Xcode, which isn't something a Windows dev box can set up)
// to actually show a native incoming-call screen.
import RNCallKeep from "react-native-callkeep";
import type { CallKeepAdapter } from "./types";

export const callKeepAdapter: CallKeepAdapter = {
  async setup() {
    await RNCallKeep.setup({
      ios: { appName: "Darkline", supportsVideo: true },
      android: {
        alertTitle: "Permissions required",
        alertDescription: "Darkline needs access to display call notifications",
        cancelButton: "Cancel",
        okButton: "OK",
        additionalPermissions: [],
      },
    });
  },

  reportIncomingCall(callId, callerName, hasVideo) {
    RNCallKeep.displayIncomingCall(callId, callerName, callerName, "generic", hasVideo);
  },

  reportOutgoingCallStarted(callId, calleeName, hasVideo) {
    RNCallKeep.startCall(callId, calleeName, calleeName, "generic", hasVideo);
  },

  endCall(callId) {
    RNCallKeep.endCall(callId);
  },

  onAnswerCall(cb) {
    RNCallKeep.addEventListener("answerCall", ({ callUUID }: { callUUID: string }) => cb(callUUID));
  },

  onEndCall(cb) {
    RNCallKeep.addEventListener("endCall", ({ callUUID }: { callUUID: string }) => cb(callUUID));
  },
};
