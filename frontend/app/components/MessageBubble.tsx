import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, shape, typography } from "../theme/tokens";

interface MessageBubbleProps {
  fromMe: boolean;
  text: string;
  senderName?: string;
  maxWidthPercent?: number;
}

export function MessageBubble({ fromMe, text, senderName, maxWidthPercent = 78 }: MessageBubbleProps) {
  return (
    <View style={{ alignSelf: fromMe ? "flex-end" : "flex-start", maxWidth: `${maxWidthPercent}%` }}>
      {senderName && <Text style={styles.senderName}>{senderName}</Text>}
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: fromMe ? colors.accent : colors.surfaceRaised,
            borderBottomRightRadius: fromMe ? shape.bubbleTailRadius : shape.bubbleRadius,
            borderBottomLeftRadius: fromMe ? shape.bubbleRadius : shape.bubbleTailRadius,
          },
        ]}
      >
        <Text style={{ fontSize: typography.sizes.body, color: fromMe ? colors.onAccentText : colors.textPrimary }}>
          {text}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderTopLeftRadius: shape.bubbleRadius,
    borderTopRightRadius: shape.bubbleRadius,
  },
  senderName: {
    fontSize: typography.sizes.sectionLabel,
    color: colors.textSecondary,
    marginBottom: 2,
    paddingLeft: 4,
  },
});
