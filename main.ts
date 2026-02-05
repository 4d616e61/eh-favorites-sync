import config from "./config.json" with { type: "json" };
import {
  parse_download_page,
  parse_page,
  ParsedEntry,
} from "./scrape/parse.ts";
import { get_all_favs } from "./scrape/scrape.ts";
import { get_filemap } from "./sync/filestore.ts";
import { download_and_save_entry } from "./scrape/download.ts";
import { parseArgs } from "jsr:@std/cli/parse-args";

const args = parseArgs(Deno.args, {
  string: ["save-path"],
  alias: { "save-path": ["savePath"] }, // optional convenience
});

const savePath = args["save-path"] ?? args.savePath;

if (!savePath) {
  console.error("Usage: deno run main.ts --save-path <path>");
  Deno.exit(1);
}

const CONCURRENCY = 3; // A) at most 3 running
const START_GAP_MS = 1000; // B) start next no later than 1s after previous start (when a slot is free)

// Learn more at https://docs.deno.com/runtime/manual/examples/module_metadata#concepts

async function run_async(
  values: ParsedEntry[],
  files_path: string,
  cookies: string,
) {
  let next = 0;
  let running = 0;
  let nextStart = Date.now();

  return new Promise<void>((resolve, reject) => {
    const pump = () => {
      while (running < CONCURRENCY && next < values.length) {
        const v = values[next++];
        const now = Date.now();
        const startAt = Math.max(now, nextStart);

        nextStart = startAt + START_GAP_MS;
        running++;

        setTimeout(() => {
          download_and_save_entry(v, files_path, cookies)
            .catch(reject)
            .finally(() => {
              running--;
              if (next >= values.length && running === 0) resolve();
              else pump();
            });
        }, Math.max(0, startAt - now));
      }
    };

    pump();
  });
}

if (import.meta.main) {
  //todo: parse args
  const cookies = config.cookies;
  const files_path = savePath;

  const filemap = get_filemap(files_path);

  const favorites_all = await get_all_favs(cookies);
  const tasks: ParsedEntry[] = [];
  for (const entry of favorites_all) {
    if (filemap.has(entry.gid)) {
      console.log(`Skipping entry ${entry.gid}`);
      continue;
    }
    tasks.push(entry);
  }
  //todo: execute tasks async
  // for(const task of tasks) {
  //   await download_and_save_entry(task, files_path, cookies);
  // }
  if(tasks.length > 0)
    await run_async(tasks, files_path, cookies);
  console.log("All done.");
}
