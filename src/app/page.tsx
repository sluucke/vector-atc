import { Navigation } from "lucide-react";
import AirportPicker, { type AirportCard } from "@/components/AirportPicker";
import { getAllAirports, getCharts, getProcedures } from "@/lib/content";

export default function HomePage() {
  const airports: AirportCard[] = getAllAirports().map((meta) => {
    const procedures = getProcedures(meta.icao);
    return {
      icao: meta.icao,
      name: meta.name,
      fir: meta.fir,
      airacCycle: meta.airac.cycle,
      airacEffective: meta.airac.effective,
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
              VECTOR ATC
            </span>
            <span className="block font-mono text-[10px] text-ink-faint">
              HELPER · IVAO
            </span>
          </span>
        </header>

        <div className="mt-20 max-w-2xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-signal">
            Console operacional
          </p>
          <h1 className="mt-3 text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.1]">
            Tudo o que a posição
            <br />
            exige, em uma tela só.
          </h1>
          <p className="mt-5 text-base text-ink-dim leading-relaxed">
            Cartas oficiais DECEA/AISWEB abertas no navegador, procedimentos com
            transições e fixos, pista em uso, METAR, nível de transição, NOTAM e
            o tráfego IVAO ao vivo ligado ao plano de voo de cada aeronave.
          </p>
        </div>

        <div className="mt-14">
          <AirportPicker airports={airports} />
        </div>

        <footer className="mt-20 pt-6 border-t border-line flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <p className="max-w-xl font-mono text-[10px] text-ink-faint leading-relaxed">
            Dados extraídos das cartas oficiais DECEA/AISWEB. Material de apoio
            para simulação na rede IVAO — não utilizar para navegação real.
          </p>
          <p className="font-mono text-[10px] text-ink-faint leading-relaxed shrink-0">
            Desenvolvido por{" "}
            <span className="text-ink-dim">The Duck Corporation</span>
          </p>
        </footer>
      </div>
    </div>
  );
}
