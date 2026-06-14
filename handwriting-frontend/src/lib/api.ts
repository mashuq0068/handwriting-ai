/**
 * API client for the Quillify Express backend.
 *
 * - Access token: kept in memory + localStorage, sent as `Authorization: Bearer`.
 * - Refresh token: kept in localStorage and POSTed to /auth/refresh (also set as
 *   an httpOnly cookie by the server). On a 401 we transparently refresh once and
 *   retry the original request.
 */

const API_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:4000";

const ACCESS_KEY = "quillify.accessToken";
const REFRESH_KEY = "quillify.refreshToken";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
}

export interface DocumentRecord {
  id: string;
  title: string;
  content: string;
  language: string;
  fontName: string;
  settings: Record<string, unknown>;
  pageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedDocuments {
  documents: DocumentRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListDocumentsParams {
  page?: number;
  limit?: number;
  q?: string;
}

export interface FontRecord {
  id: string;
  name: string;
  family: string;
  language: string;
  format: string;
  glyphCount: number;
  source: "template" | "photo";
  metrics: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface LabeledGlyph {
  char: string;
  x: number;
  y: number;
  w: number;
  h: number;
  form?: "isol" | "init" | "medi" | "fina";
}

// ---------------------------------------------------------------- token store
export const tokenStore = {
  get access() {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  set(access: string | null, refresh: string | null) {
    if (access) localStorage.setItem(ACCESS_KEY, access);
    else localStorage.removeItem(ACCESS_KEY);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
    else localStorage.removeItem(REFRESH_KEY);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Single in-flight refresh shared by concurrent 401s.
let refreshPromise: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ refreshToken: tokenStore.refresh }),
        });
        if (!res.ok) {
          tokenStore.clear();
          return false;
        }
        const data = await res.json();
        tokenStore.set(data.accessToken, data.refreshToken);
        return true;
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean; // attach access token (default true)
  retry?: boolean; // internal: whether we may retry after refresh
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true, retry = true } = opts;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth && tokenStore.access) headers.Authorization = `Bearer ${tokenStore.access}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  // Transparently refresh once on auth failure, then retry.
  if (res.status === 401 && auth && retry) {
    const refreshed = await doRefresh();
    if (refreshed) {
      return request<T>(path, { ...opts, retry: false });
    }
  }

  if (!res.ok) {
    let message = res.statusText;
    try {
      const data = await res.json();
      message = data.error || message;
    } catch {
      /* ignore non-JSON error bodies */
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// Authenticated binary GET (with one transparent refresh-retry). Used for font files.
async function requestBinary(path: string, retry = true): Promise<ArrayBuffer> {
  const headers: Record<string, string> = {};
  if (tokenStore.access) headers.Authorization = `Bearer ${tokenStore.access}`;
  const res = await fetch(`${API_URL}${path}`, { headers, credentials: "include" });
  if (res.status === 401 && retry) {
    const refreshed = await doRefresh();
    if (refreshed) return requestBinary(path, false);
  }
  if (!res.ok) throw new ApiError(res.status, res.statusText);
  return res.arrayBuffer();
}

// -------------------------------------------------------------------- auth api
export const authApi = {
  async register(name: string, email: string, password: string) {
    const data = await request<{ user: AuthUser; accessToken: string; refreshToken: string }>(
      "/auth/register",
      { method: "POST", auth: false, body: { name, email, password } }
    );
    tokenStore.set(data.accessToken, data.refreshToken);
    return data.user;
  },

  async login(email: string, password: string) {
    const data = await request<{ user: AuthUser; accessToken: string; refreshToken: string }>(
      "/auth/login",
      { method: "POST", auth: false, body: { email, password } }
    );
    tokenStore.set(data.accessToken, data.refreshToken);
    return data.user;
  },

  async me() {
    const data = await request<{ user: AuthUser }>("/auth/me");
    return data.user;
  },

  async logout() {
    try {
      await request("/auth/logout", {
        method: "POST",
        auth: false,
        body: { refreshToken: tokenStore.refresh },
      });
    } finally {
      tokenStore.clear();
    }
  },
};

// --------------------------------------------------------------- documents api
export const documentsApi = {
  // Backend-paginated list. Returns documents plus paging metadata.
  async list(params: ListDocumentsParams = {}) {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.q) qs.set("q", params.q);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request<PaginatedDocuments>(`/documents${suffix}`);
  },

  async get(id: string) {
    const data = await request<{ document: DocumentRecord }>(`/documents/${id}`);
    return data.document;
  },

  async create(input: Partial<DocumentRecord>) {
    const data = await request<{ document: DocumentRecord }>("/documents", {
      method: "POST",
      body: input,
    });
    return data.document;
  },

  async update(id: string, input: Partial<DocumentRecord>) {
    const data = await request<{ document: DocumentRecord }>(`/documents/${id}`, {
      method: "PUT",
      body: input,
    });
    return data.document;
  },

  async remove(id: string) {
    await request(`/documents/${id}`, { method: "DELETE" });
  },
};

// ------------------------------------------------------------------- fonts api
export const fontsApi = {
  async list() {
    const data = await request<{ fonts: FontRecord[] }>("/fonts");
    return data.fonts;
  },

  // Persist a generated font. `dataBase64` is the raw .ttf bytes, base64-encoded.
  async create(input: {
    name: string;
    family: string;
    language?: string;
    glyphCount?: number;
    source?: "template" | "manual" | "draw" | "photo";
    metrics?: Record<string, unknown>;
    dataBase64: string;
  }) {
    const data = await request<{ font: FontRecord }>("/fonts", { method: "POST", body: input });
    return data.font;
  },

  async remove(id: string) {
    await request(`/fonts/${id}`, { method: "DELETE" });
  },

  // Fetch the .ttf bytes (authenticated) for FontFace registration.
  async fetchFontBuffer(id: string) {
    return requestBinary(`/fonts/${id}/file`);
  },

  // Whether the server has the AI extractor configured (API key present).
  async aiStatus() {
    const data = await request<{ enabled: boolean }>("/fonts/ai-status");
    return data.enabled;
  },

  // Single-photo (AI) mode: one-time vision call returning labeled glyph boxes.
  async label(input: { image: string; language?: string; details?: string }) {
    const data = await request<{ glyphs: LabeledGlyph[] }>("/fonts/label", {
      method: "POST",
      body: input,
    });
    return data.glyphs;
  },
};

export { ApiError };
