import { connectDB } from "@darkline/db";
import { env } from "@darkline/config";
import { createServer } from "./server";
import { logger } from "./lib/logger";

async function main() {
  await connectDB(env.MONGODB_URI);
  logger.info("Connected to MongoDB");

  const server = createServer();
  server.listen(env.WS_SIGNALING_PORT, () => {
    logger.info(`[ws-signaling] listening on :${env.WS_SIGNALING_PORT}`);
  });
}

main().catch((err) => {
  logger.error({ err }, "[ws-signaling] failed to start");
  process.exit(1);
});
