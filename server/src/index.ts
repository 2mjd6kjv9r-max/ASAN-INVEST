import { env } from "./config/env";
import { logger } from "./lib/logger";
import { connectDatabase, disconnectDatabase } from "./lib/prisma";
import { createApp } from "./app";

async function main() {
  await connectDatabase();
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, "ASAN Invest API listening");
  });

  const shutdown = async () => {
    server.close();
    await disconnectDatabase();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  logger.error(error, "Failed to start API");
  process.exit(1);
});
