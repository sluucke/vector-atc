/**
 * Checks a planned cruising level against the semicircular rule and RVSM.
 *
 * The table is ICAO Annex 2, Appendix 3, as adopted by DECEA in the ICA 100-12:
 * a magnetic track of 000 to 179 takes the odd levels, 180 to 359 the even
 * ones, VFR sits 500 ft above the IFR level for its direction, and above
 * FL410 the levels are 4000 ft apart. RVSM airspace is FL290 to FL410, which
 * needs the W in field 10a of the flight plan.
 *
 * The rule counts the magnetic course of the route, which is not the heading
 * the aircraft happens to be pointing: a departure still on its SID, or a
 * dogleg around weather, points nowhere near the leg it is flying. So the
 * course used here is the bearing of the leg itself — from this aerodrome out
 * to a departure, or from an arrival in to this aerodrome.
 *
 * The network reports TRUE bearings. That was measured rather than assumed, by
 * comparing reported headings with the track between two positions a minute
 * apart: a median of 0° across 46 flights over Brazil. So the aerodrome's
 * published variation is applied before the rule is read. Without it, Goiânia
 * to Campinas (true 163°, magnetic 184°) would be called eastbound and every
 * correct even level flagged.
 *
 * Variation drifts across a FIR and a leg bends, so courses within a few
 * degrees of 000 or 180 are reported as undetermined rather than guessed at.
 *
 * The AIP also warns that some ATS routes carry their own level continuity on
 * the route charts. Those exceptions are not encoded here, and a flagged level
 * says so.
 */

import type { Parity, RouteLeg } from "./airways";
import type { RplEvidence } from "./rpl";

/**
 * Courses this close to 000 or 180 are not called either way. The bearing here
 * is the straight line between the field and the aircraft, while the rule
 * applies to each airway segment, and the AIP allocates levels by route chart
 * on some ATS routes. São Paulo to Brasília sits 11° from the boundary and
 * flies the levels of the other semicircle, so a margin this wide is what it
 * takes not to cry wolf.
 */
const BOUNDARY_DEG = 25;

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
  /** True course of the leg, as flown to or from this aerodrome. */
  course: number | null;
  /** The magnetic course the rule was read against. */
  magneticCourse: number | null;
  rvsm: "outside" | "inside" | null;
  rvsmApproved: boolean | null;
  findings: LevelFinding[];
  /**
   * What settled the semicircle: the AIP allocation of the airways filed,
   * the magnetic course of the filed direct legs, the bearing of the leg to or
   * from this aerodrome, or the scheduled flights of the same city pair.
   */
  basis: "airway" | "route" | "leg" | "rpl" | null;
  /** The filed route as read against the AIP, leg by leg. */
  legs: LegCheck[];
  /** Scheduled flights (CGNA RPL) of the same city pair. */
  rpl: RplEvidence | null;
}

