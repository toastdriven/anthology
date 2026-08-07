export function createHash(toHash: string, hashLength: number = 16): string {
  const hashed = Bun.hash.rapidhash(toHash);
  const hexed = hashed.toString(16).padStart(16, "0");
  return hexed.substring(0, hashLength);
}
