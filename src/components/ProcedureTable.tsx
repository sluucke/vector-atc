"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Fuse from "fuse.js";
import type { Procedure } from "@/lib/types";

function highlight(text: string, term: string) {
  if (!term.trim()) return text;
  const escaped = term.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "ig");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-yellow-300 text-black rounded-sm px-0.5">
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export default function ProcedureTable({
  icao,
  procedures,
}: {
  icao: string;
  procedures: Procedure[];
}) {
  const [term, setTerm] = useState("");

  const fuse = useMemo(
    () =>
      new Fuse(procedures, {
        keys: ["name", "fixes", "entryFixes", "iaf", "notes"],
        threshold: 0.3,
        ignoreLocation: true,
      }),
    [procedures]
  );

  const results = useMemo(() => {
    if (!term.trim()) return procedures;
    return fuse.search(term).map((r) => r.item);
  }, [term, fuse, procedures]);

  const runways = Array.from(new Set(results.map((p) => p.runway))).sort();

  return (
    <div>
      <div className="sticky top-0 z-10 bg-white dark:bg-neutral-950 pb-3 pt-1 border-b border-neutral-200 dark:border-neutral-800">
        <input
          type="text"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Buscar SID, STAR ou fixo (ex: ARVOR, TOGPA, RWY 28)..."
          className="w-full px-4 py-2.5 rounded-lg border-2 border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-base focus:outline-none focus:border-blue-600"
        />
        {term.trim() && (
          <p className="text-xs text-neutral-500 mt-1.5">
            {results.length} resultado(s) para &quot;{term}&quot;
          </p>
        )}
      </div>

      {results.length === 0 && (
        <p className="text-center text-neutral-400 italic py-10">
          Nenhum resultado encontrado.
        </p>
      )}

      {runways.map((rwy) => {
        const rows = results.filter((p) => p.runway === rwy);
        if (rows.length === 0) return null;
        return (
          <div key={rwy} className="mt-6">
            <h3 className="text-lg font-semibold border-b-2 border-blue-700 pb-1 mb-3 inline-block">
              RWY {rwy}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-neutral-200 dark:bg-neutral-800 text-left">
                    <th className="p-2 border border-neutral-300 dark:border-neutral-700">
                      Procedimento
                    </th>
                    <th className="p-2 border border-neutral-300 dark:border-neutral-700">
                      {rows[0].type === "SID" ? "Rota comum" : "Fixos de entrada"}
                    </th>
                    <th className="p-2 border border-neutral-300 dark:border-neutral-700">
                      {rows[0].type === "SID" ? "Transições / Fixos de saída" : "Rota até o IAF"}
                    </th>
                    <th className="p-2 border border-neutral-300 dark:border-neutral-700">
                      {rows[0].type === "STAR" ? "IAF" : "Observações"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p, i) => (
                    <tr
                      key={p.id}
                      className={
                        i % 2 === 1
                          ? "bg-neutral-50 dark:bg-neutral-900"
                          : ""
                      }
                    >
                      <td className="p-2 border border-neutral-300 dark:border-neutral-700 align-top">
                        <Link
                          href={`/${icao.toLowerCase()}/carta/${p.id}`}
                          className="font-bold text-blue-700 dark:text-blue-400 hover:underline"
                        >
                          {highlight(p.name, term)}
                        </Link>
                        <span
                          className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            p.category === "RNAV"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {p.category}
                        </span>
                      </td>
                      <td className="p-2 border border-neutral-300 dark:border-neutral-700 align-top">
                        {p.type === "SID"
                          ? highlight(p.commonRoute ?? "", term)
                          : (p.entryFixes ?? []).map((f, idx) => (
                              <span key={f}>
                                {idx > 0 && " | "}
                                <span className="font-bold">
                                  {highlight(f, term)}
                                </span>
                              </span>
                            ))}
                      </td>
                      <td className="p-2 border border-neutral-300 dark:border-neutral-700 align-top">
                        {p.type === "SID"
                          ? (p.transitions ?? []).map((t, idx) => (
                              <span key={t.fix}>
                                {idx > 0 && " | "}
                                <span title={t.desc}>
                                  TRNS{" "}
                                  <span className="font-bold">
                                    {highlight(t.fix, term)}
                                  </span>
                                </span>
                              </span>
                            ))
                          : highlight(p.route ?? "", term)}
                        {p.transitions?.length === 0 && p.type === "SID" && (
                          <span className="text-neutral-400 italic">
                            sem fixos nomeados
                          </span>
                        )}
                      </td>
                      <td className="p-2 border border-neutral-300 dark:border-neutral-700 align-top">
                        {p.type === "STAR" ? (
                          <span className="font-bold bg-yellow-100 text-yellow-900 px-1.5 py-0.5 rounded">
                            {highlight(p.iaf ?? "", term)}
                          </span>
                        ) : (
                          <span className="text-neutral-600 dark:text-neutral-400">
                            {highlight(p.notes ?? "", term)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
