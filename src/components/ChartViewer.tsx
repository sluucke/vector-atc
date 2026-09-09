"use client";

import { useRef, useState } from "react";
import { Minus, Plus, RotateCcw, Maximize2, ExternalLink } from "lucide-react";

const STEPS = [65, 80, 100, 130, 160, 190, 220];
const DEFAULT_STEP = 2;

export default function ChartViewer({
  src,
  title,
}: {
  src: string;
  title: string;
}) {
  const [step, setStep] = useState(DEFAULT_STEP);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoom = STEPS[step];

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current?.requestFullscreen();
    }
  }

  return (
    <div ref={containerRef} className="flex-1 flex flex-col min-w-0 bg-content">
      <div className="h-11 shrink-0 flex items-center gap-1 px-3 border-b border-line bg-panel">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          aria-label="Reduzir zoom"
          className="grid place-items-center size-7 rounded-md text-ink-dim hover:bg-white/[0.06] hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent transition-colors duration-150"
        >
          <Minus className="size-4" />
        </button>
        <span className="font-mono text-xs text-ink-dim w-12 text-center tabular-nums">
          {zoom}%
        </span>
        <button
          onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
          disabled={step === STEPS.length - 1}
          aria-label="Aumentar zoom"
          className="grid place-items-center size-7 rounded-md text-ink-dim hover:bg-white/[0.06] hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent transition-colors duration-150"
        >
          <Plus className="size-4" />
        </button>

        <span className="w-px h-4 bg-line mx-1.5" />

        <button
          onClick={() => setStep(DEFAULT_STEP)}
          aria-label="Restaurar zoom"
          className="grid place-items-center size-7 rounded-md text-ink-dim hover:bg-white/[0.06] hover:text-ink transition-colors duration-150"
        >
          <RotateCcw className="size-3.5" />
        </button>
        <button
          onClick={toggleFullscreen}
          aria-label="Tela cheia"
          className="grid place-items-center size-7 rounded-md text-ink-dim hover:bg-white/[0.06] hover:text-ink transition-colors duration-150"
        >
          <Maximize2 className="size-3.5" />
        </button>

        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs text-ink-dim hover:bg-white/[0.06] hover:text-ink transition-colors duration-150"
        >
          <ExternalLink className="size-3.5" />
          Abrir PDF
        </a>
      </div>

      <div className="dot-grid flex-1 min-h-0 p-3">
        <iframe
          key={zoom}
          src={`${src}#zoom=${zoom}&toolbar=0&navpanes=0`}
          title={title}
          className="w-full h-full rounded-lg border border-line bg-raised"
        />
      </div>
    </div>
  );
}
