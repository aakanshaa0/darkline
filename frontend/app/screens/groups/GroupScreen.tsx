import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { useAppStore } from "@shared/store";
import { Avatar, MessageBubble, Composer, IconCircleButton } from "../../components";
import { colors, shape, typography } from "../../theme/tokens";

export function GroupScreen() {
  const groupMessages = useAppStore((s) => s.groupMessages);
  const backToHome = useAppStore((s) => s.backToHome);
  const sendGroupDemo = useAppStore((s) => s.sendGroupDemo);
  const startGroupCall = useAppStore((s) => s.startGroupCall);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={backToHome}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Avatar initials="TR" size={shape.avatarSm} />
        <View style={styles.textCol}>
          <Text style={styles.title}>Trip Plan</Text>
          <Text style={styles.subtitle}>5 members</Text>
        </View>
        <IconCircleButton icon="📹" onPress={startGroupCall} />
      </View>
      <ScrollView contentContainerStyle={styles.messages}>
        {groupMessages.map((m, i) => (
          <MessageBubble key={i} fromMe={m.fromMe} text={m.text} senderName={m.senderName} />
        ))}
      </ScrollView>
      <Composer onSend={sendGroupDemo} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
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
  messages: {
    padding: 16,
    gap: 8,
  },
});
