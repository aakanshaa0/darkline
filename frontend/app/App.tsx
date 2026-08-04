import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { useAppStore } from "@shared/store";
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
  BiometricPromptScreen,
  PushPermissionScreen,
  ProfileSetupScreen,
  AccountScreen,
  LinkedAccountsScreen,
} from "./screens/auth";
import { HomeScreen } from "./screens/home";
import { ThreadScreen } from "./screens/chats";
import { GroupScreen } from "./screens/groups";
import { CallScreen, GroupCallScreen } from "./screens/calls";
import { colors } from "./theme/tokens";

/**
 * Mobile shell — one screen visible at a time, driven by `screen` in the
 * shared store, mirroring the prototype's own state machine (see
 * docs/design-reference/Darkline App.dc.html). The device bezel/status-bar
 * chrome (ios-frame.jsx) is presentation-only for the prototype and
 * intentionally not ported — see docs/design-reference/design-handoff.md.
 */
export default function App(): React.JSX.Element {
  const screen = useAppStore((s) => s.screen);
  const bootstrapSession = useAppStore((s) => s.bootstrapSession);

  // Same rehydration WebApp.tsx does — without it a stored keychain session
  // is never restored on native, so every cold start lands back on auth.
  useEffect(() => {
    bootstrapSession();
  }, [bootstrapSession]);

  return (
    <View style={styles.root}>
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
      {screen === "biometricPrompt" && <BiometricPromptScreen />}
      {screen === "pushPermission" && <PushPermissionScreen />}
      {screen === "profile" && <ProfileSetupScreen />}
      {screen === "account" && <AccountScreen />}
      {screen === "linkedAccounts" && <LinkedAccountsScreen />}
      {screen === "home" && <HomeScreen />}
      {screen === "thread" && <ThreadScreen />}
      {screen === "group" && <GroupScreen />}
      {screen === "call" && <CallScreen />}
      {screen === "groupcall" && <GroupCallScreen />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
