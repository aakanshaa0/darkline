import React, { useEffect } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, StyleSheet } from "react-native";
import {
  useAppStore,
  useChatStore,
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
  DateSeparator,
  isNewDay,
} from "../app/components";
import {
  SplashScreen,
  AuthScreen,
  SignUpScreen,
  LoginScreen,
  EmailVerifyScreen,
  ForgotPasswordScreen,
  ResetPasswordScreen,
  PhoneEntryScreen,
  OTPVerifyScreen,
  AccountExistsScreen,
  AccountLockedScreen,
  SessionExpiredScreen,
  ProfileSetupScreen,
  AccountScreen,
  LinkedAccountsScreen,
} from "../app/screens/auth";
import { colors, typography } from "../app/theme/tokens";

const NAV_ITEMS: { tab: Tab; icon: string; label: string }[] = [
  { tab: "chats", icon: "💬", label: "Chats" },
  { tab: "calls", icon: "📞", label: "Calls" },
  { tab: "nearby", icon: "📡", label: "Nearby" },
];

const TAB_TITLE: Record<Tab, string> = { chats: "Chats", calls: "Calls", nearby: "Nearby" };

/**
 * Root export — gates the three-pane shell behind real auth now (the
 * original prototype had no web auth at all; design-handoff.md flagged
 * this as something to "add... if the web product needs its own sign-in",
 * which it now does). Session persistence via bootstrapSession() means a
 * page reload doesn't force a re-login as long as the stored refresh
 * token is still valid.
 */
export default function WebApp(): React.JSX.Element {
  const bootstrapping = useAppStore((s) => s.bootstrapping);
  const currentUserId = useAppStore((s) => s.currentUserId);
  const bootstrapSession = useAppStore((s) => s.bootstrapSession);
  const screen = useAppStore((s) => s.screen);
  const navigate = useAppStore((s) => s.navigate);

  useEffect(() => {
    bootstrapSession();
  }, [bootstrapSession]);

  // Web skips the mobile splash/tap-through — go straight to the method picker.
  useEffect(() => {
    if (!bootstrapping && !currentUserId && screen === "splash") navigate("auth");
  }, [bootstrapping, currentUserId, screen, navigate]);

  if (bootstrapping) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (!currentUserId) {
    return <WebAuthScreens screen={screen} />;
  }

  return <AuthenticatedShell />;
}

function WebAuthScreens({ screen }: { screen: string }) {
  return (
    <View style={styles.authSplit}>
      <View style={styles.authBrandPanel}>
        <Logo size={72} />
        <Text style={styles.authBrandName}>darkline</Text>
        <Text style={styles.authBrandTagline}>
          Online over the internet, local over WiFi Direct, or fully offline over Bluetooth mesh — the same app,
          the same contacts, three transports.
        </Text>
      </View>
      <ScrollView style={styles.authFormPanel} contentContainerStyle={styles.authFormPanelContent}>
        <View style={styles.authFormWrap}>
          {screen === "splash" && <SplashScreen />}
          {screen === "auth" && <AuthScreen />}
          {screen === "signup" && <SignUpScreen />}
          {screen === "login" && <LoginScreen />}
          {screen === "emailVerify" && <EmailVerifyScreen />}
          {screen === "forgotPassword" && <ForgotPasswordScreen />}
          {screen === "resetPassword" && <ResetPasswordScreen />}
          {screen === "phoneEntry" && <PhoneEntryScreen />}
          {screen === "otpVerify" && <OTPVerifyScreen />}
          {screen === "accountExists" && <AccountExistsScreen />}
          {screen === "accountLocked" && <AccountLockedScreen />}
          {screen === "sessionExpired" && <SessionExpiredScreen />}
          {screen === "profile" && <ProfileSetupScreen />}
        </View>
      </ScrollView>
    </View>
  );
}

