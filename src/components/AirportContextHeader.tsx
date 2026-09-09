import Link from "next/link";
import { MapPin } from "lucide-react";
import RunwaySelect from "./RunwaySelect";
import type { AirportMeta } from "@/lib/types";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="hidden lg:flex flex-col leading-tight">
      <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
        {label}
      </span>
      <span className="font-mono text-xs text-ink-dim">{value}</span>
    </span>
  );
}

export default function AirportContextHeader({ meta }: { meta: AirportMeta }) {
  return (
    <div className="shrink-0 flex items-center gap-5 h-14 px-4 bg-content border-b border-line">
      <Link
        href={`/${meta.icao.toLowerCase()}`}
        className="flex items-center gap-3 min-w-0"
      >
        <span className="font-mono text-xl font-semibold tracking-tight">
          {meta.icao}
        </span>
        <span className="hidden md:block text-sm text-ink-dim truncate max-w-xs">
          {meta.name}
        </span>
      </Link>

      <RunwaySelect runways={meta.runways} />

      <div className="ml-auto flex items-center gap-6">
        <Stat label="AD ELEV" value={meta.elevation} />
        <Stat label="TA" value={meta.ta} />
        <Stat label="MSA" value={meta.msa} />
        <span className="hidden xl:flex items-center gap-1.5 text-ink-faint">
          <MapPin className="size-3.5" />
          <span className="font-mono text-xs">{meta.fir}</span>
        </span>
      </div>
    </div>
  );
}
