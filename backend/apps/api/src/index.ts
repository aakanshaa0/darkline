import { connectDB } from "@darkline/db";
import { env } from "@darkline/config";
import { createApp } from "./app";
import { ensureTopics } from "./lib/kafka";
import { logger } from "./lib/logger";

async function main() {
  await connectDB(env.MONGODB_URI);
  logger.info("Connected to MongoDB");

  await ensureTopics();
  logger.info("Kafka topics ready");

  const app = createApp();
  app.listen(env.API_PORT, () => {
    logger.info(`[api] listening on :${env.API_PORT}`);
  });
}

main().catch((err) => {
  logger.error({ err }, "[api] failed to start");
  process.exit(1);
});
