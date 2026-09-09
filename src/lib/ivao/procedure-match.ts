import type { Procedure } from "@/lib/types";
import type { ProcedureMatch } from "./types";

const UNKNOWN: ProcedureMatch = {
  confidence: "unknown",
  procedureIds: [],
  designator: null,
  fix: null,
};

const normalize = (value: string) => value.replace(/[\s-]/g, "").toUpperCase();

/** How far from each end of the route we look for a boundary fix. */
const EDGE_WINDOW = 6;

/** Airway designators (UZ19, UL776, Z15, N866, Q64). */
const AIRWAY = /^[A-Z]{1,3}\d{1,4}$/;
/** Half-degree route points (39N130W, 4100N05000W). */
const COORDINATE = /^\d{2,4}[NS]\d{3,5}[EW]$/;
const NOISE = new Set(["DCT", "SID", "STAR", "IFR", "VFR", "SIDSTAR"]);

/**
 * Route strings carry more than fixes: "BRINY/N0498F320" pins a speed/level to
 * a fix, "DCT" marks a direct leg, and airway and coordinate tokens sit between
 * them. Strip that down to the identifiers a fix could actually be.
 */
export function routeTokens(route: string): string[] {
  return route
    .trim()
    .toUpperCase()
    .split(/\s+/)
    .map((token) => token.split("/")[0])
    .filter(Boolean)
    .filter(
      (token) =>
        !NOISE.has(token) && !AIRWAY.test(token) && !COORDINATE.test(token)
    );
}

/**
 * Fixes a flight can join a SID at or leave a STAR from: the published
 * transitions, plus the procedure's own fix — these procedures are named after
 * their terminal (SID) or entry (STAR) fix, and filing just that fix without a
 * transition is routine.
 */
function boundaryFixes(procedure: Procedure): string[] {
  const transitions =
    procedure.type === "SID"
      ? (procedure.transitions ?? []).map((t) => t.fix)
      : (procedure.entryFixes ?? []);

  const named = procedure.name.split(/\s+/)[0].toUpperCase();
  const isFixName = /^[A-Z]{5}$/.test(named) && procedure.fixes.includes(named);

  return isFixName ? [...transitions, named] : transitions;
}

/**
 * IVAO publishes no structured SID/STAR field, so the association is derived
 * from the filed route:
 *   confirmed — the route names the procedure designator outright;
 *   inferred  — the route's first/last fix is a published boundary fix, which
 *               can match several procedures (usually one per runway);
 *   unknown   — neither.
 */
export function matchProcedure(
  route: string | null,
  procedures: Procedure[],
  kind: "SID" | "STAR"
): ProcedureMatch {
  if (!route) return UNKNOWN;

  const raw = route.trim().toUpperCase().split(/\s+/).filter(Boolean);
  const tokens = routeTokens(route);
  if (raw.length === 0) return UNKNOWN;

  const candidates = procedures.filter((p) => p.type === kind);

  // Designators can be filed as one token ("UMPEL1A") or two ("UMPEL 1A").
  for (let i = 0; i < raw.length; i++) {
    for (const text of [raw[i], raw[i + 1] ? `${raw[i]}${raw[i + 1]}` : null]) {
      if (!text) continue;
      const hit = candidates.find((p) => normalize(p.name) === normalize(text));
      if (hit) {
        return {
          confidence: "confirmed",
          procedureIds: [hit.id],
          designator: text,
          fix: null,
        };
      }
    }
  }

  // A departure joins the airway structure near its first filed fix and an
  // arrival leaves it near its last — but rarely on the very edge token, since
  // routes routinely end in DCT or an airway. Scan inwards from the right end.
  const edge =
    kind === "SID"
      ? tokens.slice(0, EDGE_WINDOW)
      : tokens.slice(-EDGE_WINDOW).reverse();

  for (const token of edge) {
    const viaFix = candidates.filter((p) => boundaryFixes(p).includes(token));
    if (viaFix.length > 0) {
      return {
        confidence: "inferred",
        procedureIds: viaFix.map((p) => p.id),
        designator: null,
        fix: token,
      };
    }
  }

  return UNKNOWN;
}
