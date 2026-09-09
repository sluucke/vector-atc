"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Fuse from "fuse.js";
import { PlaneTakeoff, PlaneLanding, Search, CornerDownLeft } from "lucide-react";
import type { SearchEntry } from "@/lib/content";

export default function CommandPalette({
  entries,
  open,
  onOpenChange,
}: {
  entries: SearchEntry[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  // Mounting the dialog only while open keeps its query/cursor state fresh
  // on every reopen without resetting it from an effect.
  if (!open) return null;
  return (
    <PaletteDialog entries={entries} onClose={() => onOpenChange(false)} />
  );
}

function PaletteDialog({
  entries,
  onClose,
}: {
  entries: SearchEntry[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);

  const fuse = useMemo(
    () =>
      new Fuse(entries, {
        keys: [
          { name: "name", weight: 3 },
          { name: "fixes", weight: 2 },
          { name: "icao", weight: 2 },
          { name: "type", weight: 1 },
        ],
        threshold: 0.3,
        ignoreLocation: true,
      }),
    [entries]
  );

  const results = useMemo(() => {
    if (!query.trim()) return entries.slice(0, 8);
    return fuse
      .search(query)
      .slice(0, 12)
      .map((r) => r.item);
  }, [query, fuse, entries]);

  // Escape must work wherever focus ended up — clicking a result or the list
  // moves it off the input, and a handler bound there would never fire.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function go(entry: SearchEntry) {
    router.push(entry.href);
    onClose();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter" && results[cursor]) {
      e.preventDefault();
      go(results[cursor]);
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px] flex items-start justify-center pt-[12vh] px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-xl bg-raised border border-line-strong shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 border-b border-line">
          <Search className="size-4 text-ink-faint shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Buscar procedimento, fixo ou aeródromo…"
            className="flex-1 bg-transparent py-3.5 text-sm outline-none placeholder:text-ink-faint"
          />
          <kbd className="font-mono text-[10px] text-ink-faint border border-line rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto py-1.5">
          {results.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-ink-faint">
              Nenhum resultado para “{query}”.
            </p>
          )}
          {results.map((entry, i) => {
            const Icon = entry.type === "SID" ? PlaneTakeoff : PlaneLanding;
            return (
              <button
                key={`${entry.icao}-${entry.id}`}
                onMouseEnter={() => setCursor(i)}
                onClick={() => go(entry)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150 ${
                  i === cursor ? "bg-signal/11" : ""
                }`}
              >
                <Icon
                  className={`size-4 shrink-0 ${
                    entry.type === "SID" ? "text-signal" : "text-warn"
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm truncate">
                    <span className="font-mono font-medium">{entry.name}</span>
                    <span className="text-ink-faint"> · RWY {entry.runway}</span>
                  </span>
                  {entry.fixes.length > 0 && (
                    <span className="block font-mono text-[10px] text-ink-faint truncate">
                      {entry.fixes.join(" · ")}
                    </span>
                  )}
                </span>
                <span className="font-mono text-[10px] text-ink-faint shrink-0">
                  {entry.icao}
                </span>
                {i === cursor && (
                  <CornerDownLeft className="size-3.5 text-ink-faint shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
