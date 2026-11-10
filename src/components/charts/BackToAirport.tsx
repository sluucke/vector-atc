import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Tooltip from "@/components/ui/Tooltip";

/** Returns to the aerodrome briefing, where the full chart listing lives. */
export default function BackToAirport({
  icao,
  label,
}: {
  icao: string;
  label?: string;
}) {
  return (
    <Tooltip label="Voltar para a listagem de cartas do aeródromo">
    <Link
      href={`/${icao.toLowerCase()}`}
      className="flex items-center gap-1.5 shrink-0 px-2 py-1 rounded-md text-ink-dim hover:bg-hover hover:text-ink transition-colors duration-150"
    >
      <ArrowLeft className="size-3.5" />
      <span className="font-mono text-[11px]">{label ?? icao}</span>
    </Link>
    </Tooltip>
  );
}
