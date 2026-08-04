import type { CallKeepAdapter } from "./types";

// No native call UI concept on web — the in-page call screen (already
// built, app/screens/calls via WebApp's CallPanel) is the whole UI.
export const callKeepAdapter: CallKeepAdapter = {
  async setup() {},
  reportIncomingCall() {},
  reportOutgoingCallStarted() {},
  endCall() {},
  onAnswerCall() {},
  onEndCall() {},
};
