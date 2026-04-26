/** Shared timeouts for browser → API calls (avoid infinite loading UX). */
export const CHECKOUT_FETCH_TIMEOUT_MS = 55_000;

export async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number = CHECKOUT_FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}
