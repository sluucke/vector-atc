"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import CommandPalette from "./CommandPalette";
import IvaoStatus from "./IvaoStatus";
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
      <header className="h-16 shrink-0 flex items-center gap-4 px-4 bg-panel border-b border-line">
        <button
          onClick={() => setOpen(true)}
          className="group flex items-center gap-2.5 w-full max-w-md px-3 py-2 rounded-lg bg-inset border border-line hover:border-line-strong transition-colors duration-150 text-left"
        >
          <Search className="size-4 text-ink-faint" />
          <span className="flex-1 text-sm text-ink-faint">
            Buscar procedimento, fixo ou aeródromo…
          </span>
          <kbd className="font-mono text-[10px] text-ink-faint border border-line rounded px-1.5 py-0.5">
            ⌘K
          </kbd>
        </button>

        <div className="ml-auto flex items-center gap-3 shrink-0">
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
