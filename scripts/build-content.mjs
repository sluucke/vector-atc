/**
 * Derives content/<ICAO>/procedures.json (and a meta.json skeleton) from what
 * sync-airport.mjs already downloaded.
 *
 *   node scripts/build-content.mjs SBBR
 *
 * Structure comes from the DECEA coding tables; editorial fields (prose notes,
 * the operational transition altitude, observations) are preserved across runs
 * so re-syncing never overwrites hand-written text. Reads from disk only — no
 * network, safe to re-run.
 */
import fs from "node:fs";
import path from "node:path";

const API = "https://aisweb.decea.mil.br/api/";
const API_KEY = "1587263166";
const API_PASS = "3199249e-755b-1033-a49b-72567f175e3a";

const icao = (process.argv[2] ?? "").toUpperCase();
if (!/^[A-Z]{4}$/.test(icao)) {
  console.error("Usage: node scripts/build-content.mjs <ICAO>");
  process.exit(1);
}

const contentDir = path.join("content", icao);
const read = (file) =>
  JSON.parse(fs.readFileSync(path.join(contentDir, file), "utf-8"));

/** ROTAER repeats tag names across blocks, some of them empty, so take the
 *  first occurrence that actually carries a value. */
const tag = (xml, name) => {
  const all = [...xml.matchAll(new RegExp("<" + name + ">([^]*?)</" + name + ">", "g"))];
  return (
    all
      .map((m) => m[1].replace("<![CDATA[", "").replace("]]>", "").trim())
      .find(Boolean) ?? ""
  );
};

/** "SID RNAV UMPEL 1A RWY 10" -> { name: "UMPEL 1A", rnav: true } */
function readTitle(title) {
  const body = title
    .replace(/^(SID|STAR|IAC)\s+/, "")
    .replace(/\s+RWY\s+[0-9]{2}[LRC]?(?:\/[0-9]{2}[LRC]?)*$/, "")
    .trim();
  return {
    name: body.replace(/^RNAV\s+/, "").trim(),
    rnav: /^RNAV\b/.test(body),
  };
}

const legFixes = (legs) => legs.map((l) => l.fix).filter(Boolean);

function describeLeg(legs) {
  const last = legs[legs.length - 1];
  const parts = [];
  if (last?.distance) parts.push(`${last.distance} NM`);
  if (last?.altitude) {
    parts.push(`${last.altitude.replace("+", "≥").replace("-", "≤")} ft`);
  }
  const via = legFixes(legs).slice(1, -1);
  if (via.length > 0) parts.push(`via ${via.join(" → ")}`);
  return parts.join(" · ") || "conforme coding table";
}

function buildProcedures(geometry, existing) {
  const previous = new Map(existing.map((p) => [p.id, p]));

  return Object.entries(geometry.procedures)
    .filter(([key]) => key.startsWith("SID|") || key.startsWith("STAR|"))
    .map(([key, geo]) => {
      const [type, , runway] = key.split("|");
      const { name, rnav } = readTitle(geo.title);
      const id = `${type.toLowerCase()}-${name.replace(/\s+/g, "").toLowerCase()}`;

      const named = Object.entries(geo.transitions).filter(
        ([label]) => label !== "RWY"
      );
      const common = geo.transitions.RWY ?? [];
      const prior = previous.get(id) ?? {};

      const base = {
        id,
        type,
        runway,
        name,
        category: rnav ? "RNAV" : "CONV",
        chartKey: geo.chartKey,
        geometryKey: key,
        notes: prior.notes ?? "",
        fixes: [
          ...new Set(
            Object.values(geo.transitions).flatMap((legs) => legFixes(legs))
          ),
        ],
      };

      if (type === "SID") {
        return {
          ...base,
          commonRoute:
            prior.commonRoute ?? (legFixes(common).join(" → ") || null),
          transitions:
            prior.transitions ??
            named.map(([fix, legs]) => ({ fix, desc: describeLeg(legs) })),
        };
      }

      return {
        ...base,
        entryFixes: prior.entryFixes ?? named.map(([fix]) => fix),
        route: prior.route ?? null,
        // An arrival ends where its longest coded chain ends.
        iaf:
          prior.iaf ??
          Object.values(geo.transitions)
            .map((legs) => legFixes(legs))
            .sort((a, b) => b.length - a.length)[0]
            ?.slice(-1)[0] ??
          null,
      };
    })
    .sort(
      (a, b) =>
        a.type.localeCompare(b.type) ||
        a.runway.localeCompare(b.runway) ||
        a.name.localeCompare(b.name)
    );
}

