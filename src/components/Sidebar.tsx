"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Navigation,
  LayoutGrid,
  PlaneTakeoff,
  PlaneLanding,
  Radio,
  ExternalLink,
} from "lucide-react";
import type { AirportMeta } from "@/lib/types";

function NavItem({
  href,
  icon: Icon,
  label,
  badge,
  active,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150 ${
        active
          ? "bg-signal/11 text-signal"
          : "text-ink-dim hover:bg-white/[0.04] hover:text-ink"
      }`}
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{label}</span>
      {badge && (
        <span className="ml-auto font-mono text-[10px] text-ink-faint">
          {badge}
        </span>
      )}
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pt-5 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
      {children}
    </p>
  );
}

export default function Sidebar({
  airports,
  activeIcao,
}: {
  airports: AirportMeta[];
  activeIcao?: string;
}) {
  const pathname = usePathname();
  const active = airports.find((a) => a.icao === activeIcao);

  return (
    <aside className="w-60 shrink-0 hidden lg:flex flex-col bg-panel border-r border-line">
      <Link
        href="/"
        className="flex items-center gap-2.5 h-16 px-4 border-b border-line shrink-0"
      >
        <span className="grid place-items-center size-8 rounded-lg bg-signal text-base">
          <Navigation className="size-4" />
        </span>
        <span className="leading-tight">
          <span className="block text-sm font-semibold tracking-wide">
            VECTOR
          </span>
          <span className="block font-mono text-[10px] text-ink-faint">
            CHARTS · IVAO
          </span>
        </span>
      </Link>

      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        <SectionLabel>Workspace</SectionLabel>
        <NavItem
          href="/"
          icon={LayoutGrid}
          label="Aeródromos"
          badge={String(airports.length)}
          active={pathname === "/"}
        />
        {airports.map((a) => (
          <NavItem
            key={a.icao}
            href={`/${a.icao.toLowerCase()}`}
            icon={Radio}
            label={a.icao}
            badge={a.fir.split(" ")[0]}
            active={pathname.startsWith(`/${a.icao.toLowerCase()}`)}
          />
        ))}

        {active && (
          <>
            <SectionLabel>{active.icao} · Procedimentos</SectionLabel>
            <NavItem
              href={`/${active.icao.toLowerCase()}#sid`}
              icon={PlaneTakeoff}
              label="Saídas (SID)"
              active={false}
            />
            <NavItem
              href={`/${active.icao.toLowerCase()}#star`}
              icon={PlaneLanding}
              label="Chegadas (STAR)"
              active={false}
            />
          </>
        )}
      </nav>

      <div className="shrink-0 border-t border-line p-3 space-y-3">
        {active && (
          <div className="rounded-lg bg-white/[0.03] border border-line p-3">
            <div className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-ok shadow-[0_0_6px_var(--color-ok)]" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                AIRAC vigente
              </span>
            </div>
            <p className="mt-1.5 font-mono text-xs text-ink">
              {active.airac.cycle}
            </p>
            <p className="font-mono text-[10px] text-ink-faint">
              efetivo {active.airac.effective}
            </p>
          </div>
        )}
        <a
          href="https://aisweb.decea.mil.br"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-ink-faint hover:text-ink-dim transition-colors duration-150"
        >
          <ExternalLink className="size-3.5" />
          Fonte: AISWEB / DECEA
        </a>
      </div>
    </aside>
  );
}
