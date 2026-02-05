import { assert } from "node:console";
import { parse_download_page, ParsedEntry } from "./parse.ts";
import { get_file_name, get_temp_file_name } from "../sync/filestore.ts";

interface DownloadedFile {
  title: string;
  data: Uint8Array;
}

async function get_download_link_from_entry(
  entry: ParsedEntry,
  cookies: string,
) {
  const response = await fetch(
    `https://e-hentai.org/archiver.php?gid=${entry.gid}&token=${entry.token}`,
    {
      mode: "cors",
      method: "POST",
      body: "dltype=org&dlcheck=Download+Original+Archive",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        cookie: cookies,
      },
    },
  );

  const page = await response.text();
  return parse_download_page(page);
}

// ai coded this
function filenameFromContentDisposition(cd: string | null): string | null {
  if (!cd) return null;

  // Prefer filename*= (RFC 5987)

  const star = cd.match(/filename\*\s*=\s*([^;]+)/i);
  if (star) {
    const v = star[1].trim().replace(/^"(.*)"$/, "$1");
    const parts = v.split("''");
    if (parts.length === 2) {
      try {
        return decodeURIComponent(parts[1]);
      } catch { /* ignore */ }
      return parts[1];
    }
    return v;
  }

  // Fallback: filename=
  const plain = cd.match(/filename\s*=\s*([^;]+)/i);
  if (plain) {
        const filename_text = plain[1].trim().replace(/^"(.*)"$/, "$1");
        const filename_bytes = Uint8Array.from(filename_text, c => c.charCodeAt(0));
        const fixed = new TextDecoder("utf-8").decode(filename_bytes);
        return fixed;
    }


  return null;
}

function pickDownloadFilename(res: Response): string {
  const cdName = filenameFromContentDisposition(
    res.headers.get("content-disposition"),
  );
  assert(cdName);
  if (!cdName) {
    return "";
  }
  return cdName;
}

async function internal_download_file(
  entry: ParsedEntry,
  cookies: string,
): Promise<DownloadedFile> {
  const download_link = await get_download_link_from_entry(entry, cookies);
  //no need for cookies at this point
  console.log("Downloading entry:");
  console.log(entry);
  const download_result = await fetch(download_link + "?start=1", {
    headers: {
      "Accept-Encoding": "gzip, deflate, br, zstd",
    },
  });
  return {
    title: pickDownloadFilename(download_result),
    data: await download_result.bytes(),
  };
}

export async function download_and_save_entry(
  entry: ParsedEntry,
  directory: string,
  cookies: string,
) {
  const dl_data = await internal_download_file(entry, cookies);
  const tmp_file_name = directory + "/" +
    get_temp_file_name(dl_data.title, entry.gid);
  const file_name = directory + "/" + get_file_name(dl_data.title, entry.gid);
  await Deno.writeFile(tmp_file_name, dl_data.data);
  Deno.renameSync(tmp_file_name, file_name);
}
