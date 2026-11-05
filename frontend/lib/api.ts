import { DemoAPIClient } from "./demo-api";
import { accessToken, signOut } from "./auth/browser";
export function isDemoRoute() {
  return (
    typeof window !== "undefined" &&
    (window.location.pathname === "/demo" ||
      window.location.pathname.startsWith("/demo/"))
  );
}
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";
function timedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  return fetch(url, { ...options, signal: AbortSignal.timeout(10000) });
}
export interface ShortenRequest {
  long_url: string;
  custom_alias?: string;
  expires_at?: string;
}

export interface ShortenResponse {
  short_code: string;
  long_url: string;
  created_at?: string;
}

export interface Analytics {
  short_code: string;
  total_clicks: number;
  timestamps: string[];
}

export interface HealthResponse {
  status: string;
  db?: string;
  redis: string;
  dbsize?: number;
  total_urls?: number;
}

export interface URLEntry {
  short_code: string;
  long_url: string;
  created_at: string;
  click_count: number;
}

export interface FlaggedURL {
  short_code: string;
  long_url: string;
  verdict: "suspicious" | "malicious";
  score: number;
  reasons: string[];
  source: string;
  model: string | null;
  created_at: string;
}

export interface Identity {
  user_id: string | null;
  workspace_id: string;
  role: string;
  email_verified: boolean;
  platform_admin: boolean;
}
export interface Workspace {
  id: string;
  name: string;
  slug: string;
}
export interface ProgrammaticKey {
  id: number;
  name: string;
  prefix: string;
  scopes: string[];
  revoked_at: string | null;
}
export class APIClient {
  private apiKey = "";
  private bearerToken = "";
  private tokenExpiresAt = 0;
  private loginPromise: Promise<void> | null = null;
  private workspace = "";
  constructor(private baseUrl: string = API_BASE_URL) {}
  setWorkspace(id: string) {
    this.workspace = id;
  }
  setBearerToken(token: string) {
    this.apiKey = "";
    this.bearerToken = token;
    this.tokenExpiresAt = token ? Infinity : 0;
  }
  setApiKey(key: string) {
    this.apiKey = key;
    this.bearerToken = "";
    this.tokenExpiresAt = 0;
  }
  private async authHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = this.workspace
      ? { "X-Workspace-ID": this.workspace }
      : {};
    if (this.apiKey) return { ...headers, "X-API-Key": this.apiKey };
    if (process.env.NEXT_PUBLIC_LOCAL_AUTH === "true") {
      if (Date.now() >= this.tokenExpiresAt) {
        this.loginPromise ??= timedFetch(`${this.baseUrl}/auth/dev-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user: "owner" }),
        })
          .then(async (response) => {
            if (!response.ok) throw new Error("Local demo login failed");
            const body = await response.json();
            this.bearerToken = body.access_token;
            this.tokenExpiresAt = Date.now() + (body.expires_in - 30) * 1000;
          })
          .finally(() => {
            this.loginPromise = null;
          });
        await this.loginPromise;
      }
    } else if (!this.bearerToken) {
      const token = await accessToken();
      return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
    }
    return this.bearerToken
      ? { ...headers, Authorization: `Bearer ${this.bearerToken}` }
      : headers;
  }
  async request<T>(
    path: string,
    options: RequestInit = {},
    authenticated = true,
  ): Promise<T> {
    const response = await timedFetch(this.baseUrl + path, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(authenticated ? await this.authHeaders() : {}),
        ...options.headers,
      },
    });
    if (!response.ok) {
      if (response.status === 401) {
        this.bearerToken = "";
        this.tokenExpiresAt = 0;
        this.apiKey = "";
        this.workspace = "";
        if (process.env.NEXT_PUBLIC_LOCAL_AUTH !== "true")
          await signOut().catch(() => {});
        if (typeof window !== "undefined")
          window.location.assign(
            new URL("/login?error=session", window.location.origin).href,
          );
        throw new Error("Your session expired. Please sign in again.");
      }
      const body = await response.json().catch(() => null);
      if (response.status === 402)
        throw new Error("Your plan limit has been reached.");
      if (response.status === 403)
        throw new Error(
          body?.detail?.code === "email_unverified"
            ? "Confirm your email before making changes."
            : "You do not have permission to perform this action.",
        );
      if (response.status === 404)
        throw new Error("This resource was not found in your workspace.");
      if (response.status === 429) {
        const retry = response.headers.get("Retry-After");
        throw new Error(
          `Too many requests. ${retry ? `Retry after ${retry}.` : "Please wait and retry."}`,
        );
      }
      if (response.status >= 500)
        throw new Error(
          "The service is temporarily unavailable. Please retry.",
        );
      throw new Error(
        typeof body?.detail === "string"
          ? body.detail
          : "The request could not be completed.",
      );
    }
    return response.status === 204 ? (undefined as T) : response.json();
  }
  shorten(
    longUrl: string,
    customAlias?: string,
    expiresAt?: string,
  ): Promise<ShortenResponse> {
    return this.request("/shorten", {
      method: "POST",
      body: JSON.stringify({
        long_url: longUrl,
        custom_alias: customAlias,
        expires_at: expiresAt,
      }),
    });
  }
  getAnalytics(code: string): Promise<Analytics> {
    return this.request("/analytics/" + encodeURIComponent(code));
  }
  deleteUrl(code: string): Promise<void> {
    return this.request("/urls/" + encodeURIComponent(code), {
      method: "DELETE",
    });
  }
  listFlagged(offset = 0): Promise<FlaggedURL[]> {
    return this.request(`/admin/flagged?limit=50&offset=${offset}`);
  }
  reviewFlagged(code: string, decision: "allow" | "block"): Promise<void> {
    return this.request(
      "/admin/flagged/" + encodeURIComponent(code) + "/review",
      { method: "POST", body: JSON.stringify({ decision }) },
    );
  }
  getHealth(): Promise<HealthResponse> {
    return this.request("/health", {}, false);
  }
  listUrls(): Promise<URLEntry[]> {
    return this.request("/urls");
  }
  me(): Promise<Identity> {
    return this.request("/me");
  }
  workspaces(): Promise<Workspace[]> {
    return this.request("/workspaces");
  }
  members(id: string): Promise<unknown> {
    return this.request(`/workspaces/${encodeURIComponent(id)}/members`);
  }
  keys(): Promise<ProgrammaticKey[]> {
    return this.request("/api-keys");
  }
  createKey(
    name: string,
    scopes: string[],
  ): Promise<ProgrammaticKey & { key: string }> {
    return this.request("/api-keys", {
      method: "POST",
      body: JSON.stringify({ name, scopes }),
    });
  }
  revokeKey(id: number): Promise<void> {
    return this.request(`/api-keys/${id}`, { method: "DELETE" });
  }
  deleteAccount(): Promise<void> {
    return this.request("/me", {
      method: "DELETE",
      body: JSON.stringify({ confirmation: "DELETE" }),
    });
  }
}
export type URLClient = Pick<
  APIClient,
  | "setApiKey"
  | "shorten"
  | "getAnalytics"
  | "deleteUrl"
  | "listFlagged"
  | "reviewFlagged"
  | "getHealth"
  | "listUrls"
>;
export const realClient = new APIClient();
const demoClient = new DemoAPIClient();
// Selection occurs per call, never globally from a build-time demo flag.
export const apiClient = new Proxy(realClient, {
  get(target, key) {
    const selected = isDemoRoute() ? demoClient : target;
    const value = Reflect.get(selected, key);
    return typeof value === "function" ? value.bind(selected) : value;
  },
});
