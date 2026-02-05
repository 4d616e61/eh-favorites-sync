import { parse_page, ParsedEntry } from "./parse.ts";



export async function make_page_request(
  cookies: string,
  next: string = "",
) {
  let cookie = cookies.replaceAll(/sl=[^;]+;?/g, "");
  cookie += cookie.endsWith(";") ? "" : ";";
  cookie += "sl=dm_2";
  const response = await fetch(
    `https://e-hentai.org/favorites.php?next=${next}`,
    {
      headers: {
        cookie: cookie,
      },
    },
  );
  if (response.status != 200) {
    return Promise.reject(`Request failed with code ${response.status}`);
  }
  return response;
}


// TODO: make this run async with downloading
export async function get_all_favs(cookies: string) {
    let next = "";
    const results : ParsedEntry[] = [];
    while(true) {
        const resp = await make_page_request(cookies, next);
        const page = parse_page(await resp.text());
        next = page.next;
        for(const res of page.entries) {
            results.push(res);   
        }
        if(next === "") {
            break;
        }
    }
    return results;    
}
