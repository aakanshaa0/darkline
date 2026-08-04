import React from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import {
  useAppStore,
  getContactsView,
  getCallBannerMode,
  getCallBannerText,
  type Tab,
} from "@shared/store";
import {
  Logo,
  Avatar,
  ChatsTabList,
  CallsTabList,
  NearbyTabList,
  ThreadHeader,
  MessageBubble,
  Composer,
  CallBanner,
  CallControls,
} from "../app/components";
import { colors, typography } from "../app/theme/tokens";

const NAV_ITEMS: { tab: Tab; icon: string; label: string }[] = [
  { tab: "chats", icon: "💬", label: "Chats" },
  { tab: "calls", icon: "📞", label: "Calls" },
  { tab: "nearby", icon: "📡", label: "Nearby" },
];

const TAB_TITLE: Record<Tab, string> = { chats: "Chats", calls: "Calls", nearby: "Nearby" };

/**
 * Three-pane web shell: nav rail + persistent list panel + a right panel
 * that swaps content based on `screen` — ported from
 * docs/design-reference/Darkline Web.dc.html. Unlike mobile, splash/auth/
 * profile don't apply here (design-handoff.md: "Web currently has no
 * splash/auth/profile-setup screens — it opens directly into the app
 * shell"), so this ignores those `screen` values entirely.
 */
