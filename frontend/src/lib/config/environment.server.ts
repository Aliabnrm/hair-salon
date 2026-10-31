export function validateBackendOrigin(value: unknown): string {
  const invalid = () =>
    new Error('BACKEND_ORIGIN must be an exact private HTTP or HTTPS origin.');
  if (typeof value !== 'string') throw invalid();
  try {
    const url = new URL(value);
    if (
      url.origin !== value ||
      !['http:', 'https:'].includes(url.protocol) ||
      (url.protocol === 'http:' &&
        !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))
    )
      throw invalid();
    return value;
  } catch {
    throw invalid();
  }
}
