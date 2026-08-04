import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useAppStore, useChatStore, getNearbyContacts, getNearbyModeLabel } from "@shared/store";
import { colors, typography, shape } from "../theme/tokens";
import { SectionLabel } from "./SectionLabel";
import { ContactRow } from "./ContactRow";
import { TextField } from "./TextField";
import { Avatar } from "./Avatar";
import { EmptyText } from "./EmptyText";

/**
 * "DISCOVERABLE NOW" still reflects real WiFi/BLE presence (Part B.3.C) —
 * it's real, just will only show something once a contact's own device
 * actually reports that presence mode (native-only, unverified here — see
 * shared/p2p). The bottom section was the prototype's static "not yet a
 * contact" BLE/WiFi list; that's replaced with a real username search +
 * add flow (works on every platform, since it's just the REST API) so
 * there's an actual way to get contacts into the list at all.
 */
export function NearbyTabList() {
  const contacts = useChatStore((s) => s.contacts);
  const searchResults = useChatStore((s) => s.searchResults);
  const searchLoading = useChatStore((s) => s.searchLoading);
  const searchUsers = useChatStore((s) => s.searchUsers);
  const addContact = useChatStore((s) => s.addContact);
  const openThread = useAppStore((s) => s.openThread);
  const nearby = getNearbyContacts(contacts);
  const [query, setQuery] = useState("");
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  function handleQueryChange(value: string) {
    setQuery(value);
    searchUsers(value);
  }

  async function handleAdd(userId: string) {
    await addContact(userId);
    setAddedIds((prev) => ({ ...prev, [userId]: true }));
  }

  return (
    <View>
      <SectionLabel>DISCOVERABLE NOW</SectionLabel>
      {nearby.length === 0 && <EmptyText>No contacts nearby right now.</EmptyText>}
      {nearby.map((c) => (
        <ContactRow
          key={c.id}
          initials={c.initials}
          name={c.name}
          sub={getNearbyModeLabel(c.presence)}
          presence={c.presence}
          onPress={() => openThread(c.id)}
        />
      ))}

      <SectionLabel>FIND PEOPLE</SectionLabel>
      <View style={styles.searchField}>
        <TextField placeholder="Search by username" value={query} onChangeText={handleQueryChange} />
      </View>
      {searchLoading && <EmptyText>Searching…</EmptyText>}
      {searchResults.map((u) => {
        const added = !!addedIds[u.id];
        return (
          <View key={u.id} style={styles.row}>
            <Avatar initials={(u.name || u.username || "?").slice(0, 2).toUpperCase()} size={shape.avatarMd} />
            <View style={styles.textCol}>
              <Text style={styles.name} numberOfLines={1}>
                {u.name || u.username}
              </Text>
              <Text style={styles.sub} numberOfLines={1}>
                @{u.username}
              </Text>
            </View>
            <Pressable onPress={() => handleAdd(u.id)} disabled={added}>
              <Text style={[styles.addLabel, { color: added ? colors.textSecondary : colors.accent }]}>
                {added ? "Added" : "Add"}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  searchField: {
    paddingHorizontal: 18,
    paddingBottom: 8,
  },
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
  addLabel: {
    fontSize: typography.sizes.caption,
    fontWeight: "600",
  },
});
