"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { IvaoSessionView } from "@/lib/ivao/types";

const POLL_MS = 30_000;

const SessionContext = createContext<IvaoSessionView | null>(null);

/** One poll for the whole app — the header and the chart browser both read it. */
export function IvaoSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, setSession] = useState<IvaoSessionView | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/ivao/session", { cache: "no-store" });
        const data = (await res.json()) as IvaoSessionView;
        if (!cancelled) setSession(data);
      } catch {
        if (!cancelled)
          setSession({
            connected: false,
            vid: null,
            name: null,
            online: false,
            controller: null,
            error: "unreachable",
          });
      }
    }

    void poll();
    const timer = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <SessionContext.Provider value={session}>{children}</SessionContext.Provider>
  );
}

export function useIvaoSession(): IvaoSessionView | null {
  return useContext(SessionContext);
}
