export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

// For binary responses (PDF export) — apiFetch always assumes JSON.
export async function apiFetchBlob(path: string): Promise<Blob> {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    throw new Error(`API request failed: ${res.status} ${res.statusText}`);
  }
  return res.blob();
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `API request failed: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}
