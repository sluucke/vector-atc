/**
 * Checks a planned cruising level against the semicircular rule and RVSM.
 *
 * The table is ICAO Annex 2, Appendix 3, as adopted by DECEA in the ICA 100-12:
 * a magnetic track of 000 to 179 takes the odd levels, 180 to 359 the even
 * ones, VFR sits 500 ft above the IFR level for its direction, and above
 * FL410 the levels are 4000 ft apart. RVSM airspace is FL290 to FL410, which
 * needs the W in field 10a of the flight plan.
 *
 * The rule counts magnetic course, and the network reports a TRUE heading —
 * measured against the feed by comparing reported headings with the track
 * between two positions a minute apart, which came out at a median of 0°
 * across 46 flights over Brazil. So the aerodrome's published variation is
 * applied before the rule is read. Without it, Goiânia to Campinas (true 163°,
 * magnetic 184°) would be called eastbound and every correct even level would
 * be flagged.
 *
 * A heading is still not a track, and variation drifts across a FIR, so
 * courses within a few degrees of 000 or 180 are reported as undetermined
 * rather than guessed at.
 *
 * The AIP also warns that some ATS routes carry their own level continuity on
 * the route charts. Those exceptions are not encoded here, and a flagged level
 * says so.
 */

/**
 * Courses this close to 000 or 180 are not called either way: a heading is not
 * a track (wind drift runs to about 10°) and the variation used is the
 * aerodrome's, which drifts by a few degrees across a FIR.
 */
const BOUNDARY_DEG = 8;

/** RVSM airspace, inclusive. */
const RVSM_BOTTOM = 290;
const RVSM_TOP = 410;

/** Below this the level is a circuit or a transit, not a cruising level. */
const MIN_CHECKED_FL = 30;

export type LevelVerdict = "ok" | "warn" | "error" | "unknown";

export interface LevelFinding {
  /** Short label for the badge. */
  label: string;
  detail: string;
}

export interface CruiseLevelCheck {
  verdict: LevelVerdict;
  /** Planned level in hundreds of feet, or null when unreadable. */
  flightLevel: number | null;
  /** Which half of the rule the track falls in. */
  direction: "east" | "west" | null;
  /** The heading the network reported, true. */
  heading: number | null;
  /** The magnetic course the rule was read against. */
  magneticCourse: number | null;
  rvsm: "outside" | "inside" | null;
  rvsmApproved: boolean | null;
  findings: LevelFinding[];
}

/**
 * Flight plan levels arrive as "F360", "FL360", "A055", "3500", "S1130" or
 * "M0840". Only the feet forms are converted; metric levels are read as
 * published.
 */
export function parseLevel(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const text = raw.trim().toUpperCase().replace(/\s+/g, "");

  const fl = text.match(/^(?:FL|F)(\d{2,3})$/);
  if (fl) return Number(fl[1]);

  // "A055" is an altitude in hundreds of feet; the rule counts the same way.
  const altitude = text.match(/^A(\d{2,3})$/);
  if (altitude) return Number(altitude[1]);

  // Metric levels (S = standard metric, M = metric altitude), in tens of metres.
  const metric = text.match(/^[SM](\d{4})$/);
  if (metric) return Math.round((Number(metric[1]) * 10) / 30.48);

  const plain = text.match(/^(\d{3,5})$/);
  if (plain) {
    const value = Number(plain[1]);
    return value >= 1000 ? Math.round(value / 100) : value;
  }

  return null;
}

/** The W in field 10a is the RVSM approval. */
export function hasRvsmApproval(
  equipment: string | null | undefined
): boolean | null {
  if (!equipment || !equipment.trim()) return null;
  return /W/i.test(equipment);
}

function isEast(heading: number): boolean {
  return heading < 180;
}

/** Levels are 1000 ft apart up to FL410 and 4000 ft apart above it. */
function levelFits(flightLevel: number, east: boolean, vfr: boolean): boolean {
  if (vfr) {
    // VFR sits 500 ft above the IFR level, so the level ends in 5.
    if (flightLevel % 10 !== 5) return false;
    const thousands = (flightLevel - 5) / 10;
    return east ? thousands % 2 === 1 : thousands % 2 === 0;
  }

  if (flightLevel % 10 !== 0) return false;
  const thousands = flightLevel / 10;

  if (flightLevel <= RVSM_TOP) {
    return east ? thousands % 2 === 1 : thousands % 2 === 0;
  }

  // Above FL410: 450, 490, 530 eastbound; 430, 470, 510 westbound.
  const step = (flightLevel - (east ? 450 : 430)) / 40;
  return step >= 0 && Number.isInteger(step);
}

