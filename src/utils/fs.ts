import { mkdir } from 'node:fs/promises';

export async function ensurePath(path: string): Promise<string> {
  // FIXME: This could use more error-handling.
  await mkdir(path, { recursive: true });
  return path;
}
