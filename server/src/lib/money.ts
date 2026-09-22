import { Prisma } from "@prisma/client";
import { AppError } from "./errors";

export type DecimalLike = Prisma.Decimal | string | number;

export function toMoneyString(value: DecimalLike): string {
  return new Prisma.Decimal(value).toFixed(2);
}

export function parseMoney(value: string, field = "amount"): Prisma.Decimal {
  const trimmed = value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    throw AppError.badRequest("INVALID_AMOUNT", `${field} must be a decimal string with up to 2 fractional digits`);
  }
  const decimal = new Prisma.Decimal(trimmed);
  if (decimal.lte(0)) {
    throw AppError.badRequest("INVALID_AMOUNT", `${field} must be greater than 0`);
  }
  return decimal;
}
