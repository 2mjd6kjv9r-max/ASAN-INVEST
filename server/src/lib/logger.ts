import pino from "pino";
import { env } from "../config/env";

const redactPaths = [
  "req.headers.authorization",
  "req.headers.cookie",
  "password",
  "passwordHash",
  "token",
  "accessToken",
  "refreshToken",
  "rawPayload",
];

export const logger = pino({
  level: env.NODE_ENV === "test" ? "silent" : env.NODE_ENV === "production" ? "info" : "debug",
  redact: {
    paths: redactPaths,
    censor: "[REDACTED]",
  },
  transport:
    env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:standard" },
        }
      : undefined,
});
