"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlaneTakeoff, PlaneLanding } from "lucide-react";
import type { Procedure } from "@/lib/types";

const TABS = ["TODOS", "SID", "STAR"] as const;
type Tab = (typeof TABS)[number];

export default function ProcedureBrowser({
  icao,
  procedures,
}: {
  icao: string;
  procedures: Procedure[];
}) {
  const [tab, setTab] = useState<Tab>("TODOS");
  const pathname = usePathname();
  const activeRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [pathname]);

  const visible = procedures.filter((p) => tab === "TODOS" || p.type === tab);
  const runways = Array.from(new Set(visible.map((p) => p.runway))).sort();

  return (
    <div className="w-[21rem] shrink-0 hidden md:flex flex-col bg-panel border-r border-line">
      <div className="shrink-0 p-3 border-b border-line">
        <div className="flex gap-1 p-1 rounded-lg bg-black/25">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-1.5 rounded-md font-mono text-[11px] font-medium transition-colors duration-150 ${
                tab === t
                  ? "bg-signal/15 text-signal"
                  : "text-ink-faint hover:text-ink-dim"
              }`}
            >
              {t}
              <span className="ml-1.5 opacity-60">
                {t === "TODOS"
                  ? procedures.length
                  : procedures.filter((p) => p.type === t).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {runways.map((rwy) => (
          <div key={rwy} className="mb-3">
            <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
              RWY {rwy}
            </p>
            <div className="space-y-0.5">
              {visible
                .filter((p) => p.runway === rwy)
                .map((p) => {
                  const href = `/${icao.toLowerCase()}/carta/${p.id}`;
                  const active = pathname === href;
                  const Icon = p.type === "SID" ? PlaneTakeoff : PlaneLanding;
                  const exits =
                    p.type === "SID"
                      ? (p.transitions ?? []).map((t) => t.fix)
                      : (p.entryFixes ?? []);

                  return (
                    <Link
                      key={p.id}
                      href={href}
                      ref={active ? activeRef : undefined}
                      className={`block px-2.5 py-2 rounded-lg border-l-2 transition-colors duration-150 ${
                        active
                          ? "border-signal bg-signal/11"
                          : "border-transparent hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon
                          className={`size-3.5 shrink-0 ${
                            p.type === "SID" ? "text-signal" : "text-warn"
                          }`}
                        />
                        <span
                          className={`font-mono text-[13px] font-medium truncate ${
                            active ? "text-signal" : "text-ink"
                          }`}
                        >
                          {p.name}
                        </span>
                        <span
                          className={`ml-auto shrink-0 font-mono text-[9px] px-1.5 py-0.5 rounded ${
                            p.category === "RNAV"
                              ? "bg-ok/12 text-ok"
                              : "bg-warn/12 text-warn"
                          }`}
                        >
                          {p.category}
                        </span>
                      </div>
                      {exits.length > 0 && (
                        <p className="mt-1 pl-5.5 font-mono text-[10px] text-ink-faint truncate">
                          {exits.join(" · ")}
                        </p>
                      )}
                    </Link>
                  );
                })}
            </div>
          </div>
        ))}

        {visible.length === 0 && (
          <p className="px-3 py-8 text-center text-xs text-ink-faint">
            Nenhum procedimento nesta categoria.
          </p>
        )}
      </div>
    </div>
  );
}
