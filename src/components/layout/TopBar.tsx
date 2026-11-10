"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navigation, Search } from "lucide-react";
import CommandPalette from "./CommandPalette";
import IvaoStatus from "@/components/ivao/IvaoStatus";
import ThemeToggle from "./ThemeToggle";
import type { SearchEntry } from "@/lib/content";

export default function TopBar({
  entries,
  station,
  frequency,
  availableIcaos,
  currentIcao,
}: {
  entries: SearchEntry[];
  station?: string;
  frequency?: string;
  availableIcaos: string[];
  currentIcao?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header className="h-16 shrink-0 flex items-center gap-2 sm:gap-4 px-3 sm:px-4 bg-panel border-b border-line">
        {/* The sidebar carries the wordmark from lg up; below that this is the
            only way back to the aerodrome list. */}
        <Link
          href="/"
          aria-label="Início"
          className="lg:hidden grid place-items-center size-8 shrink-0 rounded-lg bg-signal text-base"
        >
          <Navigation className="size-4" />
        </Link>

        <button
          onClick={() => setOpen(true)}
          aria-label="Buscar"
          className="group cursor-pointer flex items-center gap-2.5 min-w-0 w-full max-w-md px-3 py-2 rounded-lg bg-inset border border-line hover:border-line-strong transition-colors duration-150 text-left"
        >
          <Search className="size-4 shrink-0 text-ink-faint" />
          <span className="flex-1 truncate text-sm text-ink-faint">
            <span className="sm:hidden">Buscar…</span>
            <span className="hidden sm:inline">
              Buscar procedimento, fixo ou aeródromo…
            </span>
          </span>
          <kbd className="hidden sm:block font-mono text-[10px] text-ink-faint border border-line rounded px-1.5 py-0.5">
            ⌘K
          </kbd>
        </button>

        <div className="ml-auto flex items-center gap-2 sm:gap-3 shrink-0">
          {station && (
            <div className="hidden xl:flex items-center gap-3">
              <span className="font-mono text-xs text-ink-dim">{station}</span>
              {frequency && (
                <span className="font-mono text-sm font-medium px-2.5 py-1 rounded bg-signal/11 text-signal">
                  {frequency}
                </span>
              )}
            </div>
          )}
          <ThemeToggle />
          <IvaoStatus
            availableIcaos={availableIcaos}
            currentIcao={currentIcao}
          />
        </div>
      </header>

      <CommandPalette entries={entries} open={open} onOpenChange={setOpen} />
    </>
  );
}
