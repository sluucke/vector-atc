import { Suspense } from "react";
import { notFound } from "next/navigation";
import { TriangleAlert, Route, Waypoints, Target } from "lucide-react";
import ChartWorkspace from "@/components/charts/ChartWorkspace";
import {
  getAirportCodes,
  getAirportMeta,
  getCharts,
  getGeometry,
  getProcedure,
  getProcedures,
} from "@/lib/content";

export function generateStaticParams() {
  return getAirportCodes().flatMap((icao) =>
    getProcedures(icao).map((p) => ({ icao: icao.toLowerCase(), id: p.id }))
  );
}

function PaneSection({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="p-3 border-b border-line">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="size-3.5 text-ink-faint" />
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

export default async function CartaPage(
  props: PageProps<"/[icao]/carta/[id]">
) {
  const { icao, id } = await props.params;
  const meta = getAirportMeta(icao);
  const procedure = getProcedure(icao, id);
  if (!meta || !procedure) notFound();

  const isSid = procedure.type === "SID";

  return (
    <>
      {/* Reads ?view/?focus from the traffic panel, so it needs a boundary to
          keep the route statically prerendered. */}
      <Suspense
        fallback={<div className="flex-1 min-w-0 bg-content dot-grid" />}
      >
        <ChartWorkspace
          key={procedure.id}
          icao={meta.icao}
          procedure={procedure}
          initialChartKey={procedure.chartKey}
          charts={getCharts(icao)}
          geometry={getGeometry(icao)}
        />
      </Suspense>

      <aside className="w-72 shrink-0 hidden lg:flex flex-col bg-panel border-l border-line overflow-y-auto">
        <div className="shrink-0 p-3 border-b border-line">
          <div className="flex items-center gap-2">
            <span className="font-mono text-base font-semibold">
              {procedure.name}
            </span>
            <span
              className={`font-mono text-[9px] px-1.5 py-0.5 rounded ${
                procedure.category === "RNAV"
                  ? "bg-ok/12 text-ok"
                  : "bg-warn/12 text-warn"
              }`}
            >
              {procedure.category}
            </span>
          </div>
          <p className="mt-1 font-mono text-[11px] text-ink-faint">
            {procedure.type} · RWY {procedure.runway} · {meta.icao}
          </p>
        </div>

        <PaneSection icon={Route} title={isSid ? "Rota comum" : "Rota"}>
          <p className="font-mono text-[11px] text-ink-dim leading-relaxed">
            {isSid ? procedure.commonRoute : procedure.route}
          </p>
        </PaneSection>

        {isSid && (procedure.transitions ?? []).length > 0 && (
          <PaneSection icon={Waypoints} title="Transições">
            <ul className="space-y-1.5">
              {(procedure.transitions ?? []).map((t) => (
                <li
                  key={t.fix}
                  className="rounded-md bg-hover-soft border border-line px-2.5 py-1.5"
                >
                  <p className="font-mono text-[12px] font-medium text-ink">
                    {t.fix}
                  </p>
                  <p className="font-mono text-[10px] text-ink-faint leading-snug">
                    {t.desc}
                  </p>
                </li>
              ))}
            </ul>
          </PaneSection>
        )}

        {!isSid && (
          <PaneSection icon={Target} title="Entrada / IAF">
            <div className="flex flex-wrap gap-1 mb-2">
              {(procedure.entryFixes ?? []).map((f) => (
                <span
                  key={f}
                  className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-hover text-ink"
                >
                  {f}
                </span>
              ))}
            </div>
            <p className="font-mono text-[11px] text-ink-faint">
              IAF:{" "}
              <span className="font-medium px-1.5 py-0.5 rounded bg-warn/12 text-warn">
                {procedure.iaf}
              </span>
            </p>
          </PaneSection>
        )}

        {procedure.fixes.length > 0 && (
          <PaneSection icon={Waypoints} title="Todos os fixos">
            <div className="flex flex-wrap gap-1">
              {procedure.fixes.map((f) => (
                <span
                  key={f}
                  className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-hover text-ink-dim"
                >
                  {f}
                </span>
              ))}
            </div>
          </PaneSection>
        )}

        {procedure.notes && (
          <div className="p-3">
            <div className="rounded-lg border-l-2 border-warn bg-warn/[0.06] p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <TriangleAlert className="size-3.5 text-warn" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-warn">
                  Atenção
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-ink-dim">
                {procedure.notes}
              </p>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
