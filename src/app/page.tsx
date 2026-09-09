import Link from "next/link";
import {
  Navigation,
  PlaneTakeoff,
  PlaneLanding,
  FileText,
  ArrowRight,
} from "lucide-react";
import { getAllAirports, getCharts, getProcedures } from "@/lib/content";

export default function HomePage() {
  const airports = getAllAirports().map((meta) => {
    const procedures = getProcedures(meta.icao);
    return {
      meta,
      sid: procedures.filter((p) => p.type === "SID").length,
      star: procedures.filter((p) => p.type === "STAR").length,
      charts: getCharts(meta.icao).length,
    };
  });

  return (
    <div className="grain relative min-h-screen overflow-hidden">
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 size-[42rem] rounded-full opacity-[0.07] blur-3xl"
        style={{ background: "var(--color-signal)" }}
      />

      <div className="relative mx-auto max-w-5xl px-6 py-16">
        <header className="flex items-center gap-2.5">
          <span className="grid place-items-center size-8 rounded-lg bg-signal text-base">
            <Navigation className="size-4" />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold tracking-wide">
              VECTOR
            </span>
            <span className="block font-mono text-[10px] text-ink-faint">
              CHARTS · IVAO
            </span>
          </span>
        </header>

        <div className="mt-20 max-w-2xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-signal">
            Console operacional
          </p>
          <h1 className="mt-3 text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.1]">
            Cartas SID &amp; STAR,
            <br />
            prontas para o console.
          </h1>
          <p className="mt-5 text-base text-ink-dim leading-relaxed">
            Procedimentos de saída e chegada extraídos das cartas oficiais
            DECEA/AISWEB, com busca por fixo, transições detalhadas e a carta
            aberta na mesma tela — sem baixar PDF.
          </p>
        </div>

        <div className="mt-14">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
              Aeródromos disponíveis
            </h2>
            <span className="h-px flex-1 bg-line" />
            <span className="font-mono text-[10px] text-ink-faint">
              {airports.length.toString().padStart(2, "0")}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {airports.map(({ meta, sid, star, charts }) => (
              <Link
                key={meta.icao}
                href={`/${meta.icao.toLowerCase()}`}
                className="group rounded-xl border border-line bg-panel p-5 hover:border-signal/40 hover:bg-raised transition-colors duration-150"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-2xl font-semibold tracking-tight">
                      {meta.icao}
                    </p>
                    <p className="mt-0.5 text-sm text-ink-dim truncate">
                      {meta.name}
                    </p>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-ink-faint group-hover:text-signal transition-colors duration-150" />
                </div>

                <div className="mt-4 flex items-center gap-4 font-mono text-[11px] text-ink-faint">
                  <span className="flex items-center gap-1.5">
                    <PlaneTakeoff className="size-3.5 text-signal" />
                    {sid} SID
                  </span>
                  <span className="flex items-center gap-1.5">
                    <PlaneLanding className="size-3.5 text-warn" />
                    {star} STAR
                  </span>
                  <span className="flex items-center gap-1.5">
                    <FileText className="size-3.5" />
                    {charts} cartas
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-line flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-ok" />
                  <span className="font-mono text-[10px] text-ink-faint">
                    AIRAC {meta.airac.cycle} · efetivo {meta.airac.effective}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <footer className="mt-20 pt-6 border-t border-line">
          <p className="font-mono text-[10px] text-ink-faint leading-relaxed">
            Dados extraídos das cartas oficiais DECEA/AISWEB. Material de apoio
            para simulação na rede IVAO — não utilizar para navegação real.
          </p>
        </footer>
      </div>
    </div>
  );
}
