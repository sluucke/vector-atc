import type { AtcPosition, ControllerPosition, WhazzupAtc } from "./types";

/** Positions that belong to one aerodrome. CTR/FSS cover an area, not a field. */
const AERODROME_POSITIONS = new Set<AtcPosition>([
  "DEL",
  "GND",
  "TWR",
  "APP",
  "DEP",
]);

const KNOWN_POSITIONS = new Set<string>([
  "DEL",
  "GND",
  "TWR",
  "APP",
  "DEP",
  "CTR",
  "FSS",
  "OBS",
]);

/**
 * IVAO already publishes the parsed suffix in `atcSession.position`; the
 * callsign is only used for the prefix and as a fallback.
 */
export function parseController(atc: WhazzupAtc): ControllerPosition {
  const parts = atc.callsign.toUpperCase().split("_");
  const prefix = parts[0] ?? atc.callsign.toUpperCase();

  const fromSession = atc.atcSession?.position?.toUpperCase();
  const fromCallsign = parts.length > 1 ? parts[parts.length - 1] : "";
  const position =
    fromSession && KNOWN_POSITIONS.has(fromSession) ? fromSession : fromCallsign;

  const isIcao = /^[A-Z]{4}$/.test(prefix);
  const airport =
    isIcao && AERODROME_POSITIONS.has(position as AtcPosition) ? prefix : null;

  return {
    callsign: atc.callsign.toUpperCase(),
    prefix,
    position,
    airport,
    frequency: atc.atcSession?.frequency ?? null,
    atis: atc.atis?.lines?.join(" ") ?? null,
    since: null,
  };
}

export const POSITION_LABELS: Record<string, string> = {
  DEL: "Clearance Delivery",
  GND: "Solo",
  TWR: "Torre",
  APP: "Aproximação",
  DEP: "Saída",
  CTR: "Centro",
  FSS: "Informação de voo",
  OBS: "Observador",
};
