import Link from "next/link";
import { FileText } from "lucide-react";
import { CATEGORY_LABELS } from "@/lib/chart-relevance";
import type { Chart } from "@/lib/types";

/**
 * The categories that aren't procedures (approach, aerodrome, visual, apron).
 * SID and STAR get their own tables, since they carry routing detail.
 */
export default function ChartCategorySection({
  icao,
  charts,
  category,
}: {
  icao: string;
  charts: Chart[];
  category: string;
}) {
  const items = charts.filter((c) => c.type === category);
  if (items.length === 0) return null;

  return (
    <section id={category.toLowerCase()} className="scroll-mt-4">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="size-4 text-ink-faint" />
        <h2 className="text-sm font-semibold tracking-wide">
          {category} · {CATEGORY_LABELS[category] ?? "Cartas"}
        </h2>
        <span className="font-mono text-[10px] text-ink-faint">
          {items.length} {items.length === 1 ? "carta" : "cartas"}
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((chart) => (
          <Link
            key={chart.key}
            href={`/${icao.toLowerCase()}/chart/${chart.key}`}
            className="group rounded-lg border border-line bg-panel p-3 hover:border-signal/40 hover:bg-raised transition-colors duration-150"
          >
            <p className="font-mono text-[12px] text-ink group-hover:text-signal transition-colors duration-150">
              {chart.name}
            </p>
            <p className="mt-1 font-mono text-[10px] text-ink-faint">
              AIRAC {chart.amdt} · {chart.date}
              {chart.code ? ` · ${chart.code}` : ""}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
