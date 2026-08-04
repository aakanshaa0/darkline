import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppStore, getContactsView, getCallBannerMode, getCallBannerText } from "@shared/store";
import { CallBanner, CallControls } from "../../components";
import { colors, typography } from "../../theme/tokens";

export function CallScreen() {
  const contacts = useAppStore((s) => s.contacts);
  const callContactId = useAppStore((s) => s.callContactId);
  const callKind = useAppStore((s) => s.callKind);
  const callPhase = useAppStore((s) => s.callPhase);
  const muted = useAppStore((s) => s.muted);
  const speakerOn = useAppStore((s) => s.speakerOn);
  const endCall = useAppStore((s) => s.endCall);
  const toggleMute = useAppStore((s) => s.toggleMute);
  const toggleSpeaker = useAppStore((s) => s.toggleSpeaker);

  const callContact = getContactsView(contacts).find((c) => c.id === callContactId);
  const bannerMode = getCallBannerMode(callContact?.presence);
  const bannerText = getCallBannerText(callContact?.presence);
  const statusText = callPhase === "ringing" ? "Calling…" : "00:14";

  return (
    <View style={styles.container}>
      {callKind === "video" && (
        <>
          <View style={styles.remoteVideo}>
            <Text style={styles.remoteVideoLabel}>REMOTE VIDEO</Text>
          </View>
          <View style={styles.pip}>
            <Text style={styles.pipLabel}>you</Text>
          </View>
        </>
      )}
      <CallBanner mode={bannerMode} text={bannerText} />
      {callKind === "video" && <View style={{ flex: 1 }} />}
      {callKind === "audio" && (
        <View style={styles.audioBody}>
          <View style={styles.avatarLg}>
            <Text style={styles.avatarLgText}>{callContact?.initials}</Text>
          </View>
          <Text style={styles.name}>{callContact?.name}</Text>
          <Text style={styles.status}>{statusText}</Text>
        </View>
      )}
      <CallControls
        kind={callKind}
        muted={muted}
        speakerOn={speakerOn}
        onToggleMute={toggleMute}
        onToggleSpeaker={toggleSpeaker}
        onEndCall={endCall}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  remoteVideo: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  remoteVideoLabel: {
    fontSize: 12,
    letterSpacing: 1,
    color: colors.textSecondary,
  },
  pip: {
    position: "absolute",
    top: 70,
    right: 16,
    width: 76,
    height: 110,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  pipLabel: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  audioBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  avatarLg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLgText: {
    fontSize: 28,
    color: colors.textPrimary,
  },
  name: {
    fontSize: typography.sizes.name,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  status: {
    fontSize: typography.sizes.body,
    color: colors.textSecondary,
  },
});
