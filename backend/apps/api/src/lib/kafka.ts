import { Kafka } from "kafkajs";
import { env } from "@darkline/config";
import { logger } from "./logger";

export const TOPICS = ["messages.new", "presence.updates", "calls.events"] as const;

const kafka = new Kafka({ clientId: env.KAFKA_CLIENT_ID, brokers: env.KAFKA_BROKERS.split(",") });
const producer = kafka.producer();
let connected = false;

async function ensureConnected() {
  if (!connected) {
    await producer.connect();
    connected = true;
  }
}

/**
 * Explicit topic creation at boot (Part F.6 step 4: "stand up Kafka
 * topics") rather than relying on broker auto-creation, which is often
 * disabled outside local dev and isn't something to depend on either way.
 */
export async function ensureTopics(): Promise<void> {
  const admin = kafka.admin();
  await admin.connect();
  try {
    await admin.createTopics({ topics: TOPICS.map((topic) => ({ topic, numPartitions: 3 })) });
  } finally {
    await admin.disconnect();
  }
}

/**
 * Write-then-publish (Part F.4): the Mongo write already happened by the
 * time this is called. A publish failure here is logged, not thrown — an
 * OutboxEvent row (written alongside the Mongo write) is the durable
 * record; a future outbox-publisher process can replay anything this
 * direct publish drops. Not building that separate poller yet — see
 * OutboxEvent model comment — so today it's this direct publish path that
 * actually delivers events to notification-worker/fanout-worker.
 */
export async function publishEvent(topic: string, key: string, payload: unknown): Promise<void> {
  try {
    await ensureConnected();
    await producer.send({ topic, messages: [{ key, value: JSON.stringify(payload) }] });
  } catch (err) {
    logger.error({ err, topic, key }, "Kafka publish failed — relying on OutboxEvent row for replay");
  }
}
