import type { Chart, Procedure } from "@/lib/types";

export interface CategoryEntry {
  key: string;
  /** Route to open it: a procedure page, or the plain chart page. */
  href: string;
  label: string;
  sublabel: string | null;
  badge: string | null;
  group: string | null;
  /** Charts with no coding table have no geometry, so no map. */
  procedure: Procedure | null;
}

const PROCEDURE_CATEGORIES = new Set(["SID", "STAR"]);

/**
 * SID and STAR are browsed as procedures, but a published chart whose coding
 * table we could not parse still has to be reachable — otherwise the counts
 * disagree with the chart list and the chart is simply lost. Those appear
 * alongside the procedures, without a map.
 */
export function categoryEntries(
  icao: string,
  charts: Chart[],
  procedures: Procedure[],
  category: string
): CategoryEntry[] {
  const base = icao.toLowerCase();
  const categoryCharts = charts.filter((c) => c.type === category);

  if (!PROCEDURE_CATEGORIES.has(category)) {
    return categoryCharts.map((c) => ({
      key: c.key,
      href: `/${base}/chart/${c.key}`,
      label: c.name,
      sublabel: null,
      badge: null,
      // Approach and visual charts name their runway too, so they group and
      // filter by it just like the procedures do.
      group: runwayOf(c.name),
      procedure: null,
    }));
  }

  const categoryProcedures = procedures.filter((p) => p.type === category);
  const covered = new Set(categoryProcedures.map((p) => p.chartKey));

  const fromProcedures: CategoryEntry[] = categoryProcedures.map((p) => ({
    key: p.id,
    href: `/${base}/carta/${p.id}`,
    label: p.name,
    sublabel:
      (p.type === "SID"
        ? (p.transitions ?? []).map((t) => t.fix)
        : (p.entryFixes ?? [])
      ).join(" · ") || null,
    badge: p.category,
    group: `RWY ${p.runway}`,
    procedure: p,
  }));

  const fromCharts: CategoryEntry[] = categoryCharts
    .filter((c) => !covered.has(c.key))
    .map((c) => ({
      key: c.key,
      href: `/${base}/chart/${c.key}`,
      label: c.name,
      sublabel: null,
      badge: null,
      group: runwayOf(c.name),
      procedure: null,
    }));

  return [...fromProcedures, ...fromCharts];
}

/** "RNAV PAPID 2A RWY 11L" -> "RWY 11L" */
function runwayOf(name: string): string | null {
  const m = name.toUpperCase().match(/RWY\s+([0-9]{2}[LRC]?(?:\s*\/\s*[0-9]{2}[LRC]?)*)/);
  return m ? `RWY ${m[1].replace(/\s*\/\s*/g, "/")}` : null;
}

export function categoryCount(
  charts: Chart[],
  procedures: Procedure[],
  category: string
): number {
  return categoryEntries("x", charts, procedures, category).length;
}
