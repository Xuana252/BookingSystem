import { getToken, notifyUnauthorized } from "./auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5133/api";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function extractErrorMessage(body: string): string {
  if (!body) {
    return "";
  }

  try {
    const parsed = JSON.parse(body) as {
      detail?: string;
      title?: string;
      errors?: Record<string, string[] | string>;
    };
    if (parsed.errors && typeof parsed.errors === "object") {
      const messages = Object.values(parsed.errors).flat();
      if (messages.length > 0) {
        return messages.join(" ");
      }
    }
    return parsed.detail ?? parsed.title ?? body;
  } catch {
    return body;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (!response.ok) {
    const body = await response.text();

    // Only a *carried* token being rejected means the session itself is invalid (expired,
    // revoked, etc.) — a 401 on an anonymous request (e.g. a wrong-password login attempt, which
    // has no token to send) is just a normal failed request, not a reason to log anyone out.
    if (response.status === 401 && token) {
      notifyUnauthorized();
    }

    throw new ApiError(response.status, extractErrorMessage(body) || response.statusText);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
};
