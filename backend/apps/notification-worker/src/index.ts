// Part F.5: consume `messages.new`, check recipient presence in Redis, and
// push to the device tokens of anyone who is offline. The mirror image of
// fanout-worker, which handles the *online* half of the same event — the two
// split the recipient list by presence and never both deliver to one user.

import { Kafka } from "kafkajs";
import { connectDB, UserModel } from "@darkline/db";
import { env } from "@darkline/config";
import type { MessageNewEvent } from "@darkline/shared-types";
import { isOnline } from "./lib/presence";
import { sendMessagePush, type PushTarget } from "./lib/push";
import { logger } from "./lib/logger";

const TOPIC = "messages.new";

async function handleMessageNew(payload: MessageNewEvent) {
  const offlineIds = (
    await Promise.all(payload.recipientIds.map(async (id) => ((await isOnline(id)) ? null : id)))
  ).filter((id): id is string => id !== null);

  if (offlineIds.length === 0) return;

  const users = await UserModel.find({ _id: { $in: offlineIds } }, { deviceTokens: 1 });

  const targets: PushTarget[] = users.flatMap((u) =>
    u.deviceTokens.map((d) => ({ token: d.token, platform: d.platform as PushTarget["platform"] })),
  );
  if (targets.length === 0) {
    logger.debug({ offline: offlineIds.length }, "Offline recipients have no registered device tokens");
    return;
  }

  const { sent, failed, staleTokens } = await sendMessagePush(targets, {
    conversationId: payload.conversationId,
    messageId: payload.messageId,
    senderId: payload.senderId,
  });

  if (staleTokens.length > 0) {
    await UserModel.updateMany(
      { _id: { $in: offlineIds } },
      { $pull: { deviceTokens: { token: { $in: staleTokens } } } },
    );
    logger.info({ pruned: staleTokens.length }, "Pruned unregistered device tokens");
  }

  logger.info({ messageId: payload.messageId, sent, failed }, "Push notifications dispatched");
}

async function main() {
  await connectDB(env.MONGODB_URI);
  logger.info("Connected to MongoDB");

  const kafka = new Kafka({
    clientId: `${env.KAFKA_CLIENT_ID}-notification`,
    brokers: env.KAFKA_BROKERS.split(","),
  });

  // Idempotent — whichever service (api, fanout-worker or this one) starts
  // first ends up creating it; deployables don't get to assume a startup order.
  const admin = kafka.admin();
  await admin.connect();
  await admin.createTopics({ topics: [{ topic: TOPIC, numPartitions: 3 }] });
  await admin.disconnect();

  // Its own consumer group, so it receives every event independently of
  // fanout-worker rather than competing with it for partitions.
  const consumer = kafka.consumer({ groupId: "notification-worker" });

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

  logger.info(`[notification-worker] consuming "${TOPIC}"`);
}

main().catch((err) => {
  logger.error({ err }, "[notification-worker] failed to start");
  process.exit(1);
});
