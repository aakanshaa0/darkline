import React, { useCallback, useRef } from "react";
import {
  View,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { useAppStore, useChatStore, getContactsView } from "@shared/store";
import { ThreadHeader, MessageBubble, Composer, DateSeparator, isNewDay } from "../../components";
import { colors } from "../../theme/tokens";

/** How close to the top counts as "scrolled up far enough to fetch". */
const LOAD_OLDER_THRESHOLD_PX = 80;

export function ThreadScreen() {
  const contacts = useChatStore((s) => s.contacts);
  const activeContactId = useAppStore((s) => s.activeContactId);
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const messagesByConversation = useChatStore((s) => s.messagesByConversation);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const loadOlderMessages = useChatStore((s) => s.loadOlderMessages);
  const loadingOlder = useChatStore((s) =>
    activeConversationId ? s.loadingOlderByConversation[activeConversationId] : false,
  );
  const backToHome = useAppStore((s) => s.backToHome);
  const startCall = useAppStore((s) => s.startCall);

  const scrollRef = useRef<ScrollView>(null);
  // Content height captured before a fetch, so scroll position can be restored
  // once older messages are prepended — otherwise the view jumps.
  const heightBeforeLoad = useRef<number | null>(null);

  const contactsView = getContactsView(contacts);
  const activeContact = contactsView.find((c) => c.id === activeContactId);
  const activeMessages = (activeConversationId && messagesByConversation[activeConversationId]) || [];

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!activeConversationId || loadingOlder) return;
      if (e.nativeEvent.contentOffset.y > LOAD_OLDER_THRESHOLD_PX) return;
      heightBeforeLoad.current = e.nativeEvent.contentSize.height;
      void loadOlderMessages(activeConversationId);
    },
    [activeConversationId, loadingOlder, loadOlderMessages],
  );

  const handleContentSizeChange = useCallback((_w: number, height: number) => {
    const previous = heightBeforeLoad.current;
    if (previous === null) {
      // Normal growth (message sent or received) — stay pinned to the bottom.
      scrollRef.current?.scrollToEnd({ animated: false });
      return;
    }
    // A page was prepended: keep whatever the user was reading in place.
    heightBeforeLoad.current = null;
    scrollRef.current?.scrollTo({ y: height - previous, animated: false });
  }, []);

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
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.messages}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onContentSizeChange={handleContentSizeChange}
      >
        {loadingOlder && <ActivityIndicator style={styles.spinner} color={colors.textSecondary} />}
        {activeMessages.map((m, i) => (
          <React.Fragment key={m.id}>
            {isNewDay(m.createdAt, activeMessages[i - 1]?.createdAt) && <DateSeparator iso={m.createdAt} />}
            <MessageBubble fromMe={m.fromMe} text={m.text} createdAt={m.createdAt} pending={m.pending} />
          </React.Fragment>
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
  spinner: {
    paddingBottom: 8,
  },
});