async function fetchRotaer() {
  const url = new URL(API);
  url.searchParams.set("apiKey", API_KEY);
  url.searchParams.set("apiPass", API_PASS);
  url.searchParams.set("area", "rotaer");
  url.searchParams.set("icaoCode", icao);
  const xml = await (
    await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } })
  ).text();

  const freqsOf = (pattern) => {
    const block = xml
      .split("<service")
      .find((s) => new RegExp(`<type>(${pattern})</type>`, "i").test(s));
    return block
      ? [...block.matchAll(/<freq[^>]*>(.*?)<\/freq>/g)]
          .map((m) => m[1].trim())
          .filter((f) => f && f !== "121.500")
      : [];
  };

  return {
    name: tag(xml, "name"),
    elevation: tag(xml, "altFt"),
    fir: tag(xml, "fir"),
    runways: [...xml.matchAll(/<rwy>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/rwy>/g)]
      .map((m) => m[1].trim())
      .filter(Boolean),
    dAtis: freqsOf("ATIS|D-ATIS"),
    twr: freqsOf("Torre"),
    app: freqsOf("Controle|Aproxima..o|APP"),
  };
}

const geometry = read("geometry.json");
const charts = read("charts.json").charts;

const proceduresPath = path.join(contentDir, "procedures.json");
const existing = fs.existsSync(proceduresPath)
  ? JSON.parse(fs.readFileSync(proceduresPath, "utf-8"))
  : [];

const procedures = buildProcedures(geometry, existing);
fs.writeFileSync(proceduresPath, JSON.stringify(procedures, null, 2) + "\n");

const counts = procedures.reduce((acc, p) => {
  acc[p.type] = (acc[p.type] ?? 0) + 1;
  return acc;
}, {});
console.log(
  `${icao}: procedures.json com ${procedures.length} procedimentos ` +
    `(${Object.entries(counts).map(([t, n]) => `${n} ${t}`).join(", ")}).`
);

const metaPath = path.join(contentDir, "meta.json");
if (fs.existsSync(metaPath)) {
  console.log(`${icao}: meta.json já existe — preservado.`);
} else {
  const rotaer = await fetchRotaer();
  // Charts are re-issued per cycle; the newest one carries the current AIRAC.
  const newest = [...charts].sort((a, b) => b.date.localeCompare(a.date))[0];
  const meta = {
    icao,
    name: rotaer.name || "REVISAR: nome do aeródromo",
    elevation: rotaer.elevation ? `${rotaer.elevation}'` : "REVISAR",
    ta: "REVISAR: ler da carta",
    msa: "REVISAR: ler da carta",
    fir: rotaer.fir || "REVISAR",
    operational: {
      transitionAltitude: 0,
      transitionAltitudeSource: "REVISAR: MOPS IVAO da TMA",
      ivaoWikiUrl: "",
    },
    airac: {
      cycle: newest?.amdt ?? "",
      effective: newest?.date ?? "",
      checkedAt: new Date().toISOString().slice(0, 10),
      source: `${API}?area=cartas&icaoCode=${icao}`,
    },
    frequencies: {
      dAtis: rotaer.dAtis,
      twr: rotaer.twr,
      app: rotaer.app,
      acc: [],
    },
    runways: rotaer.runways,
    runwaysNote: "",
    observations: [],
  };
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n");
  console.log(`${icao}: meta.json criado — revisar os campos "REVISAR".`);
}
