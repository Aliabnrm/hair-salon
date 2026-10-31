export class HttpFailure extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly requestId?: string,
  ) {
    super('درخواست انجام نشد. دوباره تلاش کنید.');
  }
}
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export async function apiRequest(
  path: string,
  options: {
    method?: 'GET' | 'POST';
    body?: object;
    signal?: AbortSignal;
  } = {},
): Promise<unknown> {
  if (!/^\/api\/v1\/(?:auth\/(?:register|login|logout)|me)$/.test(path))
    throw new Error('Unsupported identity API path.');
  const response = await fetch(path, {
    method: options.method ?? 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
    headers:
      options.method === 'POST' ? { 'Content-Type': 'application/json' } : {},
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    signal: options.signal
      ? AbortSignal.any([options.signal, AbortSignal.timeout(15_000)])
      : AbortSignal.timeout(15_000),
  });
  const payload: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const error =
      isRecord(payload) && isRecord(payload.error) ? payload.error : undefined;
    throw new HttpFailure(
      response.status,
      typeof error?.code === 'string' ? error.code : 'REQUEST_FAILED',
      typeof error?.request_id === 'string' ? error.request_id : undefined,
    );
  }
  if (!isRecord(payload) || !('data' in payload))
    throw new HttpFailure(502, 'INVALID_RESPONSE');
  return payload.data;
}
