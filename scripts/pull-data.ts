/**
 * Downloads the chart data from sluucke/vector-atc-data and unpacks it into
 * content/ and public/charts/, where the app reads it.
 *
 *   npm run data:pull                       # latest release
 *   npm run data:pull -- --if-missing       # only when nothing is unpacked yet
 *   npm run data:pull -- --from ../vector-atc-data/dist   # a local package
 *
 * Runs before every build. The release manifest names the release, so a
 * build whose data is already current skips the ~280 MB download.
 *
 * Environment:
 *   VECTOR_ATC_DATA_REPO     owner/name, default sluucke/vector-atc-data
 *   VECTOR_ATC_DATA_RELEASE  a release tag to pin, default the latest
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream } from "node:stream/web";

const REPO = process.env.VECTOR_ATC_DATA_REPO || "sluucke/vector-atc-data";
const RELEASE = process.env.VECTOR_ATC_DATA_RELEASE || "latest";

const CONTENT = "content";
const CHARTS = path.join("public", "charts");
const CACHE = ".data-cache";
/** Written last, so its presence means a complete unpack. */
const MARKER = path.join(CONTENT, ".release.json");

interface Manifest {
  release: string;
  generatedAt: string;
  airports: string[];
  charts: number;
}

const args = process.argv.slice(2);
const from = args.includes("--from") ? args[args.indexOf("--from") + 1] : null;

function local(): Manifest | null {
  try {
    return JSON.parse(fs.readFileSync(MARKER, "utf8")) as Manifest;
  } catch {
    return null;
  }
}

const installed = local();

if (args.includes("--if-missing") && installed) {
  console.log(`Dados ${installed.release} já presentes.`);
  process.exit(0);
}

const base =
  RELEASE === "latest"
    ? `https://github.com/${REPO}/releases/latest/download`
    : `https://github.com/${REPO}/releases/download/${RELEASE}`;

async function fetchTo(name: string, target: string) {
  if (from) {
    fs.copyFileSync(path.join(from, name), target);
    return;
  }
  const res = await fetch(`${base}/${name}`);
  if (!res.ok || !res.body) throw new Error(`${res.status} ${res.statusText} — ${base}/${name}`);
  // Streamed to disk: the charts archive is too large to hold in memory.
  await pipeline(Readable.fromWeb(res.body as ReadableStream), fs.createWriteStream(target));
}

async function readManifest(): Promise<Manifest> {
  if (from) return JSON.parse(fs.readFileSync(path.join(from, "manifest.json"), "utf8")) as Manifest;
  const res = await fetch(`${base}/manifest.json`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${base}/manifest.json`);
  return (await res.json()) as Manifest;
}

/**
 * Unpacks a tar archive into a fresh directory. Read in Node rather than with
 * a tar binary, which build images do not always ship. Handles the ustar
 * prefix, pax and GNU long names; only files and directories are written.
 */
function unpack(archive: string, dir: string, gzip: boolean) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const root = path.resolve(dir);
  const raw = fs.readFileSync(archive);
  const data = gzip ? zlib.gunzipSync(raw) : raw;

  const text = (start: number, length: number) =>
    data.toString("utf8", start, start + length).replace(/\0.*$/s, "");
  let longName: string | null = null;
  let offset = 0;

  while (offset + 512 <= data.length) {
    const header = offset;
    if (data[header] === 0) break; // two zero blocks end the archive
    const size = parseInt(text(header + 124, 12).trim() || "0", 8);
    const type = String.fromCharCode(data[header + 156] || 48);
    const prefix = text(header + 345, 155);
    let name = text(header, 100);
    if (prefix) name = `${prefix}/${name}`;
    const body = header + 512;
    offset = body + Math.ceil(size / 512) * 512;

    if (type === "x" || type === "L") {
      const value = data.toString("utf8", body, body + size);
      longName = type === "L" ? value.replace(/\0.*$/s, "") : (value.match(/\d+ path=([^\n]*)\n/)?.[1] ?? null);
      continue;
    }
    if (longName) name = longName;
    longName = null;
    if (type === "g") continue;

    const target = path.resolve(root, name);
    if (target !== root && !target.startsWith(root + path.sep)) {
      throw new Error(`Entrada fora do destino no arquivo: ${name}`);
    }
    if (type === "5") fs.mkdirSync(target, { recursive: true });
    else if (type === "0" || type === "7") {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, data.subarray(body, body + size));
    }
  }
}

let manifest: Manifest;
try {
  manifest = await readManifest();
} catch (error) {
  if (installed) {
    console.warn(`Sem acesso aos dados (${(error as Error).message}); seguindo com ${installed.release}.`);
    process.exit(0);
  }
  console.error(`Não foi possível baixar os dados de ${REPO}: ${(error as Error).message}`);
  process.exit(1);
}

if (installed?.release === manifest.release && fs.existsSync(CHARTS)) {
  console.log(`Dados ${manifest.release} já atualizados.`);
  process.exit(0);
}

console.log(
  `Baixando ${manifest.release} de ${from ?? REPO}: ${manifest.airports.length} aeródromos, ${manifest.charts} cartas…`
);
fs.mkdirSync(CACHE, { recursive: true });
const contentArchive = path.join(CACHE, "content.tar.gz");
const chartsArchive = path.join(CACHE, "charts.tar");
await fetchTo("content.tar.gz", contentArchive);
await fetchTo("charts.tar", chartsArchive);

unpack(contentArchive, CONTENT, true);
unpack(chartsArchive, CHARTS, false);
fs.writeFileSync(MARKER, JSON.stringify(manifest, null, 2) + "\n");
fs.rmSync(CACHE, { recursive: true, force: true });

console.log(`Dados ${manifest.release} prontos em ${CONTENT}/ e ${CHARTS.replaceAll("\\", "/")}/.`);