export interface LegCheck {
  from: string;
  to: string;
  via: string;
  level: number | null;
  required: Parity | null;
  basis: RouteLeg["basis"];
  magneticCourse: number | null;
  /** Planned level fits what the leg requires. */
  fits: boolean | null;
  wrongWay?: boolean;
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
  course,
  flightRules,
  equipment,
  variation,
  route = [],
  rpl = null,
}: {
  level: string | null | undefined;
  /** True bearing of the leg to or from this aerodrome. */
  course: number | null | undefined;
  flightRules: string | null | undefined;
  equipment: string | null | undefined;
  /** Magnetic variation in degrees, negative to the west. */
  variation: number | null | undefined;
  /** The filed route read against the AIP (see analyseRoute). */
  route?: RouteLeg[];
  /** Scheduled flights of the same city pair. */
  rpl?: RplEvidence | null;
}): CruiseLevelCheck {
  const flightLevel = parseLevel(level);
  const rvsmApproved = hasRvsmApproval(equipment);
  const findings: LevelFinding[] = [];

  const base: CruiseLevelCheck = {
    verdict: "unknown",
    flightLevel,
    direction: null,
    course: course ?? null,
    magneticCourse: null,
    rvsm: null,
    rvsmApproved,
    findings,
    basis: null,
    legs: [],
    rpl,
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

  if (!vfr && decideByRoute(flightLevel, route, rpl, findings, base)) {
    return base;
  }

  if (course === null || course === undefined) {
    if (!vfr && decideByRpl(flightLevel, rpl, findings, base)) return base;
    findings.push({
      label: "a verificar",
      detail:
        "A aeronave ainda está perto do aeródromo ou sem posição na rede, então " +
        "o rumo da perna não dá para medir e o semicírculo fica em aberto.",
    });
    base.verdict = findings.length > 1 ? "warn" : "unknown";
    return base;
  }

  if (variation === null || variation === undefined) {
    findings.push({
      label: "a verificar",
      detail:
        "A declinação magnética do aeródromo não está no dataset, e sem ela o " +
        "rumo verdadeiro da rede não vira rumo magnético.",
    });
    base.verdict = findings.length > 1 ? "warn" : "unknown";
    return base;
  }

  // True to magnetic: variation is negative to the west, so a westerly
  // variation adds to the course.
  const normalized = ((course - variation) % 360 + 360) % 360;
  base.magneticCourse = normalized;
  const distanceToBoundary = Math.min(
    Math.abs(((normalized + 180) % 360) - 180),
    Math.abs(normalized - 180)
  );

  if (distanceToBoundary < BOUNDARY_DEG) {
    if (!vfr && decideByRpl(flightLevel, rpl, findings, base)) return base;
    // Too close to call, so say what each side would require and let the
    // controller read the route.
    const asEast = levelFits(flightLevel, true, vfr);
    const asWest = levelFits(flightLevel, false, vfr);
    const planned = `FL${String(flightLevel).padStart(3, "0")}`;

    findings.push({
      label: "rumo no limite",
      detail:
        `Rumo magnético da perna ${String(Math.round(normalized)).padStart(3, "0")}°, ` +
        `a ${Math.round(distanceToBoundary)}° do limite do semicírculo, e a rota ` +
        "pode ter continuidade de níveis própria na carta de rota. " +
        "Com rumo de 000 a 179 o nível seria " +
        (asEast ? `ímpar, e ${planned} confere. ` : `ímpar, e ${planned} não confere. `) +
        "De 180 a 359 seria " +
        (asWest ? `par, e ${planned} confere.` : `par, e ${planned} não confere.`),
    });
    base.verdict = findings.length > 1 ? "warn" : "unknown";
    return base;
  }

  const east = isEast(normalized);
  base.direction = east ? "east" : "west";
  base.basis = "leg";

  if (!levelFits(flightLevel, east, vfr)) {
    findings.push({
      label: "fora do semicírculo",
      detail:
        `Rumo magnético da perna ${String(Math.round(normalized)).padStart(3, "0")}° pede níveis ` +
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

/** Which semicircle a planned IFR level belongs to; null when it fits neither. */
export function levelParity(flightLevel: number): Parity | null {
  if (levelFits(flightLevel, true, false)) return "odd";
  if (levelFits(flightLevel, false, false)) return "even";
  return null;
}

const PARITY_WORD: Record<Parity, string> = { odd: "ímpar", even: "par" };
const fl = (level: number) => `FL${String(level).padStart(3, "0")}`;

function rplLine(rpl: RplEvidence): string {
  const share = Math.round(Math.max(rpl.oddShare, rpl.evenShare) * 100);
  const parity = rpl.oddShare >= rpl.evenShare ? "ímpar" : "par";
  const top = rpl.topRoute
    ? ` Rota mais filada: ${rpl.topRoute.route} no ${fl(rpl.topRoute.level)}.`
    : "";
  return (
    `Voos regulares da CGNA (RPL ${rpl.cycle}): ${rpl.flights} nesse par, ` +
    `${share}% em nível ${parity}.${top}`
  );
}

/**
 * Settles the semicircle from the filed route. Airway legs answer with the AIP
 * allocation, which is authoritative, including the level continuity some
 * routes keep across bends. Direct legs answer with the magnetic course
 * between their two points. Returns false when the route says nothing.
 */
function decideByRoute(
  plannedLevel: number,
  route: RouteLeg[],
  rpl: RplEvidence | null,
  findings: LevelFinding[],
  base: CruiseLevelCheck
): boolean {
  const legs: LegCheck[] = route.map((l) => {
    const level = l.level ?? plannedLevel;
    const parity = levelParity(level);
    return {
      from: l.from,
      to: l.to,
      via: l.via,
      level,
      required: l.required,
      basis: l.basis,
      magneticCourse: l.magneticCourse,
      fits: l.required && parity ? parity === l.required : null,
      ...(l.wrongWay ? { wrongWay: true } : {}),
    };
  });
  base.legs = legs;

  const airway = legs.filter((l) => l.basis === "airway");
  const direct = legs.filter((l) => l.basis === "track");
  const wrongWay = legs.filter((l) => l.wrongWay);
  if (airway.length === 0 && direct.length === 0 && wrongWay.length === 0) {
    return false;
  }

  const rplAgrees = (level: number) =>
    Boolean(rpl?.dominant) && rpl!.dominant === levelParity(level);

  for (const l of wrongWay) {
    findings.push({
      label: "aerovia na contramão",
      detail:
        `${l.via} entre ${l.from} e ${l.to} é de sentido único no AIP, ` +
        "e o plano a voa ao contrário.",
    });
  }

  if (airway.length > 0) {
    base.basis = "airway";
    const bad = airway.filter((l) => l.fits === false);

    if (bad.length === 0) {
      const byAirway = [...new Set(airway.map((l) => l.via))]
        .map((via) => {
          const leg = airway.find((l) => l.via === via)!;
          return `${via} pede nível ${PARITY_WORD[leg.required!]}`;
        })
        .join("; ");
      findings.push({
        label: "conforme o AIP",
        detail: `${byAirway} nesse sentido (AIP ENR 3), e o plano confere.`,
      });
      if (rpl) findings.push({ label: "RPL", detail: rplLine(rpl) });
      base.verdict = wrongWay.length > 0 ? "warn" : "ok";
      return true;
    }

    const first = bad[0];
    const detail =
      `${first.via} de ${first.from} a ${first.to} pede nível ` +
      `${PARITY_WORD[first.required!]} nesse sentido (AIP ENR 3), e o plano ` +
      `traz ${fl(first.level!)}.`;
    if (rplAgrees(first.level!)) {
      findings.push({ label: "AIP diverge do RPL", detail });
      findings.push({ label: "RPL", detail: rplLine(rpl!) });
      base.verdict = "warn";
    } else {
      findings.push({ label: "fora do AIP", detail });
      if (rpl) findings.push({ label: "RPL", detail: rplLine(rpl) });
      base.verdict = "error";
    }
    return true;
  }

  if (direct.length === 0) {
    base.verdict = "warn";
    return true;
  }

  // Only direct legs: the geometry is exact, but the rule follows each leg's
  // track, and a route that crosses the boundary is still filed at one level.
  base.basis = "route";
  const bad = direct.filter((l) => l.fits === false);
  const courses = direct
    .map((l) => `${l.from}→${l.to} ${String(l.magneticCourse).padStart(3, "0")}°`)
    .join(", ");

  if (bad.length === 0) {
    findings.push({
      label: "conforme a rota",
      detail: `Pernas diretas com rumo magnético ${courses}: o plano confere.`,
    });
    if (rpl) findings.push({ label: "RPL", detail: rplLine(rpl) });
    base.verdict = wrongWay.length > 0 ? "warn" : "ok";
    return true;
  }

  const allBad = bad.length === direct.length;
  const detail =
    `Pernas diretas com rumo magnético ${courses}; ` +
    (allBad
      ? `todas pedem nível ${PARITY_WORD[bad[0].required!]} e o plano traz ${fl(bad[0].level!)}.`
      : `a rota cruza o limite do semicírculo e ${fl(bad[0].level!)} não confere em ` +
        `${bad.map((l) => `${l.from}→${l.to}`).join(", ")}.`);

  if (rplAgrees(plannedLevel)) {
    findings.push({ label: allBad ? "rota diverge do RPL" : "rota mista", detail });
    findings.push({ label: "RPL", detail: rplLine(rpl!) });
    base.verdict = allBad ? "warn" : "ok";
  } else {
    findings.push({ label: allBad ? "fora do semicírculo" : "rota mista", detail });
    if (rpl) findings.push({ label: "RPL", detail: rplLine(rpl) });
    base.verdict = allBad ? "error" : "warn";
  }
  return true;
}

/** Last resort: what the scheduled flights of the same city pair file. */
function decideByRpl(
  plannedLevel: number,
  rpl: RplEvidence | null,
  findings: LevelFinding[],
  base: CruiseLevelCheck
): boolean {
  if (!rpl?.dominant) return false;
  base.basis = "rpl";
  const fits = levelParity(plannedLevel) === rpl.dominant;
  findings.push({
    label: fits ? "conforme o RPL" : "diverge do RPL",
    detail:
      rplLine(rpl) +
      (fits
        ? " A rota filada não pôde ser lida, mas o nível segue o dos voos regulares."
        : ` A rota filada não pôde ser lida; ${fl(plannedLevel)} não segue o dos voos regulares.`),
  });
  base.verdict = fits ? "ok" : "warn";
  return true;
}
