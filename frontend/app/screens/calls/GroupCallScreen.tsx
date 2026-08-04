import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppStore } from "@shared/store";
import { CallControls } from "../../components";
import { colors, callBanner } from "../../theme/tokens";

const TILES = [
  { label: "JM", active: false },
  { label: "SA", active: false },
  { label: "TK", active: true },
  { label: "+2", active: false },
];

export function GroupCallScreen() {
  const muted = useAppStore((s) => s.muted);
  const endCall = useAppStore((s) => s.endCall);
  const toggleMute = useAppStore((s) => s.toggleMute);

  return (
    <View style={styles.container}>
      <Text style={styles.banner}>Group call · Trip Plan</Text>
      <View style={styles.grid}>
        {TILES.map((t) => (
          <View key={t.label} style={[styles.tile, t.active && styles.tileActive]}>
            <Text style={styles.tileLabel}>{t.label}</Text>
          </View>
        ))}
      </View>
      <CallControls
        kind="group"
        muted={muted}
        speakerOn={false}
        onToggleMute={toggleMute}
        onToggleSpeaker={() => undefined}
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
  banner: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: callBanner.internet.bg,
    color: callBanner.internet.text,
  },
  grid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    padding: 10,
  },
  tile: {
    width: "48.5%",
    aspectRatio: 1,
    backgroundColor: colors.surfaceRaised,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tileActive: {
    borderWidth: 2,
    borderColor: colors.accent,
  },
  tileLabel: {
    fontSize: 16,
    color: colors.textPrimary,
  },
});
