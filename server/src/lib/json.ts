import type { Prisma } from "@prisma/client";

export type JsonMap = Record<string, unknown>;

export function asJsonMap(value: Prisma.JsonValue | null | undefined): JsonMap {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonMap;
  }
  return {};
}

export function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export function namesFor(
  names: Prisma.JsonValue | null | undefined,
  locale = "az",
): string {
  const map = asJsonMap(names);
  const picked = map[locale] ?? map.en ?? map.az;
  return typeof picked === "string" ? picked : "";
}
