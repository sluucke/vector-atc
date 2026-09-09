"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";

/** Short enough to feel instant, long enough not to flicker when passing over. */
const DELAY_MS = 90;

type Placement = "top" | "bottom";

export default function Tooltip({
  label,
  placement = "bottom",
  children,
}: {
  label: React.ReactNode;
  placement?: Placement;
  children: React.ReactNode;
}) {
  const [box, setBox] = useState<{ x: number; y: number } | null>(null);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const timer = useRef<number | undefined>(undefined);

  function show() {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      // Positioned against the viewport and rendered in a portal, so panels
      // with their own overflow can't clip it.
      setBox({
        x: rect.left + rect.width / 2,
        y: placement === "top" ? rect.top - 8 : rect.bottom + 8,
      });
    }, DELAY_MS);
  }

  function hide() {
    window.clearTimeout(timer.current);
    setBox(null);
  }

  return (
    <>
      <span
        ref={anchorRef}
        // over/out rather than enter/leave: React maps these one-to-one, and
        // re-firing while moving across the child is harmless here.
        onMouseOver={show}
        onMouseOut={hide}
        onMouseDown={hide}
        onFocusCapture={show}
        onBlurCapture={hide}
        className="inline-flex"
      >
        {children}
      </span>

      {box &&
        createPortal(
          <span
            role="tooltip"
            style={{
              left: box.x,
              top: box.y,
              transform: `translate(-50%, ${placement === "top" ? "-100%" : "0"})`,
            }}
            className="pointer-events-none fixed z-[1000] max-w-xs rounded-md border border-line-strong bg-raised px-2 py-1 text-[11px] leading-snug text-ink shadow-xl"
          >
            {label}
          </span>,
          document.body
        )}
    </>
  );
}
