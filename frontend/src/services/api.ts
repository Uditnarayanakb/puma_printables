import type { Order } from "../types/order";
import type { Product } from "../types/product";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

const AUTH_HEADER = "Authorization";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

type RequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
};

const defaultHeaders = {
  "Content-Type": "application/json",
};

async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, token, signal } = options;
  const headers: Record<string, string> = { ...defaultHeaders };

  if (token) {
    headers[AUTH_HEADER] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    signal,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data.message === "string") {
      return data.message;
    }
  } catch (err) {
    // ignore JSON parse errors
  }
  return `Request failed with status ${response.status}`;
}

export type LoginRequest = {
  username: string;
  password: string;
};

export type LoginResponse = {
  token: string;
};

export const api = {
  login(input: LoginRequest, signal?: AbortSignal) {
    return request<LoginResponse>("/api/v1/auth/login", {
      method: "POST",
      body: input,
      signal,
    });
  },

  getOrders(token: string, status?: string, signal?: AbortSignal) {
    const searchParams = new URLSearchParams();
    if (status) {
      searchParams.set("status", status);
    }
    const suffix = searchParams.toString() ? `?${searchParams}` : "";
    return request<Order[]>(`/api/v1/orders${suffix}`, {
      token,
      signal,
    });
  },

  getProducts(token: string, signal?: AbortSignal) {
    return request<Product[]>("/api/v1/products", {
      token,
      signal,
    });
  },
};
