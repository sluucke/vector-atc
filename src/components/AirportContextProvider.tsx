"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { useIvaoSession } from "./IvaoSessionProvider";
import { relevantCategories } from "@/lib/chart-relevance";
import type { AirportDynamicContext } from "@/app/api/airport/[icao]/route";

const POLL_MS = 60_000;

interface AirportContextValue {
  data: AirportDynamicContext | null;
  error: boolean;
  /** Primary runway — detected, or the controller's override. */
  runway: string | null;
  /** Every runway in use; an override narrows this to the chosen one. */
  runways: string[];
  /** True while following automatic detection. */
  auto: boolean;
  setRunway: (runway: string | null) => void;
  /** Hide procedures that do not serve the runway in use. */
  onlyActiveRunway: boolean;
  setOnlyActiveRunway: (only: boolean) => void;
  /** Chart categories on show, everywhere at once. */
  categories: string[];
  /** True while following the suggestion for the position being worked. */
  categoriesAuto: boolean;
  toggleCategory: (category: string) => void;
  /** Back to the suggestion, or to everything the aerodrome publishes. */
  resetCategories: () => void;
}

const Ctx = createContext<AirportContextValue>({
  data: null,
  error: false,
  runway: null,
  runways: [],
  auto: true,
  setRunway: () => {},
  onlyActiveRunway: false,
  setOnlyActiveRunway: () => {},
  categories: [],
  categoriesAuto: false,
  toggleCategory: () => {},
  resetCategories: () => {},
});

/**
 * The manual runway choice lives in localStorage so it survives navigation.
 * Reading it through an external store keeps it out of an effect and gives
 * the server a defined snapshot (no override) to render against.
 */
function createRunwayStore(icao: string) {
  const key = `vector:runway:${icao}`;
  const listeners = new Set<() => void>();
  let cached: string | null = null;
  let loaded = false;

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    get(): string | null {
      if (!loaded) {
        try {
          cached = window.localStorage.getItem(key);
        } catch {
          cached = null;
        }
        loaded = true;
      }
      return cached;
    },
    getServer(): string | null {
      return null;
    },
    set(runway: string | null) {
      cached = runway;
      loaded = true;
      try {
        if (runway) window.localStorage.setItem(key, runway);
        else window.localStorage.removeItem(key);
      } catch {
        // Non-fatal: the choice just won't survive a reload.
      }
      listeners.forEach((listener) => listener());
    },
  };
}

export function AirportContextProvider({
  icao,
  availableCategories,
  children,
}: {
  icao: string;
  /** Categories this aerodrome actually publishes, in display order. */
  availableCategories: string[];
  children: React.ReactNode;
}) {
  const [onlyActiveRunway, setOnlyActiveRunway] = useState(false);
  const [manualCategories, setManualCategories] = useState<string[] | null>(
    null
  );
  const session = useIvaoSession();
  const [data, setData] = useState<AirportDynamicContext | null>(null);
  const [error, setError] = useState(false);

  const store = useMemo(() => createRunwayStore(icao), [icao]);
  const override = useSyncExternalStore(
    store.subscribe,
    store.get,
    store.getServer
  );

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/airport/${icao}`, { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const body = (await res.json()) as AirportDynamicContext;
        if (!cancelled) {
          setData(body);
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    }

    void poll();
    const timer = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [icao]);

  // The position being worked suggests a starting set; a manual choice replaces
  // it. Resolving it here is what lets the sidebar and the briefing agree.
  const autoCategories = useMemo(() => {
    const suggested = relevantCategories(session?.controller?.position);
    if (!suggested) return null;
    const usable = suggested.filter((c) => availableCategories.includes(c));
    return usable.length > 0 ? usable : null;
  }, [session, availableCategories]);

  const categories =
    manualCategories ?? autoCategories ?? availableCategories;

  const value = useMemo<AirportContextValue>(
    () => ({
      data,
      error,
      runway: override ?? data?.runwayInUse.runway ?? null,
      // Choosing a runway by hand means exactly that one is in use.
      runways: override ? [override] : (data?.runwayInUse.runways ?? []),
      auto: override === null,
      setRunway: store.set,
      onlyActiveRunway,
      setOnlyActiveRunway,
      categories,
      categoriesAuto: manualCategories === null && autoCategories !== null,
      toggleCategory: (category: string) => {
        const next = categories.includes(category)
          ? categories.filter((c) => c !== category)
          : availableCategories.filter(
              (c) => categories.includes(c) || c === category
            );
        // Emptying the filter would hide everything, so the last one clicked
        // becomes the only one shown.
        setManualCategories(next.length > 0 ? next : [category]);
      },
      resetCategories: () => setManualCategories(null),
    }),
    [
      data,
      error,
      override,
      store,
      onlyActiveRunway,
      categories,
      manualCategories,
      autoCategories,
      availableCategories,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAirportContext(): AirportContextValue {
  return useContext(Ctx);
}
