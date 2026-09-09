import "server-only";
import { aiswebFetch, createCache } from "./aisweb";
export { formatNotamTime } from "./notam-format";
import type { Notam } from "./notam-format";
export type { Notam };


export interface NotamReport {
  icao: string;
  notams: Notam[];
  updatedAt: string | null;
  fetchedAt: string;
}

/** NOTAMs change far more slowly than traffic. */
const cache = createCache<NotamReport>(15 * 60 * 1000);

const field = (item: string, tag: string): string | null => {
  const m = item.match(
    new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`)
  );
  const value = m ? m[1].trim() : "";
  return value.length > 0 ? value : null;
};

export async function getNotams(icao: string): Promise<NotamReport> {
  const code = icao.toUpperCase();

  return cache(code, async () => {
    const xml = await aiswebFetch("notam", code);
    const updatedAt = xml.match(/updatedat="([^"]+)"/)?.[1] ?? null;

    const notams = xml
      .split("<item")
      .slice(1)
      .map((item) => ({
        id: field(item, "id") ?? "",
        number: field(item, "n") ?? "",
        code: field(item, "cod"),
        category: field(item, "cat"),
        status: field(item, "status"),
        text: field(item, "e") ?? "",
        validFrom: field(item, "b"),
        validTo: field(item, "c"),
        lower: field(item, "lower"),
        upper: field(item, "upper"),
      }))
      .filter((n) => n.text.length > 0);

    return {
      icao: code,
      notams,
      updatedAt,
      fetchedAt: new Date().toISOString(),
    };
  });
}
