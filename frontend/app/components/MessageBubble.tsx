import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, shape, typography } from "../theme/tokens";

interface MessageBubbleProps {
  fromMe: boolean;
  text: string;
  senderName?: string;
  maxWidthPercent?: number;
  /** ISO timestamp. Rendered as a time inside the bubble; omit to hide. */
  createdAt?: string;
  /** Dims the timestamp while the send is still in flight. */
  pending?: boolean;
}

/** Time only — the day is carried by the date separators between groups. */
function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function MessageBubble({
  fromMe,
  text,
  senderName,
  maxWidthPercent = 78,
  createdAt,
  pending,
}: MessageBubbleProps) {
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
        {createdAt && (
          <Text
            style={[
              styles.timestamp,
              {
                // On the accent bubble the muted grey has too little contrast,
                // so fade the on-accent ink instead of switching colour.
                color: fromMe ? colors.onAccentText : colors.textSecondary,
                opacity: pending ? 0.45 : fromMe ? 0.65 : 1,
              },
            ]}
          >
            {pending ? "Sending…" : formatTime(createdAt)}
          </Text>
        )}
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
  timestamp: {
    fontSize: typography.sizes.sectionLabel,
    alignSelf: "flex-end",
    marginTop: 3,
    marginBottom: -2, // pull back into the bubble's own bottom padding
  },
});
