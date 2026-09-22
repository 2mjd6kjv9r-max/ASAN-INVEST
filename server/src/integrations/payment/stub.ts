import crypto from "crypto";
import { PaymentStatus } from "@prisma/client";

export function createStubPaymentRef(): string {
  return `stub_${crypto.randomBytes(12).toString("hex")}`;
}

export function simulateProviderEvent(
  status: Extract<PaymentStatus, "succeeded" | "failed">,
): Record<string, unknown> {
  return {
    provider: "stub",
    event: status === "succeeded" ? "payment.succeeded" : "payment.failed",
    at: new Date().toISOString(),
  };
}
