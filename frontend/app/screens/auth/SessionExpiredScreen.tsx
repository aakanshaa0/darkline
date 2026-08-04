import React from "react";
import { useAppStore } from "@shared/store";
import { InfoPromptScreen } from "../../components";

export function SessionExpiredScreen() {
  const navigate = useAppStore((s) => s.navigate);
  return (
    <InfoPromptScreen
      icon="⏱️"
      title="Session expired"
      message="For your security, please log in again to continue."
      primaryLabel="Log in again"
      onPrimary={() => navigate("auth")}
    />
  );
}
