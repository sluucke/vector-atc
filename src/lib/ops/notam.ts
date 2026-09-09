import "server-only";
import { aiswebFetch, createCache } from "./aisweb";

export interface Notam {
  id: string;
  number: string;
  /** Q-code, e.g. QMRTT (runway closed). */
  code: string | null;
  category: string | null;
  status: string | null;
  text: string;
  /** Raw AISWEB validity groups, YYMMDDHHMM. */
  validFrom: string | null;
  validTo: string | null;
  lower: string | null;
  upper: string | null;
}

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

/** "2609030000" -> "03SEP26 00:00Z" */
export function formatNotamTime(value: string | null): string | null {
  if (!value || !/^\d{10}$/.test(value)) return null;
  const months = [
    "JAN", "FEV", "MAR", "ABR", "MAI", "JUN",
    "JUL", "AGO", "SET", "OUT", "NOV", "DEZ",
  ];
  const year = value.slice(0, 2);
  const month = Number(value.slice(2, 4));
  const day = value.slice(4, 6);
  const hour = value.slice(6, 8);
  const minute = value.slice(8, 10);
  if (month < 1 || month > 12) return null;
  return `${day}${months[month - 1]}${year} ${hour}:${minute}Z`;
}
