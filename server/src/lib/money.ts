import { Prisma } from "@prisma/client";
import { AppError } from "./errors";

const AMOUNT_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;

export function parseAmount(value: unknown, field = "amount"): Prisma.Decimal {
  if (typeof value !== "string" || !AMOUNT_PATTERN.test(value)) {
    throw new AppError(
      400,
      "INVALID_AMOUNT",
      `${field} must be a decimal string with up to 2 fraction digits`,
    );
  }
  const amount = new Prisma.Decimal(value);
  if (amount.lte(0)) {
    throw new AppError(400, "INVALID_AMOUNT", `${field} must be greater than 0`);
  }
  return amount;
}

export function money(value: Prisma.Decimal | string | number): string {
  return new Prisma.Decimal(value).toFixed(2);
}

export function remainingCapacity(
  target: Prisma.Decimal,
  funded: Prisma.Decimal,
): Prisma.Decimal {
  const remaining = target.minus(funded);
  return remaining.lt(0) ? new Prisma.Decimal(0) : remaining;
}
