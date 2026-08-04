import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { useAppStore, useChatStore } from "@shared/store";
import { Avatar, MessageBubble, Composer, IconCircleButton } from "../../components";
import { colors, shape, typography } from "../../theme/tokens";

/**
 * Group E2EE (Sender Keys) isn't wired up yet — see chatStore's
 * openGroupConversation comment — so this always shows an empty thread and
 * the composer is a no-op. Not reachable in practice without a
 * create-group flow, which doesn't exist either yet.
 */
export function GroupScreen() {
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const conversations = useChatStore((s) => s.conversations);
  const messagesByConversation = useChatStore((s) => s.messagesByConversation);
  const backToHome = useAppStore((s) => s.backToHome);
  const startGroupCall = useAppStore((s) => s.startGroupCall);

  const conversation = conversations.find((c) => c.id === activeConversationId);
  const messages = (activeConversationId && messagesByConversation[activeConversationId]) || [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={backToHome}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Avatar initials={(conversation?.name ?? "GR").slice(0, 2).toUpperCase()} size={shape.avatarSm} />
        <View style={styles.textCol}>
          <Text style={styles.title}>{conversation?.name ?? "Group"}</Text>
          <Text style={styles.subtitle}>Group chat</Text>
        </View>
        <IconCircleButton icon="📹" onPress={startGroupCall} />
      </View>
      <ScrollView contentContainerStyle={styles.messages}>
        {messages.map((m) => (
          <MessageBubble key={m.id} fromMe={m.fromMe} text={m.text} senderName={m.senderName} />
        ))}
      </ScrollView>
      <Composer onSend={() => undefined} />
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