export function checkCruiseLevel({
  level,
  heading,
  flightRules,
  equipment,
  state,
  variation,
}: {
  level: string | null | undefined;
  heading: number | null | undefined;
  flightRules: string | null | undefined;
  equipment: string | null | undefined;
  /** IVAO's own phase of flight; only en route is the cruising track. */
  state: string | null | undefined;
  /** Magnetic variation in degrees, negative to the west. */
  variation: number | null | undefined;
}): CruiseLevelCheck {
  const flightLevel = parseLevel(level);
  const rvsmApproved = hasRvsmApproval(equipment);
  const findings: LevelFinding[] = [];

  const base: CruiseLevelCheck = {
    verdict: "unknown",
    flightLevel,
    direction: null,
    heading: heading ?? null,
    magneticCourse: null,
    rvsm: null,
    rvsmApproved,
    findings,
  };

  if (flightLevel === null) {
    findings.push({
      label: "nível ilegível",
      detail: `O plano traz "${level ?? "—"}", que não é um nível reconhecido.`,
    });
    return base;
  }

  const inRvsm = flightLevel >= RVSM_BOTTOM && flightLevel <= RVSM_TOP;
  base.rvsm = inRvsm ? "inside" : "outside";

  // V is VFR; Y and Z start or end IFR, so the cruising level follows the IFR
  // table for the part that matters here.
  const vfr = (flightRules ?? "").toUpperCase() === "V";

  if (inRvsm && rvsmApproved === false) {
    findings.push({
      label: "sem RVSM",
      detail:
        `FL${String(flightLevel).padStart(3, "0")} está dentro do RVSM ` +
        "(FL290 a FL410) e o campo 10 do plano não declara o W.",
    });
  }

  if (vfr && flightLevel > 195) {
    findings.push({
      label: "VFR acima do FL195",
      detail:
        "Acima do FL195 o espaço é classe A; um voo VFR não pode cruzar nesse nível.",
    });
  }

  if (flightLevel < MIN_CHECKED_FL) {
    base.verdict = findings.length > 0 ? "warn" : "unknown";
    if (findings.length === 0) {
      findings.push({
        label: "abaixo do nível de cruzeiro",
        detail:
          "Nível baixo demais para a tabela de níveis de cruzeiro — nada a verificar.",
      });
    }
    return base;
  }

  if ((state ?? "") !== "En Route") {
    findings.push({
      label: "fora de cruzeiro",
      detail:
        "O rumo atual é o da subida ou da chegada, não o de cruzeiro, então o " +
        "semicírculo só é verificado com a aeronave em rota.",
    });
    base.verdict = findings.length > 1 ? "warn" : "unknown";
    return base;
  }

  if (heading === null || heading === undefined) {
    findings.push({
      label: "sem rumo",
      detail:
        "A aeronave ainda não reporta rumo, então o semicírculo não pode ser determinado.",
    });
    base.verdict = findings.length > 1 ? "warn" : "unknown";
    return base;
  }

  if (variation === null || variation === undefined) {
    findings.push({
      label: "sem declinação",
      detail:
        "A declinação magnética do aeródromo não está no dataset, e sem ela o " +
        "rumo verdadeiro da rede não vira rumo magnético.",
    });
    base.verdict = findings.length > 1 ? "warn" : "unknown";
    return base;
  }

  // True to magnetic: variation is negative to the west, so a westerly
  // variation adds to the course.
  const normalized = ((heading - variation) % 360 + 360) % 360;
  base.magneticCourse = normalized;
  const distanceToBoundary = Math.min(
    Math.abs(((normalized + 180) % 360) - 180),
    Math.abs(normalized - 180)
  );

  if (distanceToBoundary < BOUNDARY_DEG) {
    // Too close to call, so say what each side would require and let the
    // controller read the route.
    const asEast = levelFits(flightLevel, true, vfr);
    const asWest = levelFits(flightLevel, false, vfr);
    const planned = `FL${String(flightLevel).padStart(3, "0")}`;

    findings.push({
      label: "rumo no limite",
      detail:
        `Rumo magnético ${String(Math.round(normalized)).padStart(3, "0")}°, a ` +
        `${Math.round(distanceToBoundary)}° do limite do semicírculo — e o rumo da ` +
        "rede não é a derrota. Com derrota de 000 a 179 o nível seria " +
        (asEast ? `ímpar, e ${planned} confere. ` : `ímpar, e ${planned} não confere. `) +
        "De 180 a 359 seria " +
        (asWest ? `par, e ${planned} confere.` : `par, e ${planned} não confere.`),
    });
    base.verdict = findings.length > 1 ? "warn" : "unknown";
    return base;
  }

  const east = isEast(normalized);
  base.direction = east ? "east" : "west";

  if (!levelFits(flightLevel, east, vfr)) {
    findings.push({
      label: "fora do semicírculo",
      detail:
        `Rumo magnético ${String(Math.round(normalized)).padStart(3, "0")}° pede níveis ` +
        (vfr
          ? east
            ? "ímpares mais 500 ft (FL035, FL055, FL075…)"
            : "pares mais 500 ft (FL045, FL065, FL085…)"
          : east
            ? "ímpares (FL050, FL070, FL090… FL410)"
            : "pares (FL060, FL080, FL100… FL400)") +
        `, e o plano traz FL${String(flightLevel).padStart(3, "0")}. ` +
        "Algumas rotas ATS têm continuidade de níveis própria na carta de rota — " +
        "vale conferir antes de cobrar do piloto.",
    });
    base.verdict = "error";
    return base;
  }

  base.verdict = findings.length > 0 ? "warn" : "ok";
  return base;
}
