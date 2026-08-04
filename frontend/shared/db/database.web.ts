import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { appSchema_ } from "./schema";
import { LocalConversation } from "./models/LocalConversation";
import { LocalMessage } from "./models/LocalMessage";
import { LocalCall } from "./models/LocalCall";

// LokiJS + IndexedDB, per Part E.2: "WatermelonDB web adapter (LokiJS) or
// Dexie/IndexedDB" — riskiest shared piece per that same table, so this is
// the one worth prototyping/testing early once there's a real browser to
// click through (this is at least verifiable by this project's own
// `npm run web`, unlike the native adapter).
const adapter = new LokiJSAdapter({
  schema: appSchema_,
  useWebWorker: false,
  useIncrementalIndexedDB: true,
});

export const database = new Database({
  adapter,
  modelClasses: [LocalConversation, LocalMessage, LocalCall],
});
