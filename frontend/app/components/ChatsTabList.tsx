import React from "react";
import { View } from "react-native";
import { useAppStore, getContactsView, GROUPS } from "@shared/store";
import { SectionLabel } from "./SectionLabel";
import { ContactRow } from "./ContactRow";

interface ChatsTabListProps {
  onOpenThread: (id: string) => void;
  onOpenGroup: () => void;
  /** Web highlights the currently-open row in the list panel; mobile doesn't need this (full-screen nav). */
  highlightSelection?: boolean;
}

export function ChatsTabList({ onOpenThread, onOpenGroup, highlightSelection = false }: ChatsTabListProps) {
  const contacts = useAppStore((s) => s.contacts);
  const screen = useAppStore((s) => s.screen);
  const activeContactId = useAppStore((s) => s.activeContactId);
  const contactsView = getContactsView(contacts);

  return (
    <View>
      <SectionLabel>GROUPS</SectionLabel>
      {GROUPS.map((g) => (
        <ContactRow
          key={g.id}
          initials={g.initials}
          name={g.name}
          sub={`${g.count} members`}
          highlighted={highlightSelection && screen === "group"}
          onPress={onOpenGroup}
        />
      ))}
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
