/**
 * The standard rectangular VFR traffic circuit (ICAO Annex 2, 4.5.2 / ICA
 * 100-12): five legs flown around the runway in use, all turns to the left
 * unless the aerodrome publishes right-hand traffic for a given runway.
 *
 * This is the generic pattern, not a per-aerodrome chart: the VAC is what
 * actually governs direction, altitude and entry point at a given field, and
 * this panel says so. It exists so the shape and the calls are one lookup
 * away instead of a search through the manual.
 */

export type CircuitDirection = "left" | "right";

export interface CircuitLeg {
  id: string;
  label: { pt: string; en: string };
  /** Heading relative to the runway direction, in degrees (0 = runway heading). */
  relativeHeading: number;
  note: { pt: string; en: string };
}

/**
 * Legs in flight order, headings for LEFT-hand traffic (the ICAO default):
 * every turn is to the left, so each leg's heading is 90° counter-clockwise
 * from the one before. `mirrorHeading` flips these for a right-hand pattern.
 */
export const CIRCUIT_LEGS: CircuitLeg[] = [
  {
    id: "takeoff",
    label: { pt: "Decolagem", en: "Take-off" },
    relativeHeading: 0,
    note: {
      pt: "Subida na proa da pista até a altitude do circuito.",
      en: "Climb on runway heading to circuit altitude.",
    },
  },
  {
    id: "crosswind",
    label: { pt: "Perna do través", en: "Crosswind leg" },
    relativeHeading: 270,
    note: {
      pt: "Curva à {DIR} após a decolagem, ao atingir a altitude do circuito.",
      en: "Turn {DIR} after take-off, on reaching circuit altitude.",
    },
  },
  {
    id: "downwind",
    label: { pt: "Perna do vento", en: "Downwind leg" },
    relativeHeading: 180,
    note: {
      pt: "Paralela à pista, sentido oposto, altitude do circuito. Checklist de pouso e notificação à Torre.",
      en: "Parallel to the runway, opposite direction, circuit altitude. Landing checks and the call to Tower.",
    },
  },
  {
    id: "base",
    label: { pt: "Perna base", en: "Base leg" },
    relativeHeading: 90,
    note: {
      pt: "Curva à {DIR} da perna do vento para a base; início da descida.",
      en: "Turn {DIR} from downwind onto base; descent begins.",
    },
  },
  {
    id: "final",
    label: { pt: "Final", en: "Final" },
    relativeHeading: 0,
    note: {
      pt: "Alinhado com a pista, autorização de pouso antes do limiar.",
      en: "Aligned with the runway, landing clearance before the threshold.",
    },
  },
];

/** Standard circuit altitudes, in feet AGL, by aircraft category. */
export const CIRCUIT_ALTITUDES = [
  { category: { pt: "Monomotores leves", en: "Light singles" }, agl: 1000 },
  { category: { pt: "Multimotores / turboélice", en: "Multi-engine / turboprop" }, agl: 1500 },
  { category: { pt: "Jatos", en: "Jets" }, agl: 1500 },
];

/** Mirror a left-hand relative heading for right-hand traffic. */
export function mirrorHeading(relativeHeading: number, direction: CircuitDirection): number {
  if (direction === "left") return relativeHeading;
  return (360 - relativeHeading) % 360;
}