export default function WebApp(): React.JSX.Element {
  const screen = useAppStore((s) => s.screen);
  const tab = useAppStore((s) => s.tab);
  const setTab = useAppStore((s) => s.setTab);
  const openThread = useAppStore((s) => s.openThread);
  const openGroup = useAppStore((s) => s.openGroup);
  const startCall = useAppStore((s) => s.startCall);

  return (
    <View style={styles.root}>
      <View style={styles.navRail}>
        <Logo size={26} />
        <View style={{ flex: 1 }} />
        {NAV_ITEMS.map((item) => (
          <Pressable key={item.tab} style={styles.navItem} onPress={() => setTab(item.tab)}>
            <Text style={styles.navIcon}>{item.icon}</Text>
            <Text style={[styles.navLabel, { color: tab === item.tab ? colors.accent : colors.textSecondary }]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
        <View style={{ flex: 1 }} />
        <Avatar initials="ME" size={32} />
      </View>

      <View style={styles.listPanel}>
        <Text style={styles.listTitle}>{TAB_TITLE[tab]}</Text>
        <ScrollView style={{ flex: 1 }}>
          {tab === "chats" && (
            <ChatsTabList onOpenThread={openThread} onOpenGroup={openGroup} highlightSelection />
          )}
          {tab === "calls" && <CallsTabList onCallBack={(contactId, kind) => startCall(contactId, kind)} />}
          {tab === "nearby" && <NearbyTabList />}
        </ScrollView>
      </View>

      <View style={styles.mainPanel}>
        {screen === "thread" && <ThreadPanel />}
        {screen === "group" && <GroupPanel />}
        {screen === "call" && <CallPanel />}
        {screen === "groupcall" && <GroupCallPanel />}
        {(screen !== "thread" && screen !== "group" && screen !== "call" && screen !== "groupcall") && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Select a conversation to start chatting</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function ThreadPanel() {
  const contacts = useAppStore((s) => s.contacts);
  const activeContactId = useAppStore((s) => s.activeContactId);
  const messages = useAppStore((s) => s.messages);
  const sendDemo = useAppStore((s) => s.sendDemo);
  const startCall = useAppStore((s) => s.startCall);

  const activeContact = getContactsView(contacts).find((c) => c.id === activeContactId);
  const activeMessages = (activeContactId && messages[activeContactId]) || [];
  if (!activeContact) return null;

  return (
    <View style={{ flex: 1 }}>
      <ThreadHeader
        initials={activeContact.initials}
        title={activeContact.name}
        subtitle={activeContact.presenceLabel}
        canCall={activeContact.canCall}
        onStartAudioCall={() => startCall(activeContact.id, "audio")}
        onStartVideoCall={() => startCall(activeContact.id, "video")}
        callNote={activeContact.callNote}
      />
      <ScrollView contentContainerStyle={styles.messages}>
        {activeMessages.map((m, i) => (
          <MessageBubble key={i} fromMe={m.fromMe} text={m.text} maxWidthPercent={52} />
        ))}
      </ScrollView>
      <Composer onSend={sendDemo} />
    </View>
  );
}

function GroupPanel() {
  const groupMessages = useAppStore((s) => s.groupMessages);
  const sendGroupDemo = useAppStore((s) => s.sendGroupDemo);
  const startGroupCall = useAppStore((s) => s.startGroupCall);

  return (
    <View style={{ flex: 1 }}>
      <ThreadHeader
        initials="TR"
        title="Trip Plan"
        subtitle="5 members"
        canCall
        onStartVideoCall={startGroupCall}
      />
      <ScrollView contentContainerStyle={styles.messages}>
        {groupMessages.map((m, i) => (
          <MessageBubble key={i} fromMe={m.fromMe} text={m.text} senderName={m.senderName} maxWidthPercent={52} />
        ))}
      </ScrollView>
      <Composer onSend={sendGroupDemo} />
    </View>
  );
}

function CallPanel() {
  const contacts = useAppStore((s) => s.contacts);
  const callContactId = useAppStore((s) => s.callContactId);
  const callKind = useAppStore((s) => s.callKind);
  const callPhase = useAppStore((s) => s.callPhase);
  const muted = useAppStore((s) => s.muted);
  const speakerOn = useAppStore((s) => s.speakerOn);
  const endCall = useAppStore((s) => s.endCall);
  const toggleMute = useAppStore((s) => s.toggleMute);
  const toggleSpeaker = useAppStore((s) => s.toggleSpeaker);

  const callContact = getContactsView(contacts).find((c) => c.id === callContactId);
  const bannerMode = getCallBannerMode(callContact?.presence);
  const bannerText = getCallBannerText(callContact?.presence);
  const statusText = callPhase === "ringing" ? "Calling…" : "00:14";

  return (
    <View style={{ flex: 1 }}>
      {callKind === "video" && (
        <>
          <View style={styles.remoteVideo}>
            <Text style={styles.remoteVideoLabel}>REMOTE VIDEO</Text>
          </View>
          <View style={styles.pip}>
            <Text style={styles.pipLabel}>you</Text>
          </View>
        </>
      )}
      <CallBanner mode={bannerMode} text={bannerText} />
      {callKind === "video" && <View style={{ flex: 1 }} />}
      {callKind === "audio" && (
        <View style={styles.audioBody}>
          <View style={styles.avatarLg}>
            <Text style={styles.avatarLgText}>{callContact?.initials}</Text>
          </View>
          <Text style={styles.name}>{callContact?.name}</Text>
          <Text style={styles.status}>{statusText}</Text>
        </View>
      )}
      <CallControls
        kind={callKind}
        muted={muted}
        speakerOn={speakerOn}
        onToggleMute={toggleMute}
        onToggleSpeaker={toggleSpeaker}
        onEndCall={endCall}
      />
    </View>
  );
}

const GROUP_CALL_TILES = [
  { label: "JM", active: false },
  { label: "SA", active: false },
  { label: "TK", active: true },
  { label: "+2", active: false },
];

function GroupCallPanel() {
  const muted = useAppStore((s) => s.muted);
  const endCall = useAppStore((s) => s.endCall);
  const toggleMute = useAppStore((s) => s.toggleMute);

  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.groupCallBanner}>Group call · Trip Plan</Text>
      <View style={styles.grid}>
        {GROUP_CALL_TILES.map((t) => (
          <View key={t.label} style={[styles.tile, t.active && styles.tileActive]}>
            <Text style={styles.tileLabel}>{t.label}</Text>
          </View>
        ))}
      </View>
      <CallControls
        kind="group"
        muted={muted}
        speakerOn={false}
        onToggleMute={toggleMute}
        onToggleSpeaker={() => undefined}
        onEndCall={endCall}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    height: "100%",
    backgroundColor: colors.background,
  },
  navRail: {
    width: 76,
    alignItems: "center",
    paddingVertical: 20,
    gap: 22,
    backgroundColor: colors.tabBarBg,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  navItem: {
    alignItems: "center",
    gap: 4,
  },
  navIcon: {
    fontSize: 18,
  },
  navLabel: {
    fontSize: 10,
  },
  listPanel: {
    width: 300,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  listTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
    padding: 18,
    paddingBottom: 8,
  },
  mainPanel: {
    flex: 1,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: typography.sizes.body,
    color: colors.textSecondary,
  },
  messages: {
    padding: 20,
    gap: 8,
  },
  remoteVideo: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  remoteVideoLabel: {
    fontSize: 13,
    letterSpacing: 1,
    color: colors.textSecondary,
  },
  pip: {
    position: "absolute",
    top: 70,
    right: 20,
    width: 120,
    height: 80,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  pipLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  audioBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  avatarLg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLgText: {
    fontSize: 30,
    color: colors.textPrimary,
  },
  name: {
    fontSize: typography.sizes.name,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  status: {
    fontSize: typography.sizes.body,
    color: colors.textSecondary,
  },
  groupCallBanner: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    padding: 14,
    paddingHorizontal: 20,
    backgroundColor: colors.surfaceRaised,
    color: colors.textPrimary,
  },
  grid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    padding: 16,
  },
  tile: {
    width: "48%",
    aspectRatio: 1.4,
    backgroundColor: colors.surfaceRaised,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tileActive: {
    borderWidth: 2,
    borderColor: colors.accent,
  },
  tileLabel: {
    fontSize: 18,
    color: colors.textPrimary,
  },
});
