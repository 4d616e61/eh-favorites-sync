import config from "./config.json" with { type: "json" };
import { parse_page } from "./scrape/parse.ts";
import { get_all_favs } from "./scrape/scrape.ts";
import { get_filemap } from "./sync/filestore.ts"

// Learn more at https://docs.deno.com/runtime/manual/examples/module_metadata#concepts
if (import.meta.main) {
  
  const filemap = get_filemap("./files");
  console.log(await get_all_favs(config.cookies));
}
