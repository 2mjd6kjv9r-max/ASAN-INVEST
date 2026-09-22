export function parsePagination(query: RequestQuery): {
  page: number;
  limit: number;
  skip: number;
} {
  const page = Math.max(1, toInt(query.page, 1));
  const limit = Math.min(100, Math.max(1, toInt(query.limit, 20)));
  return { page, limit, skip: (page - 1) * limit };
}

export function meta(page: number, limit: number, total: number) {
  return { page, limit, total };
}

type RequestQuery = Record<string, unknown>;

function toInt(value: unknown, fallback: number): number {
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  return fallback;
}
