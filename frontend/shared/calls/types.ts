export interface CallKeepAdapter {
  setup(): Promise<void>;
  reportIncomingCall(callId: string, callerName: string, hasVideo: boolean): void;
  reportOutgoingCallStarted(callId: string, calleeName: string, hasVideo: boolean): void;
  endCall(callId: string): void;
  onAnswerCall(cb: (callId: string) => void): void;
  onEndCall(cb: (callId: string) => void): void;
}
