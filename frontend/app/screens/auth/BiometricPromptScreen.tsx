import React from "react";
import { useAppStore } from "@shared/store";
import { InfoPromptScreen } from "../../components";

/** Mobile-only (design-handoff.md footnote) — not applicable on web. */
export function BiometricPromptScreen() {
  const navigate = useAppStore((s) => s.navigate);
  return (
    <InfoPromptScreen
      icon="🔐"
      title="Enable quick sign-in"
      message="Use Face ID or Touch ID to unlock Darkline faster next time."
      primaryLabel="Enable"
      onPrimary={() => navigate("pushPermission")}
      secondaryLabel="Not now"
      onSecondary={() => navigate("pushPermission")}
    />
  );
}
