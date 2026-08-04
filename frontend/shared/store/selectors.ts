import type { Contact, Presence } from "./appStore";

/**
 * Pure derived-data helpers, split out of appStore so the store stays data-only
 * and components decide how status maps to color (theme lives in app/theme,
 * which this platform-agnostic package intentionally doesn't import).
 */

export const PRESENCE_LABEL: Record<Presence, string> = {
  online: "Online",
  wifi: "Nearby · WiFi",
  ble: "Nearby · Bluetooth",
  offline: "Offline",
};

export const SECTION_LABEL: Record<Presence, string> = {
  online: "ONLINE",
  wifi: "NEARBY — WIFI",
  ble: "NEARBY — BLUETOOTH",
  offline: "OFFLINE",
};

export interface ContactView extends Contact {
  isSectionStart: boolean;
  sectionLabel: string;
  presenceLabel: string;
  canCall: boolean;
  callNote: string | null;
}

export function getContactsView(contacts: Contact[]): ContactView[] {
  let lastSection: Presence | null = null;
  return contacts.map((c) => {
    const isSectionStart = c.presence !== lastSection;
    lastSection = c.presence;
    const canCall = c.presence === "online" || c.presence === "wifi";
    const callNote =
      c.presence === "ble"
        ? "Calls aren't available over Bluetooth mesh — text only."
        : c.presence === "offline"
          ? "This contact is offline. Messages sync once they reconnect."
          : null;
    return {
      ...c,
      isSectionStart,
      sectionLabel: SECTION_LABEL[c.presence],
      presenceLabel: PRESENCE_LABEL[c.presence],
      canCall,
      callNote,
    };
  });
}

export function getNearbyContacts(contacts: Contact[]): ContactView[] {
  return getContactsView(contacts).filter((c) => c.presence === "wifi" || c.presence === "ble");
}

export function getNearbyModeLabel(presence: Presence): string {
  return presence === "wifi" ? "WiFi direct · chat + call" : "Bluetooth mesh · text only";
}

export interface CallHistoryEntry {
  id: string;
  name: string;
  initials: string;
  kind: "audio" | "video" | "group";
  mode: "internet" | "local" | "ble";
  missed: boolean;
  duration: string;
  time: string;
  contactId: string;
  kindLabel: string;
  modeLabel: string;
}

export function getCallBannerMode(presence: Presence | undefined): "internet" | "local" {
  return presence === "wifi" ? "local" : "internet";
}

export function getCallBannerText(presence: Presence | undefined): string {
  return presence === "wifi" ? "Switched to local network" : "On the internet — good connection";
}
