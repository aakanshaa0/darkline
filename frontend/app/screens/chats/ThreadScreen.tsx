import React from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { useAppStore, useChatStore, getContactsView } from "@shared/store";
import { ThreadHeader, MessageBubble, Composer } from "../../components";
import { colors } from "../../theme/tokens";

export function ThreadScreen() {
  const contacts = useChatStore((s) => s.contacts);
  const activeContactId = useAppStore((s) => s.activeContactId);
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const messagesByConversation = useChatStore((s) => s.messagesByConversation);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const backToHome = useAppStore((s) => s.backToHome);
  const startCall = useAppStore((s) => s.startCall);

  const contactsView = getContactsView(contacts);
  const activeContact = contactsView.find((c) => c.id === activeContactId);
  const activeMessages = (activeConversationId && messagesByConversation[activeConversationId]) || [];

  if (!activeContact) return null;

  return (
    <View style={styles.container}>
      <ThreadHeader
        initials={activeContact.initials}
        title={activeContact.name}
        subtitle={activeContact.presenceLabel}
        onBack={backToHome}
        canCall={activeContact.canCall}
        onStartAudioCall={() => startCall(activeContact.id, "audio")}
        onStartVideoCall={() => startCall(activeContact.id, "video")}
        callNote={activeContact.callNote}
      />
      <ScrollView contentContainerStyle={styles.messages}>
        {activeMessages.map((m) => (
          <MessageBubble key={m.id} fromMe={m.fromMe} text={m.text} />
        ))}
      </ScrollView>
      <Composer onSend={sendMessage} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  messages: {
    padding: 16,
    gap: 8,
  },
});
