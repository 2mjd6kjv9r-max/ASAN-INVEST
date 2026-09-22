import { logger } from "../../lib/logger";

export const emailService = {
  async send(to: string, subject: string, body: string): Promise<void> {
    logger.info({ to, subject }, "Email adapter: message logged, not sent");
    logger.debug({ bodyLength: body.length }, "Email body omitted from info logs");
  },
};

export const smsService = {
  async send(to: string, body: string): Promise<void> {
    logger.info({ to, bodyLength: body.length }, "SMS adapter: message logged, not sent");
  },
};
