import React from "react";
import { useAppStore } from "@shared/store";
import { InfoPromptScreen } from "../../components";

export function AccountLockedScreen() {
  const navigate = useAppStore((s) => s.navigate);
  return (
    <InfoPromptScreen
      icon="🔒"
      title="Too many attempts"
      message="Your account is temporarily locked. Try again in 15 minutes, or reset your password now."
      primaryLabel="Reset password instead"
      onPrimary={() => navigate("forgotPassword")}
      secondaryLabel="Back to log in"
      onSecondary={() => navigate("login")}
      onBack={() => navigate("login")}
    />
  );
}
