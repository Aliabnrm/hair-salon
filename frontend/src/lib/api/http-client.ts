export class HttpFailure extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly requestId?: string,
    message = 'درخواست انجام نشد. دوباره تلاش کنید.',
    readonly fields: Record<string, string> = {},
    readonly retryAfter = 0,
  ) {
    super(message);
  }
}
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: object;
  signal?: AbortSignal;
  version?: number;
  idempotencyKey?: string;
}
function allowedPath(path: string): boolean {
  if (!path.startsWith('/api/v1/') || path.includes('\\') || path.includes('#')) return false;
  const url = new URL(path, 'http://internal.invalid'),
    id = '[a-fA-F0-9-]{36}';
  const pattern = new RegExp(
    `^/api/v1/(?:catalog/(?:categories|locations|salons(?:/${id}(?:/availability)?)?)|review/(?:access|businesses(?:/${id}(?:/decisions)?)?)|auth/(?:register|login|logout)|me(?:/businesses)?|businesses(?:/${id}/(?:settings|publication(?:/(?:requests|withdrawals))?|preview|catalog/services(?:/${id})?|services(?:/${id})?|staff(?:/${id}(?:/hours)?)?|hours|schedule-exceptions(?:/${id})?))?)$`,
  );
  return url.origin === 'http://internal.invalid' && pattern.test(url.pathname);
}
export async function apiRequest(path: string, options: RequestOptions = {}): Promise<unknown> {
  if (!allowedPath(path)) throw new Error('Unsupported API path.');
  const headers: Record<string, string> = {};
  if (options.body !== undefined || options.method === 'POST')
    headers['Content-Type'] = 'application/json';
  if (options.version !== undefined) headers['If-Match'] = `"${options.version}"`;
  if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;
  const response = await fetch(path, {
    method: options.method ?? 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
    headers,
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    signal: options.signal
      ? AbortSignal.any([options.signal, AbortSignal.timeout(15_000)])
      : AbortSignal.timeout(15_000),
  });
  const payload: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const error = isRecord(payload) && isRecord(payload.error) ? payload.error : undefined;
    const fields = isRecord(error?.fields)
      ? Object.fromEntries(
          Object.entries(error.fields).filter(
            (entry): entry is [string, string] => typeof entry[1] === 'string',
          ),
        )
      : {};
    throw new HttpFailure(
      response.status,
      typeof error?.code === 'string' ? error.code : 'REQUEST_FAILED',
      typeof error?.request_id === 'string' ? error.request_id : undefined,
      typeof error?.message === 'string' ? error.message : undefined,
      fields,
      Number(response.headers.get('Retry-After')) || 0,
    );
  }
  if (!isRecord(payload) || !('data' in payload)) throw new HttpFailure(502, 'INVALID_RESPONSE');
  return payload.data;
}
