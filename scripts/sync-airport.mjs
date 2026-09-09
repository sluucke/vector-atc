/**
 * Syncs one aerodrome from the AISWEB (DECEA) public API.
 *
 *   node scripts/sync-airport.mjs SBSV
 *
 * Downloads every published chart into public/charts/<ICAO>/ and parses the
 * coding tables into content/<ICAO>/{charts,geometry}.json. Coding tables are
 * the authoritative source for waypoint coordinates and leg sequences — the
 * graphic charts only draw them.
 */
import fs from "node:fs";
import path from "node:path";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const API = "https://aisweb.decea.mil.br/api/";
const API_KEY = "1587263166";
const API_PASS = "3199249e-755b-1033-a49b-72567f175e3a";

// Parking (PDC) and obstacle (AOC) charts aren't used for procedure work and
// would double the repo size for every aerodrome.
const SKIP_TYPES = new Set(["AOC"]);

const icao = (process.argv[2] ?? "").toUpperCase();
if (!/^[A-Z]{4}$/.test(icao)) {
  console.error("Usage: node scripts/sync-airport.mjs <ICAO>");
  process.exit(1);
}

const chartsDir = path.join("public", "charts", icao);
const contentDir = path.join("content", icao);

const slug = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const tag = (xml, name) => {
  const m = xml.match(
    new RegExp(`<${name}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${name}>`)
  );
  return m ? m[1].trim() : "";
};

/** "S 13:08:30.75" / "W 38:12:28.40" -> signed decimal degrees */
function toDecimal(hemisphere, dms) {
  const [d, m, s] = dms.split(":").map(Number);
  const value = d + m / 60 + s / 3600;
  return hemisphere === "S" || hemisphere === "W" ? -value : value;
}

/**
 * Turns one line's text fragments into table cells.
 *
 * The generator splits words wherever it likes — a title can arrive as "S",
 * "ID", "RNAV", "EVKOX", "4", "A" — so fragments are rejoined by how far apart
 * they sit: touching means one word, a space's width means one phrase, and a
 * column's width means a new cell. Columns that overlap in x, which happens
 * where the true and magnetic courses are printed out of order, always start a
 * new cell.
 */
function toCells(items) {
  const GLUE = 0.5;
  const COLUMN = 6;
  const cells = [];
  let end = null;

  for (const item of items) {
    const gap = end === null ? Infinity : item.x - end;
    if (gap > COLUMN || gap < -GLUE) cells.push(item.s);
    else if (gap < GLUE) cells[cells.length - 1] += item.s;
    else cells[cells.length - 1] += ` ${item.s}`;
    end = item.x + item.width;
  }

  return cells;
}

async function pdfRows(buffer) {
  const doc = await getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  }).promise;
  const pages = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const content = await (await doc.getPage(p)).getTextContent();
    const byY = new Map();
    for (const item of content.items) {
      if (!item.str.trim()) continue;
      const y = Math.round(item.transform[5]);
      const key = [...byY.keys()].find((k) => Math.abs(k - y) <= 4) ?? y;
      if (!byY.has(key)) byY.set(key, []);
      byY.get(key).push({
        x: item.transform[4],
        width: item.width ?? 0,
        s: item.str.trim(),
      });
    }
    pages.push(
      [...byY.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([, items]) => toCells(items.sort((a, b) => a.x - b.x)))
    );
  }
  return pages.flat();
}

/**
 * A coding table holds one or more procedures. Each starts with a header row
 * ("SID RNAV UMPEL 1A RWY 10"), followed by leg rows keyed by transition.
 */
