import React from "react";
import { View } from "react-native";
import { presenceColors } from "../theme/tokens";
import type { Presence } from "@shared/store";

export function PresenceDot({ presence, size = 9 }: { presence: Presence; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: presenceColors[presence],
        flexShrink: 0,
      }}
    />
  );
}
