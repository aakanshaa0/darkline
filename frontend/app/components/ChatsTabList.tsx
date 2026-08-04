import React from "react";
import { View } from "react-native";
import { useAppStore, useChatStore, getContactsView } from "@shared/store";
import { SectionLabel } from "./SectionLabel";
import { ContactRow } from "./ContactRow";
import { EmptyText } from "./EmptyText";

interface ChatsTabListProps {
  onOpenThread: (id: string) => void;
  onOpenGroup: (conversationId: string) => void;
  /** Web highlights the currently-open row in the list panel; mobile doesn't need this (full-screen nav). */
  highlightSelection?: boolean;
}

export function ChatsTabList({ onOpenThread, onOpenGroup, highlightSelection = false }: ChatsTabListProps) {
  const contacts = useChatStore((s) => s.contacts);
  const groups = useChatStore((s) => s.conversations.filter((c) => c.type === "group"));
  const screen = useAppStore((s) => s.screen);
  const activeContactId = useAppStore((s) => s.activeContactId);
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const contactsView = getContactsView(contacts);

  return (
    <View>
      {groups.length === 0 && contactsView.length === 0 && (
        <EmptyText>No chats yet. Find people in the Nearby tab to start one.</EmptyText>
      )}
      {groups.length > 0 && (
        <>
          <SectionLabel>GROUPS</SectionLabel>
          {groups.map((g) => (
            <ContactRow
              key={g.id}
              initials={(g.name ?? "GR").slice(0, 2).toUpperCase()}
              name={g.name ?? "Group"}
              sub="Group chat"
              highlighted={highlightSelection && screen === "group" && activeConversationId === g.id}
              onPress={() => onOpenGroup(g.id)}
            />
          ))}
        </>
      )}
      {contactsView.map((c) => (
        <React.Fragment key={c.id}>
          {c.isSectionStart && <SectionLabel>{c.sectionLabel}</SectionLabel>}
          <ContactRow
            initials={c.initials}
            name={c.name}
            sub={c.sub}
            presence={c.presence}
            opacity={c.presence === "offline" ? 0.55 : 1}
            highlighted={highlightSelection && screen === "thread" && activeContactId === c.id}
            onPress={() => onOpenThread(c.id)}
          />
        </React.Fragment>
      ))}
    </View>
  );
}
