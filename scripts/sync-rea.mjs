/**
 * Syncs REA charts — Rotas Especiais de Aeronaves em Voo Visual, the special
 * VFR corridors DECEA publishes per TMA rather than per aerodrome.
 *
 *   node scripts/sync-rea.mjs
 *
 * These never appear in the AISWEB `area=cartas&icaoCode=` API — confirmed by
 * querying it directly for several aerodrome and TMA codes, all of which came
 * back with zero results. The only place they exist is the plain HTML table
 * at aisweb.decea.mil.br/?i=cartas&p=visuais, listing every REA/REH/REUL sheet
 * in the country with a stable download link and its own AIRAC amendment.
 * This script fetches that page, keeps only the rows this project's TMAs
 * cover, and copies each PDF into every aerodrome that shares the TMA — Belo
 * Horizonte and São Paulo's two sheets are the reason a TMA can map to more
 * than one file or more than one aerodrome.
 */
import fs from "node:fs";
import path from "node:path";

const INDEX_URL = "https://aisweb.decea.mil.br/?i=cartas&p=visuais";

/** TMA slug (as it appears in the filename) -> aerodromes this project tracks. */
const TMA_AIRPORTS = {
  wr: ["SBBR"],
  wh: ["SBBH", "SBCF"],
  wf: ["SBRF"],
  wj1: ["SBRJ"],
  xf: ["SBFL"],
  xp1: ["SBSP"],
  xp2: ["SBSP"],
  xs: ["SBSV"],
  xt: ["SBNT", "SBSG"],
};

async function download(url) {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

const slug = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const html = await (
  await fetch(INDEX_URL, { headers: { "User-Agent": "Mozilla/5.0" } })
).text();

const rows = [...html.matchAll(/<tr><td data-order="REA">REA<\/td>[\s\S]*?<\/tr>/g)];
console.log(`${rows.length} linhas REA na página`);

const entries = rows
  .map((m) => {
    const row = m[0];
    const name = row.match(/data-order="(CCV[^"]*)"/i)?.[1] ?? null;
    const amdt = row.match(/data-search="(\d{4}A\d)"/)?.[1] ?? null;
    // The row carries the same publication date twice (once beside the AIRAC
    // cell, once on its own); the last occurrence is the one to keep.
    const dates = [...row.matchAll(/data-order="(\d{4})\/(\d{2})\/(\d{2})"/g)];
    const date = dates.length
      ? dates[dates.length - 1].slice(1, 4).join("-")
      : "";
    const href = row.match(/href="([^"]+\.pdf)"/)?.[1] ?? null;
    if (!name || !href) return null;

    // "CCV REA WJ1-RIO DE JANEIRO" / "CCV Rea WS São Luis" -> "wj1"
    const tma = name
      .toUpperCase()
      .match(/REA\s+([A-Z]+\d*)-/)?.[1]
      ?.toLowerCase();

    return { name, amdt, date, href, tma };
  })
  .filter((e) => e && TMA_AIRPORTS[e.tma]);

console.log(`${entries.length} linhas relevantes para os aeródromos do projeto:`);
for (const e of entries) console.log(`  ${e.tma.padEnd(4)} ${e.name}  (${e.amdt})`);

for (const entry of entries) {
  const buffer = await download(entry.href);
  const file = `rea-${entry.tma}-${slug(entry.name)}.pdf`;

  for (const icao of TMA_AIRPORTS[entry.tma]) {
    const chartsDir = path.join("public", "charts", icao);
    const contentPath = path.join("content", icao, "charts.json");
    fs.mkdirSync(chartsDir, { recursive: true });
    fs.writeFileSync(path.join(chartsDir, file), buffer);

    const data = JSON.parse(fs.readFileSync(contentPath, "utf-8"));
    const key = `rea-${entry.tma}`;
    const withoutOldRea = data.charts.filter(
      (c) => !(c.type === "REA" && c.key === key)
    );
    withoutOldRea.push({
      key,
      type: "REA",
      name: entry.name.replace(/^CCV\s+REA\s+/i, ""),
      code: entry.tma.toUpperCase(),
      amdt: entry.amdt ?? "",
      date: entry.date,
      file: `/charts/${icao}/${file}`,
    });
    data.charts = withoutOldRea.sort(
      (a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name)
    );
    fs.writeFileSync(contentPath, JSON.stringify(data, null, 2) + "\n");
    console.log(`  ${icao}: ${entry.name}`);
  }
}
