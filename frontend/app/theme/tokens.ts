import { oklch } from "./oklch";

/**
 * Design tokens from docs/design-reference/design-handoff.md, converted
 * from oklch to hex at module load (see ./oklch.ts). Dark theme only —
 * no light mode designed yet.
 */

export const colors = {
  background: oklch(18, 0.004, 60), // oklch(18% 0.004 60)
  surfaceRaised: oklch(27, 0.006, 60), // oklch(27% 0.006 60)
  tabBarBg: oklch(15, 0.004, 60), // oklch(15% 0.004 60)
  border: oklch(30, 0.006, 60), // oklch(30% 0.006 60)
  textPrimary: oklch(95, 0.005, 60), // oklch(95% 0.005 60)
  textSecondary: oklch(60, 0.01, 60), // oklch(60% 0.01 60)
  accent: oklch(68, 0.16, 35), // oklch(68% 0.16 35)
  onAccentText: oklch(20, 0.02, 35), // oklch(20% 0.02 35)
  destructive: "#e5484d",
} as const;

export const presenceColors = {
  online: colors.accent,
  wifi: oklch(70, 0.09, 240), // oklch(70% 0.09 240)
  ble: oklch(70, 0.1, 90), // oklch(70% 0.1 90)
  offline: oklch(45, 0.005, 60), // oklch(45% 0.005 60)
} as const;

export const callBanner = {
  internet: { bg: oklch(24, 0.05, 150), text: oklch(78, 0.12, 150) },
  local: { bg: oklch(24, 0.05, 240), text: oklch(78, 0.1, 240) },
} as const;

export const typography = {
  fontFamily: "System",
  sizes: {
    sectionLabel: 11,
    caption: 12,
    body: 14,
    subtitle: 15,
    name: 19,
    title: 26,
    logo: 24,
  },
} as const;

export const shape = {
  avatarSm: 32,
  avatarMd: 38,
  avatarLg: 96,
  bubbleRadius: 14,
  bubbleTailRadius: 4,
  controlRadius: 12,
  pillRadius: 20,
  callButtonSize: 52,
  iconButtonSize: 32,
} as const;
