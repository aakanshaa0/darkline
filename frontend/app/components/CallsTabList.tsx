import React from "react";
import { View } from "react-native";
import { useCallStore, type CallKind } from "@shared/store";
import { CallHistoryRow } from "./CallHistoryRow";
import { EmptyText } from "./EmptyText";

export function CallsTabList({ onCallBack }: { onCallBack: (contactId: string, kind: CallKind) => void }) {
  const callHistory = useCallStore((s) => s.callHistory);
  return (
    <View>
      {callHistory.length === 0 && <EmptyText>No calls yet.</EmptyText>}
      {callHistory.map((entry) => (
        <CallHistoryRow
          key={entry.id}
          entry={entry}
          onPress={() => onCallBack(entry.contactId, entry.kind === "group" ? "audio" : entry.kind)}
        />
      ))}
    </View>
  );
}
