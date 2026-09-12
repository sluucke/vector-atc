"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Navigation,
  LayoutGrid,
  PlaneTakeoff,
  PlaneLanding,
  ExternalLink,
  Building2,
  Eye,
  ParkingSquare,
  FileText,
} from "lucide-react";
import { useAirportContext } from "./AirportContextProvider";
import { CATEGORY_LABELS } from "@/lib/chart-relevance";
import type { AirportMeta } from "@/lib/types";

const CATEGORY_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  SID: PlaneTakeoff,
  STAR: PlaneLanding,
  IAC: PlaneLanding,
  ADC: Building2,
  VAC: Eye,
  PDC: ParkingSquare,
};

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
          : "text-ink-dim hover:bg-hover hover:text-ink"
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
  categories = [],
}: {
  airports: AirportMeta[];
  activeIcao?: string;
  /** Chart categories the active aerodrome actually publishes. */
  categories?: { type: string; count: number }[];
}) {
  const pathname = usePathname();
  const active = airports.find((a) => a.icao === activeIcao);
  // One filter for the whole console: what the browser hides, this hides too.
  const { categories: shown } = useAirportContext();

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
            VECTOR ATC
          </span>
          <span className="block font-mono text-[10px] text-ink-faint">
            HELPER · IVAO
          </span>
        </span>
      </Link>

      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        <SectionLabel>Workspace</SectionLabel>
        {/* One entry, not a list: the sidebar belongs to the aerodrome being
            worked, and switching happens from the front page. */}
        <NavItem
          href="/"
          icon={LayoutGrid}
          label="Aeródromo"
          badge={active?.icao ?? String(airports.length)}
          active={pathname === "/"}
        />

        {active && categories.length > 0 && (
          <>
            <SectionLabel>{active.icao} · Cartas</SectionLabel>
            {categories
              .filter(({ type }) => shown.includes(type))
              .map(({ type, count }) => (
                <NavItem
                  key={type}
                  href={`/${active.icao.toLowerCase()}#${type.toLowerCase()}`}
                  icon={CATEGORY_ICONS[type] ?? FileText}
                  label={`${CATEGORY_LABELS[type] ?? type} (${type})`}
                  badge={String(count)}
                  active={false}
                />
              ))}
          </>
        )}
      </nav>

      <div className="shrink-0 border-t border-line p-3 space-y-3">
        {active && (
          <div className="rounded-lg bg-hover-soft border border-line p-3">
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
        <a
          href="https://aerostudy-theduckcorp.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-ink-faint hover:text-ink-dim transition-colors duration-150"
        >
          <ExternalLink className="size-3.5" />
          Estude ADC: AeroStudy
        </a>
        <p className="px-3 font-mono text-[10px] text-ink-faint">
          por The Duck Corporation
        </p>
      </div>
    </aside>
  );
}
