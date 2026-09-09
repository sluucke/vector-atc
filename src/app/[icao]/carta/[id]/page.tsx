import Link from "next/link";
import { notFound } from "next/navigation";
import { getAirportCodes, getAirportMeta, getProcedure, getProcedures } from "@/lib/content";

export function generateStaticParams() {
  return getAirportCodes().flatMap((icao) =>
    getProcedures(icao).map((p) => ({ icao: icao.toLowerCase(), id: p.id }))
  );
}

export default async function CartaPage({
  params,
}: {
  params: Promise<{ icao: string; id: string }>;
}) {
  const { icao, id } = await params;
  const meta = getAirportMeta(icao);
  const procedure = getProcedure(icao, id);
  if (!meta || !procedure) notFound();

  const backHref = `/${icao.toLowerCase()}/${procedure.type === "SID" ? "sid" : "star"}`;

  return (
    <main className="flex flex-col h-screen">
      <div className="flex items-center justify-between gap-4 px-4 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <Link href={backHref} className="text-sm text-blue-600 hover:underline shrink-0">
            ← {procedure.type} {meta.icao}
          </Link>
          <h1 className="font-bold truncate">
            {procedure.type} {procedure.name} — RWY {procedure.runway}
          </h1>
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
              procedure.category === "RNAV"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {procedure.category}
          </span>
        </div>
        <a
          href={procedure.chart}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:underline shrink-0"
        >
          Abrir PDF em nova aba ↗
        </a>
      </div>

      {procedure.notes && (
        <div className="px-4 py-2 text-sm bg-yellow-50 dark:bg-yellow-950/30 border-b border-yellow-300 dark:border-yellow-800">
          {procedure.notes}
        </div>
      )}

      <iframe
        src={procedure.chart}
        title={`Carta ${procedure.type} ${procedure.name}`}
        className="flex-1 w-full"
      />
    </main>
  );
}
