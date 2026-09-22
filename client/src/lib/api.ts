export type ApiError = {
  status: number;
  code: string;
  message: string;
  details?: unknown;
};

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  skipRefresh?: boolean;
};

let accessToken: string | null = null;
let refreshInFlight: Promise<boolean> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, skipRefresh, headers, ...rest } = options;
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const response = await fetch(`/api/v1${path}`, {
    ...rest,
    credentials: "include",
    headers: {
      ...(isForm ? {} : body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
  });

  if (response.status === 401 && !skipRefresh && !path.startsWith("/auth/login") && !path.startsWith("/auth/register")) {
    const refreshed = await refreshSession();
    if (refreshed) return api<T>(path, { ...options, skipRefresh: true });
  }

  if (response.status === 204) return undefined as T;

  const json = await response.json().catch(() => null);
  if (!response.ok) {
    const error: ApiError = {
      status: response.status,
      code: json?.error?.code ?? "HTTP_ERROR",
      message: json?.error?.message ?? "Request failed",
      details: json?.error?.details,
    };
    throw error;
  }
  return json as T;
}

export async function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const json = await api<{ data: { accessToken: string } }>("/auth/refresh", {
          method: "POST",
          skipRefresh: true,
        });
        setAccessToken(json.data.accessToken);
        return true;
      } catch {
        setAccessToken(null);
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

export type Paginated<T> = { data: T[]; meta: { page: number; limit: number; total: number } };
export type Envelope<T> = { data: T };
