import { apiError } from "../functions/api-error";

export type ApiMethod = "get" | "post" | "put" | "patch" | "delete";

interface ApiConfig {
  baseUrl: string;
  onUnauthorized?: () => void;
}

const config: ApiConfig = { baseUrl: "" };

export function configureApi(next: Partial<ApiConfig>): void {
  Object.assign(config, next);
}

export function apiUrl(apiModule: string, lastUrl?: string): string {
  const path = [apiModule, lastUrl].filter(Boolean).join("/");
  return `${config.baseUrl.replace(/\/+$/, "")}/${path}`;
}

function messageOf(data: unknown, status: number): string {
  if (data && typeof data === "object" && "detail" in data) {
    const { detail } = data as { detail: unknown };
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((item) =>
          item && typeof item === "object" && "msg" in item ? String(item.msg) : String(item),
        )
        .join(", ");
    }
  }
  return `Request failed with status ${status}`;
}

export async function apiRequest<T>(method: ApiMethod, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: method.toUpperCase(),
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    credentials: "include",
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (res.status === 401) config.onUnauthorized?.();

  const data =
    res.status === 204
      ? undefined
      : res.headers.get("content-type")?.includes("application/json")
        ? await res.json()
        : await res.text();

  if (!res.ok) throw apiError(res.status, messageOf(data, res.status), data);
  return data as T;
}
