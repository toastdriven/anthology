export function stripTags(content: string): string {
  // TODO: This is a pretty naive implementation.
  //     Either we'll eventually need a better implementation or depend on a
  //     third-party library.
  return content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
