/**
 * Which chart categories each ATC position normally works with.
 *
 * These are operational defaults, not a published rule — a Ground controller
 * has no use for arrival procedures, a Delivery controller cares about the SID
 * being cleared, and so on. The browser applies them as a starting filter and
 * the controller can override any of it.
 */
const BY_POSITION: Record<string, string[]> = {
  DEL: ["SID", "ADC", "PDC"],
  GND: ["ADC", "PDC", "SID"],
  TWR: ["ADC", "SID", "IAC", "VAC", "REA"],
  APP: ["STAR", "IAC", "SID", "VAC", "REA"],
  DEP: ["SID", "STAR"],
  CTR: ["SID", "STAR"],
};

/** Null when the position has no sensible narrowing (FSS, observer, unknown). */
export function relevantCategories(position: string | null | undefined) {
  if (!position) return null;
  return BY_POSITION[position.toUpperCase()] ?? null;
}

export const CATEGORY_LABELS: Record<string, string> = {
  SID: "Saídas",
  STAR: "Chegadas",
  IAC: "Aproximação",
  ADC: "Aeródromo",
  VAC: "Visual",
  PDC: "Pátio",
  AOC: "Obstáculos",
  REA: "Rotas Especiais",
};
