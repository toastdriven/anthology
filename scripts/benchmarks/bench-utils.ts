import type { Result } from 'anthology';

export function convertToElapsedSeconds(nanoStart: number, nanoEnd: number): number {
  const elapsed = nanoEnd - nanoStart;
  return elapsed / 1e9;
}

export async function benchmark(func: Function): Promise<number> {
  const startTime = Bun.nanoseconds();
  await func();
  const endTime = Bun.nanoseconds();
  return convertToElapsedSeconds(startTime, endTime);
}

export function trimScore(score: number): string {
  return parseFloat(score.toString()).toFixed(6);
}

export function showResults(query: string, results: Result[]): void {
  console.log(`Query: '${query}'. Results: ${results.length}`);
  for (let res of results) {
    console.log(`* ${res.id} (Score: ${trimScore(res.score)})`)
  }
}
