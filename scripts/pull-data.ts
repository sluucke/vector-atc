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
import { execFileSync } from "node:child_process";
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

/** Unpacks into a fresh directory; relative paths keep GNU tar on Windows happy. */
function unpack(archive: string, dir: string, gzip: boolean) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  execFileSync("tar", [gzip ? "-xzf" : "-xf", archive.replaceAll("\\", "/"), "-C", dir.replaceAll("\\", "/")], {
    stdio: "inherit",
  });
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
