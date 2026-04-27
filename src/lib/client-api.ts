type ApiResult<T = unknown> = ({ success: true } & T) | { success: false; error: string };

const SESSION_STORAGE_KEY = "homedirplus_admin_session";

type RequestOptions = Omit<RequestInit, "body"> & { body?: unknown };

export function getStoredSessionToken(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(SESSION_STORAGE_KEY) || "";
}

export function setStoredSessionToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_STORAGE_KEY, token);
}

export function clearStoredSessionToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

export function authHeaders(headers?: HeadersInit): HeadersInit {
  const token = getStoredSessionToken();
  return token ? { ...(headers || {}), "x-admin-session": token } : (headers || {});
}

export async function apiPost<T = unknown>(url: string, options: RequestOptions = {}): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json", ...(options.headers || {}) }),
      ...options,
      body: JSON.stringify(options.body ?? {}),
    });
    const data = (await res.json().catch(() => ({}))) as ApiResult<T>;
    if (!res.ok || !data.success) {
      return { success: false, error: data.success === false && data.error ? data.error : "请求失败" };
    }
    return data;
  } catch {
    return { success: false, error: "网络请求失败" };
  }
}

export async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
