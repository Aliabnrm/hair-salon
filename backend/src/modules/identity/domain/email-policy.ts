export function normalizeEmail(input: string): string | undefined {
  const email = input.trim().toLowerCase();
  if (email.length > 254 || !/^[\x21-\x7e]+$/.test(email)) return undefined;
  const parts = email.split('@');
  if (parts.length !== 2) return undefined;
  const [local, domain] = parts;
  if (
    !local ||
    !domain ||
    local.length > 64 ||
    local.startsWith('.') ||
    local.endsWith('.') ||
    local.includes('..') ||
    !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local)
  )
    return undefined;
  const labels = domain.split('.');
  if (
    labels.length < 2 ||
    labels.some(
      (label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label),
    )
  )
    return undefined;
  return email;
}
