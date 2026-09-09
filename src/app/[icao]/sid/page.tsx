import Link from "next/link";
import { notFound } from "next/navigation";
import { getAirportCodes, getAirportMeta, getProcedures } from "@/lib/content";
import ProcedureTable from "@/components/ProcedureTable";

export function generateStaticParams() {
  return getAirportCodes().map((icao) => ({ icao: icao.toLowerCase() }));
}

export default async function SidPage({
  params,
}: {
  params: Promise<{ icao: string }>;
}) {
  const { icao } = await params;
  const meta = getAirportMeta(icao);
  if (!meta) notFound();
  const procedures = getProcedures(icao).filter((p) => p.type === "SID");

  return (
    <main className="max-w-5xl mx-auto px-6 py-8">
      <Link
        href={`/${icao.toLowerCase()}`}
        className="text-sm text-blue-600 hover:underline"
      >
        ← {meta.icao}
      </Link>
      <h1 className="text-2xl font-bold mt-1 mb-4">
        {meta.icao} — SID (Saídas)
      </h1>
      <ProcedureTable icao={icao} procedures={procedures} />
    </main>
  );
}
