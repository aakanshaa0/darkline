import React from "react";
import { View } from "react-native";
import { colors } from "../theme/tokens";

/**
 * The darkline mark: two circles connected by a diagonal line — one filled
 * coral ("online"), one coral-stroked outline ("reachable but not
 * connected"). Ported from the inline SVG in ios-frame usage
 * (viewBox 0 0 40 40: line 12,29→29,11; circle r6 @ 8,32 filled; circle r6
 * @ 32,8 outline) since there's no react-native-svg dependency here —
 * plain Views + a rotated rectangle reproduce it closely enough for this
 * fidelity level.
 */
export function Logo({ size = 40 }: { size?: number }) {
  const scale = size / 40;
  const strokeW = 2.5 * scale;

  return (
    <View style={{ width: size, height: size }}>
      {/* diagonal connecting line: (12,29) → (29,11) in the 40×40 viewBox */}
      <View
        style={{
          position: "absolute",
          left: 20.5 * scale - (24.76 * scale) / 2,
          top: 20 * scale - strokeW / 2,
          width: 24.76 * scale,
          height: strokeW,
          borderRadius: strokeW / 2,
          backgroundColor: colors.accent,
          transform: [{ rotate: "-46.64deg" }],
        }}
      />
      {/* filled circle @ (8,32) r6 — "online" */}
      <View
        style={{
          position: "absolute",
          left: 2 * scale,
          top: 26 * scale,
          width: 12 * scale,
          height: 12 * scale,
          borderRadius: 6 * scale,
          backgroundColor: colors.accent,
        }}
      />
      {/* outline circle @ (32,8) r6 — "reachable but not connected" */}
      <View
        style={{
          position: "absolute",
          left: 26 * scale,
          top: 2 * scale,
          width: 12 * scale,
          height: 12 * scale,
          borderRadius: 6 * scale,
          borderWidth: strokeW,
          borderColor: colors.textPrimary,
        }}
      />
    </View>
  );
}
