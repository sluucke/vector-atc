/**
 * Transition level determination — ICA 100-37, item 5.18.4, Tabela 7.
 *
 * The level is NOT derived from a formula: DECEA publishes a lookup of
 * transition altitude against the current QNH band, and that table is
 * reproduced here verbatim. Lower QNH yields a higher transition level.
 *
 * Item 5.18.1 of the same regulation: the QNH passed to aircraft is rounded
 * down to the nearest whole hectopascal.
 *
 * Rows are added only from a published source — a MOPS or the regulation
 * itself. None is ever extrapolated from the pattern of the rows around it.
 */

/** QNH bands from Tabela 7, in hPa, ordered as published (lowest first). */
const QNH_BANDS: { min: number; max: number }[] = [
  { min: 942.2, max: 959.4 },
  { min: 959.5, max: 977.1 },
  { min: 977.2, max: 995.0 },
  { min: 995.1, max: 1013.2 },
  { min: 1013.3, max: 1031.6 },
  { min: 1031.7, max: 1050.3 },
];

/** Flight levels per transition altitude, in the band order above. */
const TABLE: Record<number, number[]> = {
  2000: [45, 40, 35, 30, 25, 20],
  3000: [55, 50, 45, 40, 35, 30],
  4000: [65, 60, 55, 50, 45, 40],
  5000: [75, 70, 65, 60, 55, 50],
  6000: [85, 80, 75, 70, 65, 60],
  7000: [95, 90, 85, 80, 75, 70],
  8000: [105, 100, 95, 90, 85, 80],
  9000: [115, 110, 105, 100, 95, 90],
};

export type TransitionLevelReason =
  | "ok"
  | "no_qnh"
  | "qnh_out_of_range"
  | "ta_not_in_table";

export interface TransitionLevelResult {
  /** Flight level as a number (75 means FL075), or null when undeterminable. */
  flightLevel: number | null;
  reason: TransitionLevelReason;
  /** The published band used, for display/audit. */
  qnhBand: { min: number; max: number } | null;
  source: "ICA 100-37 Tabela 7";
}

export function calculateTransitionLevel({
  transitionAltitude,
  qnh,
}: {
  transitionAltitude: number;
  qnh: number | null | undefined;
}): TransitionLevelResult {
  const base = {
    qnhBand: null,
    source: "ICA 100-37 Tabela 7" as const,
  };

  const row = TABLE[transitionAltitude];
  if (!row) {
    return { ...base, flightLevel: null, reason: "ta_not_in_table" };
  }

  if (qnh === null || qnh === undefined || !Number.isFinite(qnh)) {
    return { ...base, flightLevel: null, reason: "no_qnh" };
  }

  const index = QNH_BANDS.findIndex((band) => qnh >= band.min && qnh <= band.max);
  if (index === -1) {
    return { ...base, flightLevel: null, reason: "qnh_out_of_range" };
  }

  return {
    flightLevel: row[index],
    reason: "ok",
    qnhBand: QNH_BANDS[index],
    source: "ICA 100-37 Tabela 7",
  };
}

/** "FL075" — the form used on frequency and in ATIS. */
export function formatFlightLevel(level: number | null): string {
  return level === null ? "—" : `FL${String(level).padStart(3, "0")}`;
}

/** Transition altitudes the published table covers. */
export const SUPPORTED_TRANSITION_ALTITUDES = Object.keys(TABLE).map(Number);
