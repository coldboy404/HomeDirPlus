type ApiResult<T = unknown> = ({ success: true } & T) | { success: false; error: string };

type RequestOptions = Omit<RequestInit, "body"> & { body?: unknown };

export async function apiPost<T = unknown>(url: string, options: RequestOptions = {}): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
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
