// Small client-side fetch helper. Always sends the session cookie and throws a
// readable error for non-2xx responses.

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    credentials: "same-origin",
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message =
      (data && (data.error as string)) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}
