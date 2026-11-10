/**
 * A procedure's runway field can name several runways at once ("11L/11R",
 * "10/28"), and several runways can be in use at once (parallels). So the test
 * is intersection, not equality.
 */
export function servesRunway(
  procedureRunway: string,
  activeRunways: string[]
): boolean {
  if (activeRunways.length === 0) return false;
  const active = new Set(activeRunways.map((r) => r.toUpperCase()));
  return procedureRunway
    .split("/")
    .map((r) => r.trim().toUpperCase())
    .some((r) => active.has(r));
}