function AuthenticatedShell() {
  const screen = useAppStore((s) => s.screen);
  const tab = useAppStore((s) => s.tab);
  const setTab = useAppStore((s) => s.setTab);
  const openThread = useAppStore((s) => s.openThread);
  const openGroup = useAppStore((s) => s.openGroup);
  const startCall = useAppStore((s) => s.startCall);
  const navigate = useAppStore((s) => s.navigate);

  // "account"/"linkedAccounts" reuse the mobile screens too — simplest way
  // to get a working account/logout surface on web without a second UI.
  if (screen === "account") return <AccountScreen />;
  if (screen === "linkedAccounts") return <LinkedAccountsScreen />;

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
        <Pressable onPress={() => navigate("account")}>
          <Avatar initials="ME" size={32} />
        </Pressable>
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
  const contacts = useChatStore((s) => s.contacts);
  const activeContactId = useAppStore((s) => s.activeContactId);
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const messagesByConversation = useChatStore((s) => s.messagesByConversation);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const loadOlderMessages = useChatStore((s) => s.loadOlderMessages);
  const loadingOlder = useChatStore((s) =>
    activeConversationId ? s.loadingOlderByConversation[activeConversationId] : false,
  );
  const startCall = useAppStore((s) => s.startCall);

  // Web keeps the browser's own scroll anchoring, so unlike the native
  // ThreadScreen there's no manual offset restore needed after prepending.
  const handleScroll = React.useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      if (!activeConversationId || loadingOlder) return;
      if (e.nativeEvent.contentOffset.y > 80) return;
      void loadOlderMessages(activeConversationId);
    },
    [activeConversationId, loadingOlder, loadOlderMessages],
  );

  const activeContact = getContactsView(contacts).find((c) => c.id === activeContactId);
  const activeMessages = (activeConversationId && messagesByConversation[activeConversationId]) || [];
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
      <ScrollView
        contentContainerStyle={styles.messages}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {loadingOlder && <ActivityIndicator style={styles.olderSpinner} color={colors.textSecondary} />}
        {activeMessages.map((m, i) => (
          <React.Fragment key={m.id}>
            {isNewDay(m.createdAt, activeMessages[i - 1]?.createdAt) && <DateSeparator iso={m.createdAt} />}
            <MessageBubble
              fromMe={m.fromMe}
              text={m.text}
              createdAt={m.createdAt}
              pending={m.pending}
              maxWidthPercent={52}
            />
          </React.Fragment>
        ))}
      </ScrollView>
      <Composer onSend={sendMessage} />
    </View>
  );
}

function GroupPanel() {
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const conversations = useChatStore((s) => s.conversations);
  const messagesByConversation = useChatStore((s) => s.messagesByConversation);
  const startGroupCall = useAppStore((s) => s.startGroupCall);

  const conversation = conversations.find((c) => c.id === activeConversationId);
  const messages = (activeConversationId && messagesByConversation[activeConversationId]) || [];

  return (
    <View style={{ flex: 1 }}>
      <ThreadHeader
        initials={(conversation?.name ?? "GR").slice(0, 2).toUpperCase()}
        title={conversation?.name ?? "Group"}
        subtitle="Group chat"
        canCall
        onStartVideoCall={startGroupCall}
      />
      <ScrollView contentContainerStyle={styles.messages}>
        {messages.map((m, i) => (
          <React.Fragment key={m.id}>
            {isNewDay(m.createdAt, messages[i - 1]?.createdAt) && <DateSeparator iso={m.createdAt} />}
            <MessageBubble
              fromMe={m.fromMe}
              text={m.text}
              senderName={m.senderName}
              createdAt={m.createdAt}
              pending={m.pending}
              maxWidthPercent={52}
            />
          </React.Fragment>
        ))}
      </ScrollView>
      <Composer onSend={() => undefined} />
    </View>
  );
}

function CallPanel() {
  const contacts = useChatStore((s) => s.contacts);
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

function GroupCallPanel() {
  const muted = useAppStore((s) => s.muted);
  const endCall = useAppStore((s) => s.endCall);
  const toggleMute = useAppStore((s) => s.toggleMute);

  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.groupCallBanner}>Group call</Text>
      <View style={styles.grid} />
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
  loadingScreen: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  authSplit: {
    flex: 1,
    height: "100%",
    flexDirection: "row",
    backgroundColor: colors.background,
  },
  authBrandPanel: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 48,
    backgroundColor: colors.tabBarBg,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  authBrandName: {
    fontSize: typography.sizes.title,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  authBrandTagline: {
    fontSize: typography.sizes.body,
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 360,
    lineHeight: 21,
  },
  authFormPanel: {
    flex: 1,
  },
  authFormPanelContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  authFormWrap: {
    width: "100%",
    maxWidth: 440,
  },
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
  olderSpinner: {
    paddingBottom: 8,
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
