import React from "react";
import { useAppStore } from "@shared/store";
import { InfoPromptScreen } from "../../components";

/** Mobile-only (design-handoff.md footnote) — not applicable on web. */
export function PushPermissionScreen() {
  const goHome = useAppStore((s) => s.goHome);
  return (
    <InfoPromptScreen
      icon="🔔"
      title="Stay in the loop"
      message="Get notified about new messages and calls, even when the app is closed."
      primaryLabel="Allow notifications"
      onPrimary={goHome}
      secondaryLabel="Not now"
      onSecondary={goHome}
    />
  );
}
