"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Radio, LogOut, TriangleAlert } from "lucide-react";
import { POSITION_LABELS } from "@/lib/ivao/callsign";
import { useIvaoSession } from "./IvaoSessionProvider";

export default function IvaoStatus({
  availableIcaos,
  currentIcao,
}: {
  availableIcaos: string[];
  currentIcao?: string;
}) {
  const router = useRouter();
  const session = useIvaoSession();
  const autoSwitched = useRef<string | null>(null);

  // Follow the controller onto the aerodrome they're working, but only once per
  // position — so manual navigation afterwards isn't yanked back.
  useEffect(() => {
    const airport = session?.controller?.airport;
    const callsign = session?.controller?.callsign;
    if (!airport || !callsign) return;
    if (autoSwitched.current === callsign) return;
    if (!availableIcaos.includes(airport)) return;
    if (currentIcao === airport) {
      autoSwitched.current = callsign;
      return;
    }
    autoSwitched.current = callsign;
    router.push(`/${airport.toLowerCase()}`);
  }, [session, availableIcaos, currentIcao, router]);

  if (!session || session.error === "not_configured") return null;

  if (!session.connected) {
    return (
      <button
        onClick={() => {
          // Not a Next.js page: this route handler 302s to IVAO's SSO, so it
          // needs a document navigation rather than a client-side push.
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.href = "/api/ivao/login";
        }}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-signal/11 text-signal hover:bg-signal/20 transition-colors duration-150"
      >
        <Radio className="size-3.5" />
        <span className="font-mono text-[11px] font-medium">Conectar IVAO</span>
      </button>
    );
  }

  const controller = session.controller;
  const dotClass = controller
    ? "bg-ok shadow-[0_0_6px_var(--color-ok)]"
    : session.error
      ? "bg-warn"
      : "bg-ink-faint";

  return (
    <div className="flex items-center gap-2.5">
      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-line">
        <span className={`size-1.5 rounded-full shrink-0 ${dotClass}`} />
        {controller ? (
          <span className="leading-tight">
            <span className="block font-mono text-[11px] font-medium text-ok">
              {controller.callsign}
            </span>
            <span className="block font-mono text-[9px] text-ink-faint">
              {POSITION_LABELS[controller.position] ?? controller.position}
              {controller.frequency
                ? ` · ${controller.frequency.toFixed(3)}`
                : ""}
            </span>
          </span>
        ) : (
          <span className="leading-tight">
            <span className="block font-mono text-[11px] text-ink-dim">
              {session.error ? "IVAO indisponível" : "Não controlando"}
            </span>
            <span className="block font-mono text-[9px] text-ink-faint">
              VID {session.vid}
              {session.online ? " · voando" : ""}
            </span>
          </span>
        )}
        {session.error && <TriangleAlert className="size-3.5 text-warn" />}
      </div>

      <button
        onClick={async () => {
          await fetch("/api/ivao/logout", { method: "POST" });
          router.refresh();
        }}
        aria-label="Desconectar IVAO"
        title="Desconectar IVAO"
        className="grid place-items-center size-7 rounded-md text-ink-faint hover:bg-white/[0.06] hover:text-ink transition-colors duration-150"
      >
        <LogOut className="size-3.5" />
      </button>
    </div>
  );
}
