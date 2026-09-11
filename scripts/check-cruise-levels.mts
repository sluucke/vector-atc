import { checkCruiseLevel, parseLevel } from "../src/lib/ops/cruise-level";

const cases: [string, Parameters<typeof checkCruiseLevel>[0], string][] = [
  [
    "leste FL350 ímpar",
    { level: "F350", heading: 90, flightRules: "I", equipment: "SW", state: "En Route", variation: -21 },
    "ok",
  ],
  [
    "leste FL360 par",
    { level: "F360", heading: 90, flightRules: "I", equipment: "SW", state: "En Route", variation: -21 },
    "error",
  ],
  [
    "oeste FL360 par",
    { level: "F360", heading: 270, flightRules: "I", equipment: "SW", state: "En Route", variation: -21 },
    "ok",
  ],
  [
    "oeste FL350 ímpar",
    { level: "F350", heading: 270, flightRules: "I", equipment: "SW", state: "En Route", variation: -21 },
    "error",
  ],
  [
    "RVSM sem W",
    { level: "F350", heading: 90, flightRules: "I", equipment: "SDG", state: "En Route", variation: -21 },
    "warn",
  ],
  [
    "RVSM sem equipamento declarado",
    { level: "F350", heading: 90, flightRules: "I", equipment: "", state: "En Route", variation: -21 },
    "ok",
  ],
  [
    "acima do FL410 leste FL450",
    { level: "F450", heading: 90, flightRules: "I", equipment: "SW", state: "En Route", variation: -21 },
    "ok",
  ],
  [
    "acima do FL410 leste FL430",
    { level: "F430", heading: 90, flightRules: "I", equipment: "SW", state: "En Route", variation: -21 },
    "error",
  ],
  [
    "acima do FL410 oeste FL430",
    { level: "F430", heading: 270, flightRules: "I", equipment: "SW", state: "En Route", variation: -21 },
    "ok",
  ],
  [
    "VFR leste FL055",
    { level: "A055", heading: 90, flightRules: "V", equipment: "S", state: "En Route", variation: -21 },
    "ok",
  ],
  [
    "VFR leste FL045",
    { level: "A045", heading: 90, flightRules: "V", equipment: "S", state: "En Route", variation: -21 },
    "error",
  ],
  [
    "VFR acima do FL195",
    { level: "F215", heading: 90, flightRules: "V", equipment: "S", state: "En Route", variation: -21 },
    "warn",
  ],
  [
    "rumo no limite do semicírculo",
    { level: "F360", heading: 160, flightRules: "I", equipment: "SW", state: "En Route", variation: -21 },
    "unknown",
  ],
  [
    // True course 163°, magnetic 184° with 21°W: westbound, so FL340 is right.
    "SBGO-SBKP FL340: rumo magnético 184, perto do limite",
    { level: "F340", heading: 163, flightRules: "I", equipment: "SDE3FGHIRWY", state: "En Route", variation: -21 },
    "unknown",
  ],
  [
    "SBGO-SBKP FL350: idem, também não é chamado",
    { level: "F350", heading: 163, flightRules: "I", equipment: "SDE3FGHIRWY", state: "En Route", variation: -21 },
    "unknown",
  ],
  [
    "sem declinação no dataset",
    { level: "F360", heading: 90, flightRules: "I", equipment: "SW", state: "En Route", variation: null },
    "unknown",
  ],
  [
    "ainda subindo",
    { level: "F360", heading: 90, flightRules: "I", equipment: "SW", state: "Initial Climb", variation: -21 },
    "unknown",
  ],
  [
    "nível ilegível",
    { level: "ABC", heading: 90, flightRules: "I", equipment: "SW", state: "En Route", variation: -21 },
    "unknown",
  ],
];

let failed = 0;
for (const [name, input, expected] of cases) {
  const got = checkCruiseLevel(input).verdict;
  const mark = got === expected ? "ok  " : "FAIL";
  if (got !== expected) failed++;
  console.log(`${mark} ${name.padEnd(34)} esperado ${expected}, obtido ${got}`);
}

console.log("\nparseLevel:", ["F360", "FL85", "A055", "3500", "S1130", "lixo"].map(
  (v) => `${v}=${parseLevel(v)}`
).join("  "));

process.exit(failed > 0 ? 1 : 0);
