export function isValidPassword(password: string): boolean {
  const length = [...password].length;
  return (
    length >= 12 &&
    length <= 128 &&
    new TextEncoder().encode(password).byteLength <= 512
  );
}
