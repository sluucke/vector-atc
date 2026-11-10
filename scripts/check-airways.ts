/**
 * Cross-checks content/airways.json against the CGNA scheduled flights.
 *
 *   npm run check:airways
 *
 * Every scheduled route that flies an airway is read against the AIP
 * allocation, at the level filed for that leg. Airlines file what ATC accepts,
 * so a parser bug (a column read as the wrong parity) shows up as a sudden
 * drop in agreement. Run it after sync:airways on a new AIRAC.
 */
import fs from "node:fs";
import { analyseRoute, type AirwayDatabase } from "../src/lib/ops/airways";
import { levelParity } from "../src/lib/ops/cruise-level";
import type { RplDatabase } from "../src/lib/ops/rpl";

const airways = JSON.parse(fs.readFileSync("content/airways.json", "utf8")) as AirwayDatabase;
const rpl = JSON.parse(fs.readFileSync("content/rpl.json", "utf8")) as RplDatabase;

let agree = 0;
let disagree = 0;
let unread = 0;
const samples: string[] = [];

for (const [pair, data] of Object.entries(rpl.pairs)) {
  for (const route of data.routes) {
    const legs = analyseRoute(route.route, route.level, airways).filter(
      (l) => l.basis === "airway" && l.level !== null
    );
    if (legs.length === 0) {
      unread += route.count;
      continue;
    }
    const bad = legs.find((l) => levelParity(l.level!) !== l.required);
    if (!bad) {
      agree += route.count;
      continue;
    }
    disagree += route.count;
    if (samples.length < 10) {
      samples.push(`  ${pair} FL${bad.level} ${bad.via} ${bad.from}→${bad.to}: AIP ${bad.required}`);
    }
  }
}

const read = agree + disagree;
const rate = read ? (agree / read) * 100 : 0;
console.log(`RPL ${rpl.cycle} × AIP (${airways.syncedAt})`);
console.log(`  concordam:  ${agree} voos`);
console.log(`  divergem:   ${disagree} voos`);
console.log(`  sem aerovia lida: ${unread} voos`);
console.log(`  concordância: ${rate.toFixed(1)}%`);
if (samples.length) console.log("\nExemplos de divergência:\n" + samples.join("\n"));

// Below this the parser, not the airlines, is the likely culprit.
process.exit(rate >= 97 ? 0 : 1);
