import React from "react";
import { View, StyleSheet } from "react-native";
import { colors, shape } from "../theme/tokens";
import { IconCircleButton } from "./IconCircleButton";

interface CallControlsProps {
  kind: "audio" | "video" | "group";
  muted: boolean;
  speakerOn: boolean;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  onEndCall: () => void;
}

export function CallControls({ kind, muted, speakerOn, onToggleMute, onToggleSpeaker, onEndCall }: CallControlsProps) {
  return (
    <View style={styles.row}>
      <IconCircleButton
        icon={muted ? "🔇" : "🎤"}
        size={shape.callButtonSize}
        background={muted ? colors.accent : colors.surfaceRaised}
        color={muted ? colors.onAccentText : colors.textPrimary}
        onPress={onToggleMute}
      />
      {kind === "audio" && (
        <IconCircleButton
          icon="🔊"
          size={shape.callButtonSize}
          background={speakerOn ? colors.accent : colors.surfaceRaised}
          color={speakerOn ? colors.onAccentText : colors.textPrimary}
          onPress={onToggleSpeaker}
        />
      )}
      {kind === "video" && (
        <IconCircleButton icon="🔄" size={shape.callButtonSize} onPress={() => undefined} />
      )}
      <IconCircleButton
        icon="✕"
        size={shape.callButtonSize}
        background={colors.destructive}
        color="#fff"
        onPress={onEndCall}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    paddingVertical: 20,
    paddingBottom: 28,
  },
});
