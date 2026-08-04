// NOTE: unverified in this environment — @nozbe/watermelondb's SQLite
// adapter is a native module (JSI-backed) and needs a real native build
// to open an actual database file.
import { Database } from "@nozbe/watermelondb";
import SQLiteAdapter from "@nozbe/watermelondb/adapters/sqlite";
import { appSchema_ } from "./schema";
import { LocalConversation } from "./models/LocalConversation";
import { LocalMessage } from "./models/LocalMessage";
import { LocalCall } from "./models/LocalCall";

const adapter = new SQLiteAdapter({
  schema: appSchema_,
  jsi: true,
});

export const database = new Database({
  adapter,
  modelClasses: [LocalConversation, LocalMessage, LocalCall],
});
