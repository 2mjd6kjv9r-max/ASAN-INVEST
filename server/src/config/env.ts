import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGIN: z.string().default("http://localhost:5173"),
  TRUST_PROXY: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  DATABASE_URL: z
    .string()
    .min(1)
    .default("postgresql://asan:asan_dev_password@127.0.0.1:5432/asan_invest?schema=public"),
  JWT_ACCESS_SECRET: z.string().min(32).default("dev-only-access-secret-change-me-32ch"),
  JWT_REFRESH_SECRET: z.string().min(32).default("dev-only-refresh-secret-change-me-32"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
  REQUIRE_EMAIL_VERIFICATION: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  COOKIE_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  REFRESH_COOKIE_NAME: z.string().default("refresh_token"),
  UPLOAD_DIR: z.string().default("./uploads"),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(5 * 1024 * 1024),
  DVX_COMPANY_REGISTRATION_URL: z.string().url().default("https://www.e-taxes.gov.az/"),
});

export type Env = z.infer<typeof envSchema>;

function assertProductionSecrets(config: Env) {
  if (config.NODE_ENV !== "production") return;
  const weak =
    config.JWT_ACCESS_SECRET.includes("change-me") ||
    config.JWT_ACCESS_SECRET.includes("dev-only") ||
    config.JWT_REFRESH_SECRET.includes("change-me") ||
    config.JWT_REFRESH_SECRET.includes("dev-only");
  if (weak) {
    throw new Error("JWT secrets must be unique, non-default values in production");
  }
}

export const env = envSchema.parse(process.env);
assertProductionSecrets(env);
