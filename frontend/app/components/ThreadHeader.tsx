import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors, shape, typography } from "../theme/tokens";
import { Avatar } from "./Avatar";
import { IconCircleButton } from "./IconCircleButton";

interface ThreadHeaderProps {
  initials: string;
  title: string;
  subtitle: string;
  onBack?: () => void;
  canCall?: boolean;
  onStartAudioCall?: () => void;
  onStartVideoCall?: () => void;
  callNote?: string | null;
  trailing?: React.ReactNode;
}

export function ThreadHeader({
  initials,
  title,
  subtitle,
  onBack,
  canCall,
  onStartAudioCall,
  onStartVideoCall,
  callNote,
  trailing,
}: ThreadHeaderProps) {
  return (
    <View>
      <View style={styles.headerRow}>
        {onBack && (
          <Pressable onPress={onBack}>
            <Text style={styles.back}>‹</Text>
          </Pressable>
        )}
        <Avatar initials={initials} size={shape.avatarSm} />
        <View style={styles.textCol}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        {canCall && onStartAudioCall && <IconCircleButton icon="📞" onPress={onStartAudioCall} />}
        {canCall && onStartVideoCall && <IconCircleButton icon="📹" onPress={onStartVideoCall} />}
        {trailing}
      </View>
      {callNote && (
        <View style={styles.noteBar}>
          <Text style={styles.noteText}>{callNote}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontSize: typography.sizes.subtitle,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: typography.sizes.sectionLabel,
    color: colors.textSecondary,
  },
  noteBar: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.surfaceRaised,
  },
  noteText: {
    fontSize: typography.sizes.caption,
    color: colors.textSecondary,
  },
});
