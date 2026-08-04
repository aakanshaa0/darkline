import React from "react";
import { View } from "react-native";
import { CALL_HISTORY, type CallKind } from "@shared/store";
import { CallHistoryRow } from "./CallHistoryRow";

export function CallsTabList({ onCallBack }: { onCallBack: (contactId: string, kind: CallKind) => void }) {
  return (
    <View>
      {CALL_HISTORY.map((entry) => (
        <CallHistoryRow key={entry.id} entry={entry} onPress={() => onCallBack(entry.contactId, entry.kind)} />
      ))}
    </View>
  );
}
