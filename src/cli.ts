import { makeServer } from "./server";

export async function run(args: string[]): Promise<number> {
  const command = args[0] ?? "serve";

  // FIXME: This flat-out doesn't work.
  //     The server is constructed, but immediately killed.
  //     There doesn't seem to be anyway (in the public interface anyway) to
  //     start the server, or to wait for a graceful exit (e.g. `.join`) before
  //     returning a status code.
  // if (command === "serve") {
  //   const serverOptions = await makeServer({});
  //   const server = Bun.serve(serverOptions);
  //   console.log(`Server running at ${server.url}...`);
  //   return 0;
  // }

  console.error(`Unknown command: ${command}`);
  return 1;
}
