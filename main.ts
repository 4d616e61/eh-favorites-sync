import config from "./config.json" with { type: "json" };
import { parse_download_page, parse_page, ParsedEntry } from "./scrape/parse.ts";
import { get_all_favs } from "./scrape/scrape.ts";
import { get_filemap } from "./sync/filestore.ts"
import { download_and_save_entry } from "./scrape/download.ts";
import { exit } from "node:process";

// Learn more at https://docs.deno.com/runtime/manual/examples/module_metadata#concepts
if (import.meta.main) {
  
  //todo: parse args
  const cookies = config.cookies;
  const files_path = "./files";
  const filemap = get_filemap(files_path);

  const favorites_all = await get_all_favs(cookies);
  const tasks : ParsedEntry[] = [];
  for(const entry of favorites_all) {
    if(filemap.has(entry.gid))
      continue;
    tasks.push(entry);
  }
  //todo: execute tasks async
  for(const task of tasks) {
    await download_and_save_entry(task, files_path, cookies);
  }
  
  
}
