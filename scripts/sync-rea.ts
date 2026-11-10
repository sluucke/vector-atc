/**
 * Syncs REA charts — Rotas Especiais de Aeronaves em Voo Visual, the special
 * VFR corridors DECEA publishes per TMA rather than per aerodrome.
 *
 *   npm run sync:rea
 *
 * These never appear in the AISWEB `area=cartas&icaoCode=` API — querying it
 * for aerodrome and TMA codes always comes back empty. The only place they
 * exist is the plain HTML table at aisweb.decea.mil.br/?i=cartas&p=visuais,
 * one row per TMA in the country with a stable download link and its own
 * AIRAC amendment. This script fetches that page, keeps only the rows this
 * project's TMAs cover, and copies each PDF into every aerodrome sharing the
 * TMA. A TMA can map to several aerodromes (Belo Horizonte, Natal) and an
 * aerodrome to several sheets (São Paulo's XP1 and XP2).
 */
import fs from "node:fs";
import path from "node:path";
import { download, fetchText, slug } from "./lib/aisweb";
import type { Chart, ChartCatalog } from "../src/lib/types";

const INDEX_URL = "https://aisweb.decea.mil.br/?i=cartas&p=visuais";

/**
 * TMA code, as printed after "CCV REA" in the sheet name, to the aerodromes
 * this project tracks. Add a line here when an aerodrome joins.
 */
const TMA_AIRPORTS: Record<string, string[]> = {
  wr: ["SBBR"],
  wh: ["SBBH", "SBCF"],
  wf: ["SBRF"],
  wj1: ["SBRJ"],
  xf: ["SBFL"],
  xn: ["SBGO"],
  xp1: ["SBSP"],
  xp2: ["SBSP"],
  xs: ["SBSV"],
  xt: ["SBNT", "SBSG"],
};

interface ReaSheet {
  name: string;
  amdt: string;
  date: string;
  href: string;
  tma: string;
}

function parseIndex(html: string): ReaSheet[] {
  const rows = [
    ...html.matchAll(/<tr><td data-order="REA">REA<\/td>[\s\S]*?<\/tr>/g),
  ].map((m) => m[0]);
  console.log(`${rows.length} linhas REA na página`);

  return rows.flatMap((row) => {
    const name = row.match(/data-order="(CCV[^"]*)"/i)?.[1];
    const href = row.match(/href="([^"]+\.pdf)"/)?.[1];
    if (!name || !href) return [];

    // The row carries the publication date twice (beside the AIRAC cell and
    // on its own); the last occurrence is the one to keep.
    const dates = [...row.matchAll(/data-order="(\d{4})\/(\d{2})\/(\d{2})"/g)];
    const last = dates[dates.length - 1];

    // "CCV REA WJ1-RIO DE JANEIRO" / "CCV Rea WS São Luis" -> "wj1"
    const tma =
      name
        .toUpperCase()
        .match(/REA\s+([A-Z]+\d*)-/)?.[1]
        ?.toLowerCase() ?? "";

    return [
      {
        name,
        amdt: row.match(/data-search="(\d{4}A\d)"/)?.[1] ?? "",
        date: last ? `${last[1]}-${last[2]}-${last[3]}` : "",
        href,
        tma,
      },
    ];
  });
}

const sheets = parseIndex(await fetchText(INDEX_URL)).filter(
  (s) => TMA_AIRPORTS[s.tma]
);

console.log(`${sheets.length} linhas relevantes para os aeródromos do projeto:`);
for (const s of sheets) console.log(`  ${s.tma.padEnd(4)} ${s.name}  (${s.amdt})`);

for (const sheet of sheets) {
  const buffer = await download(sheet.href);
  const file = `rea-${sheet.tma}-${slug(sheet.name)}.pdf`;

  for (const icao of TMA_AIRPORTS[sheet.tma]) {
    const chartsDir = path.join("public", "charts", icao);
    const catalogPath = path.join("content", icao, "charts.json");
    if (!fs.existsSync(catalogPath)) {
      console.warn(`  ${icao}: sem charts.json — rode sync:airport antes`);
      continue;
    }
    fs.mkdirSync(chartsDir, { recursive: true });
    fs.writeFileSync(path.join(chartsDir, file), buffer);

    const catalog = JSON.parse(
      fs.readFileSync(catalogPath, "utf-8")
    ) as ChartCatalog;
    const key = `rea-${sheet.tma}`;
    const chart: Chart = {
      key,
      type: "REA",
      name: sheet.name.replace(/^CCV\s+REA\s+/i, ""),
      code: sheet.tma.toUpperCase(),
      amdt: sheet.amdt,
      date: sheet.date,
      file: `/charts/${icao}/${file}`,
    };
    catalog.charts = [
      ...catalog.charts.filter((c) => !(c.type === "REA" && c.key === key)),
      chart,
    ].sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));

    fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + "\n");
    console.log(`  ${icao}: ${sheet.name}`);
  }
}
