import React from "react";
import { useAppStore } from "@shared/store";
import { InfoPromptScreen } from "../../components";

export function AccountExistsScreen() {
  const navigate = useAppStore((s) => s.navigate);
  return (
    <InfoPromptScreen
      icon="⚠️"
      title="Account already exists"
      message="An account already exists with jordan@email.com using a different sign-in method."
      primaryLabel="Log in with password instead"
      onPrimary={() => navigate("login")}
      secondaryLabel="Try a different account"
      onSecondary={() => navigate("auth")}
      onBack={() => navigate("auth")}
    />
  );
}
