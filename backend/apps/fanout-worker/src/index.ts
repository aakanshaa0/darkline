import { Kafka } from "kafkajs";
import { connectDB } from "@darkline/db";
import { env } from "@darkline/config";
import type { MessageNewEvent } from "@darkline/shared-types";
import { isOnline } from "./lib/presence";
import { emitter, userRoom } from "./lib/emitter";
import { logger } from "./lib/logger";

const TOPIC = "messages.new";

async function handleMessageNew(payload: MessageNewEvent) {
  const onlineRecipients = await Promise.all(
    payload.recipientIds.map(async (id) => ((await isOnline(id)) ? id : null)),
  );

  for (const recipientId of onlineRecipients) {
    if (!recipientId) continue; // offline — notification-worker's job, not this one
    emitter.to(userRoom(recipientId)).emit("message:new", payload);
  }
}

async function main() {
  await connectDB(env.MONGODB_URI);
  logger.info("Connected to MongoDB");

  const kafka = new Kafka({ clientId: `${env.KAFKA_CLIENT_ID}-fanout`, brokers: env.KAFKA_BROKERS.split(",") });

  // Idempotent — whichever service (api or this one) starts first ends up
  // creating it; deployables don't get to assume a startup order.
  const admin = kafka.admin();
  await admin.connect();
  await admin.createTopics({ topics: [{ topic: TOPIC, numPartitions: 3 }] });
  await admin.disconnect();

  const consumer = kafka.consumer({ groupId: "fanout-worker" });

  await consumer.connect();
  await consumer.subscribe({ topic: TOPIC, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      try {
        const payload = JSON.parse(message.value.toString()) as MessageNewEvent;
        await handleMessageNew(payload);
      } catch (err) {
        logger.error({ err }, "Failed to process messages.new event");
      }
    },
  });

  logger.info(`[fanout-worker] consuming "${TOPIC}"`);
}

main().catch((err) => {
  logger.error({ err }, "[fanout-worker] failed to start");
  process.exit(1);
});
