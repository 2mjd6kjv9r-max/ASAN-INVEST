import { prisma } from "../db/prisma";
import { logger } from "./logger";

export { prisma };

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  logger.info("Connected to PostgreSQL");
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
