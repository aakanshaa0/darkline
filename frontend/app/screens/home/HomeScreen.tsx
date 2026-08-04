import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { useAppStore, type Tab } from "@shared/store";
import { ChatsTabList, CallsTabList, NearbyTabList, Avatar } from "../../components";
import { colors, shape, typography } from "../../theme/tokens";

const TAB_LABEL: Record<Tab, string> = { chats: "Chats", calls: "Calls", nearby: "Nearby" };
const HOME_TITLE: Record<Tab, string> = { chats: "Chats", calls: "Calls", nearby: "Nearby" };

export function HomeScreen() {
  const tab = useAppStore((s) => s.tab);
  const setTab = useAppStore((s) => s.setTab);
  const openThread = useAppStore((s) => s.openThread);
  const openGroup = useAppStore((s) => s.openGroup);
  const startCall = useAppStore((s) => s.startCall);
  const navigate = useAppStore((s) => s.navigate);

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{HOME_TITLE[tab]}</Text>
        <Pressable onPress={() => navigate("account")}>
          <Avatar initials="ME" size={shape.avatarSm} />
        </Pressable>
      </View>
      <ScrollView style={styles.scroll}>
        {tab === "chats" && <ChatsTabList onOpenThread={openThread} onOpenGroup={openGroup} />}
        {tab === "calls" && <CallsTabList onCallBack={(contactId, kind) => startCall(contactId, kind)} />}
        {tab === "nearby" && <NearbyTabList />}
      </ScrollView>
      <View style={styles.tabBar}>
        {(Object.keys(TAB_LABEL) as Tab[]).map((t) => (
          <Pressable key={t} style={styles.tabItem} onPress={() => setTab(t)}>
            <Text style={[styles.tabLabel, { color: tab === t ? colors.accent : colors.textSecondary }]}>
              {TAB_LABEL[t]}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 10,
  },
  title: {
    fontSize: typography.sizes.title,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  scroll: {
    flex: 1,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.tabBarBg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 10,
    paddingBottom: 22,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
  },
  tabLabel: {
    fontSize: typography.sizes.caption,
  },
});
