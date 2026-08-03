import { makeServer } from "./server";

export async function run(args: string[]): Promise<number> {
  const command = args[0] ?? "serve";

  if (command === "serve") {
    const server = makeServer({});
    console.log(`Server running at ${server.url}...`);
    return 0;
  }

  console.error(`Unknown command: ${command}`);
  return 1;
}
