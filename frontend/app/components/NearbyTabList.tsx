import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import {
  useAppStore,
  getNearbyContacts,
  getNearbyModeLabel,
  UNKNOWN_DEVICES,
} from "@shared/store";
import { colors, typography } from "../theme/tokens";
import { SectionLabel } from "./SectionLabel";
import { ContactRow } from "./ContactRow";

export function NearbyTabList() {
  const contacts = useAppStore((s) => s.contacts);
  const addedNearby = useAppStore((s) => s.addedNearby);
  const addNearby = useAppStore((s) => s.addNearby);
  const openThread = useAppStore((s) => s.openThread);
  const nearby = getNearbyContacts(contacts);

  return (
    <View>
      <SectionLabel>DISCOVERABLE NOW</SectionLabel>
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
      <SectionLabel>NOT YET A CONTACT</SectionLabel>
      {UNKNOWN_DEVICES.map((u) => {
        const added = !!addedNearby[u.id];
        return (
          <View key={u.id} style={styles.row}>
            <View style={styles.unknownAvatar}>
              <Text style={styles.unknownAvatarText}>?</Text>
            </View>
            <View style={styles.textCol}>
              <Text style={styles.name} numberOfLines={1}>
                {u.name}
              </Text>
              <Text style={styles.sub} numberOfLines={1}>
                {u.modeLabel}
              </Text>
            </View>
            <Pressable onPress={() => addNearby(u.id)} disabled={added}>
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 9,
    paddingHorizontal: 18,
  },
  unknownAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  unknownAvatarText: {
    fontSize: 11,
    color: colors.textSecondary,
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
