import Link from "next/link";
import { notFound } from "next/navigation";
import { getAirportCodes, getAirportMeta } from "@/lib/content";

export function generateStaticParams() {
  return getAirportCodes().map((icao) => ({ icao: icao.toLowerCase() }));
}

export default async function AirportPage({
  params,
}: {
  params: Promise<{ icao: string }>;
}) {
  const { icao } = await params;
  const meta = getAirportMeta(icao);
  if (!meta) notFound();

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <Link href="/" className="text-sm text-blue-600 hover:underline">
        ← Todos os aeródromos
      </Link>

      <h1 className="text-3xl font-bold mt-2">
        {meta.icao} — {meta.name}
      </h1>

      <div className="flex flex-wrap gap-2 my-5">
        {[
          ["AD ELEV", meta.elevation],
          ["TA", meta.ta],
          ["MSA", meta.msa],
          ["FIR/ACC", meta.fir],
          ["AIRAC", `${meta.airac.cycle} (${meta.airac.effective})`],
        ].map(([label, value]) => (
          <div
            key={label}
            className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md px-3 py-1.5 text-sm"
          >
            <span className="block text-[10px] uppercase tracking-wide text-neutral-500">
              {label}
            </span>
            {value}
          </div>
        ))}
      </div>

      <div className="grid gap-3 mb-6 text-sm">
        <div>
          <b>D-ATIS</b> {meta.frequencies.dAtis.join(" / ")}
        </div>
        <div>
          <b>TWR</b> {meta.frequencies.twr.join(" / ")}
        </div>
        <div>
          <b>APP</b> {meta.frequencies.app.join(" / ")}
        </div>
        <div>
          <b>ACC</b> {meta.frequencies.acc.join(" / ")}
          {meta.frequencies.accExtended && (
            <span className="text-neutral-500">
              {" "}
              (cartas antigas: {meta.frequencies.accExtended.join(" / ")})
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-3 mb-8">
        <Link
          href={`/${meta.icao.toLowerCase()}/sid`}
          className="px-5 py-2.5 rounded-lg bg-blue-700 text-white font-semibold hover:bg-blue-800"
        >
          Ver SID (Saídas)
        </Link>
        <Link
          href={`/${meta.icao.toLowerCase()}/star`}
          className="px-5 py-2.5 rounded-lg bg-orange-700 text-white font-semibold hover:bg-orange-800"
        >
          Ver STAR (Chegadas)
        </Link>
      </div>

      {meta.runwaysNote && (
        <p className="text-sm bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-300 dark:border-yellow-800 rounded-md p-3 mb-6">
          {meta.runwaysNote}
        </p>
      )}

      <h2 className="text-xl font-bold mb-3">Observações específicas</h2>
      <ul className="list-disc pl-5 space-y-2 text-sm">
        {meta.observations.map((obs, i) => (
          <li key={i}>{obs}</li>
        ))}
      </ul>
    </main>
  );
}