function parseCodingTable(rows) {
  const procedures = [];
  const fixes = {};
  const runwayPoints = {};
  const runwayCourses = {};
  let current = null;

  for (const row of rows) {
    const [first = "", ...rest] = row;
    const joined = row.join(" ");

    // The title is one line on the page but reaches us split across anywhere
    // from one cell to five, sometimes trailed by the aerodrome name and the
    // sheet's own index, and "RWY 32" is as common as "RWY32". So match the
    // whole row with the spacing normalised, and stop at the runway.
    const header = joined
      .replace(/\s+/g, " ")
      .trim()
      .match(
        /^(SID|STAR|IAC)\s+(.+?)\s+RWY\s*([0-9]{2}[LRC]?(?:\s*\/\s*[0-9]{2}[LRC]?)?)(?![0-9A-Z])/
      );
    if (header) {
      current = {
        type: header[1],
        title: `${header[1]} ${header[2]} RWY ${header[3]}`,
        name: header[2].replace(/^RNAV\s+/, "").trim(),
        runway: header[3].replace(/\s*\/\s*/g, "/"),
        transitions: {},
      };
      procedures.push(current);
      continue;
    }

    // Coordinate rows: "GEDEX", "S 13:08:30.75W 38:12:28.40"
    const coord = joined.match(
      /^([A-Z0-9]{2,6})\s+([NS])\s*(\d{1,3}:\d{2}:\d{2}(?:\.\d+)?)\s*([EW])\s*(\d{1,3}:\d{2}:\d{2}(?:\.\d+)?)/
    );
    if (coord) {
      const ident = coord[1];
      const point = {
        lat: toDecimal(coord[2], coord[3]),
        lon: toDecimal(coord[4], coord[5]),
      };
      // IAC tables publish thresholds as "RWY10"; SID tables publish the
      // departure end of the same runway as a bare "10".
      const threshold = ident.match(/^RWY(\d{2}[LRC]?)$/);
      const der = ident.match(/^(\d{2}[LRC]?)$/);
      if (threshold) (runwayPoints[threshold[1]] ??= {}).thr = point;
      else if (der) (runwayPoints[der[1]] ??= {}).der = point;
      else fixes[ident] = point;
      continue;
    }

    // Leg rows: seq | transition | flyOver | navaid | fix | pathTerminator | ...
    if (!current || !/^\d+$/.test(first) || rest.length < 5) continue;
    const [transition, , , fixIdent, pathTerminator] = rest;
    if (!/^[A-Z0-9]{2,6}$/.test(transition) && transition !== "RWY") continue;

    const altitude = rest.find((v) => /^[+\-@]\d{3,5}$/.test(v)) ?? null;
    const distance = rest.find((v) => /^\d{1,3}\.\d{2}$/.test(v)) ?? null;
    // Courses come as two cells, "161.79° True" and "183.22° Mag", in either
    // order. True is the one comparable with geographic bearings.
    const trueCourse =
      rest.find((v) => /^\d{1,3}(\.\d+)?\s*°?\s*True$/i.test(v))?.match(/[\d.]+/)?.[0] ??
      null;

    // A departure's first leg flies the runway centreline, so its course is the
    // runway's own. That is the only bearing available at an aerodrome whose
    // coding tables publish a single point for the strip.
    if (
      trueCourse &&
      transition === "RWY" &&
      Number(first) === 10 &&
      /^(CA|CF|VA|FA)$/.test(pathTerminator) &&
      current.type === "SID" &&
      /^\d{2}[LRC]?$/.test(current.runway)
    ) {
      runwayCourses[current.runway] ??= Number(trueCourse);
    }

    (current.transitions[transition] ??= []).push({
      seq: Number(first),
      fix: fixIdent === "N/A" ? null : fixIdent,
      pathTerminator,
      altitude,
      distance: distance ? Number(distance) : null,
      course: trueCourse ? Number(trueCourse) : null,
    });
  }

  for (const proc of procedures) {
    for (const legs of Object.values(proc.transitions)) {
      legs.sort((a, b) => a.seq - b.seq);
    }
  }

  return { procedures, fixes, runwayPoints, runwayCourses };
}

async function download(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

const xml = await (
  await fetch(
    `${API}?apiKey=${API_KEY}&apiPass=${API_PASS}&area=cartas&icaoCode=${icao}`,
    { headers: { "User-Agent": "Mozilla/5.0" } }
  )
).text();

const items = xml.split("<item ").slice(1);
if (items.length === 0) {
  console.error(`No charts returned for ${icao}.`);
  process.exit(1);
}

fs.mkdirSync(chartsDir, { recursive: true });
fs.mkdirSync(contentDir, { recursive: true });

const charts = [];
const allFixes = {};
const allRunwayPoints = {};
const allRunwayCourses = {};
const geometry = {};

for (const item of items) {
  const type = tag(item, "tipo");
  if (SKIP_TYPES.has(type)) continue;

  const name = tag(item, "nome");
  const code = tag(item, "icp");
  const key = code || slug(name);
  const file = `${slug(type)}-${slug(key)}-${slug(name)}.pdf`;

  const pdfPath = path.join(chartsDir, file);
  if (!fs.existsSync(pdfPath) || process.env.REFRESH_CHARTS) {
    const pdfUrl = tag(item, "link").replace(/&amp;/g, "&");
    fs.writeFileSync(pdfPath, await download(pdfUrl));
  }

  charts.push({
    key,
    type,
    name,
    code,
    amdt: tag(item, "amdt"),
    date: tag(item, "dt"),
    file: `/charts/${icao}/${file}`,
  });

  const tabUrl = tag(item, "tabcode").replace(/&amp;/g, "&");
  if (!tabUrl) {
    console.log(`  ${type.padEnd(4)} ${name}  (sem coding table)`);
    continue;
  }

  const parsed = parseCodingTable(await pdfRows(await download(tabUrl)));
  Object.assign(allFixes, parsed.fixes);
  Object.assign(allRunwayPoints, parsed.runwayPoints);
  Object.assign(allRunwayCourses, parsed.runwayCourses);

  for (const proc of parsed.procedures) {
    const geoKey = `${proc.type}|${proc.name.replace(/\s+/g, "")}|${proc.runway}`;
    geometry[geoKey] = {
      title: proc.title,
      chartKey: key,
      transitions: proc.transitions,
    };
  }

  console.log(
    `  ${type.padEnd(4)} ${name}  → ${parsed.procedures.length} proc, ` +
      `${Object.keys(parsed.fixes).length} fixos`
  );
}

fs.writeFileSync(
  path.join(contentDir, "charts.json"),
  JSON.stringify(
    {
      icao,
      syncedAt: new Date().toISOString().slice(0, 10),
      source: `${API}?area=cartas&icaoCode=${icao}`,
      charts: charts.sort(
        (a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name)
      ),
    },
    null,
    2
  ) + "\n"
);

fs.writeFileSync(
  path.join(contentDir, "geometry.json"),
  JSON.stringify(
    {
      icao,
      syncedAt: new Date().toISOString().slice(0, 10),
      fixes: Object.fromEntries(
        Object.entries(allFixes).sort(([a], [b]) => a.localeCompare(b))
      ),
      runwayPoints: allRunwayPoints,
      runwayCourses: allRunwayCourses,
      procedures: geometry,
    },
    null,
    2
  ) + "\n"
);

console.log(
  `\n${icao}: ${charts.length} cartas, ${Object.keys(allFixes).length} fixos, ` +
    `${Object.keys(geometry).length} procedimentos com geometria.`
);
