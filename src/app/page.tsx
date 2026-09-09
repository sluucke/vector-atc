import Link from "next/link";
import { getAllAirports } from "@/lib/content";

export default function HomePage() {
  const airports = getAllAirports();

  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-1">Cartas SID/STAR — IVAO</h1>
      <p className="text-neutral-500 mb-8">
        Referência de procedimentos de saída e chegada para controle no IVAO.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {airports.map((a) => (
          <Link
            key={a.icao}
            href={`/${a.icao.toLowerCase()}`}
            className="block border-2 border-neutral-200 dark:border-neutral-800 rounded-lg p-5 hover:border-blue-600 transition-colors"
          >
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
              {a.icao}
            </div>
            <div className="text-sm text-neutral-500">{a.name}</div>
            <div className="text-xs text-neutral-400 mt-2">
              AIRAC {a.airac.cycle} — efetivo {a.airac.effective}
            </div>
          </Link>
        ))}

        {airports.length === 0 && (
          <p className="text-neutral-400 italic">
            Nenhum aeródromo cadastrado ainda.
          </p>
        )}
      </div>
    </main>
  );
}
