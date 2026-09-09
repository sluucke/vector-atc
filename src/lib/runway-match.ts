/**
 * A procedure's runway field can name several runways at once ("11L/11R",
 * "10/28"), so membership — not equality — decides whether it serves the
 * runway in use.
 */
export function servesRunway(
  procedureRunway: string,
  activeRunway: string | null
): boolean {
  if (!activeRunway) return false;
  return procedureRunway
    .split("/")
    .map((r) => r.trim().toUpperCase())
    .includes(activeRunway.toUpperCase());
}
