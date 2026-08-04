import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors, shape, typography } from "../theme/tokens";
import { Avatar } from "./Avatar";
import { PresenceDot } from "./PresenceDot";
import type { Presence } from "@shared/store";

interface ContactRowProps {
  initials: string;
  name: string;
  sub: string;
  presence?: Presence;
  opacity?: number;
  highlighted?: boolean;
  onPress?: () => void;
  trailing?: React.ReactNode;
}

export function ContactRow({
  initials,
  name,
  sub,
  presence,
  opacity = 1,
  highlighted = false,
  onPress,
  trailing,
}: ContactRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, { opacity, backgroundColor: highlighted ? colors.tabBarBg : "transparent" }]}
    >
      <Avatar initials={initials} size={shape.avatarMd} />
      <View style={styles.textCol}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {sub}
        </Text>
      </View>
      {presence && <PresenceDot presence={presence} />}
      {trailing}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 9,
    paddingHorizontal: 18,
  },
  textCol: {
    flex: 1,
  },
  name: {
    fontSize: typography.sizes.subtitle,
    color: colors.textPrimary,
  },
  sub: {
    fontSize: typography.sizes.caption,
    color: colors.textSecondary,
  },
});
