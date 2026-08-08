function convertToElapsedSeconds(nanoStart: number, nanoEnd: number): number {
  const elapsed = nanoEnd - nanoStart;
  return elapsed / 1e9;
}

export async function benchmark(func: Function): Promise<number> {
  const startTime = Bun.nanoseconds();
  await func();
  const endTime = Bun.nanoseconds();
  return convertToElapsedSeconds(startTime, endTime);
}
