export type FileMap = Map<number, string>;


function match_filename(filename : string) : number | undefined {
    const match = filename.match(/^\[e-hentai\]\[([0-9]+)\]/);
    return match ? +match[1] : undefined;
}

function get_filemap_internal(filelist : string[]) : FileMap {
    const results : FileMap = new Map();
    for(const file of filelist) {
        const match = match_filename(file);
        if(match)
            results.set(match, file);
    }
    return results;
}


function list_files(directory : string) {
    const results = [];
    for (const entry of Deno.readDirSync(directory)) {
        results.push(entry.name);
    }
    return results;
}

export function get_filemap(directory: string) {
    return get_filemap_internal(list_files(directory));
}