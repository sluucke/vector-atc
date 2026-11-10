"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 6;

export default function PdfCanvas({
  src,
  zoom,
  rotation = 0,
  onZoomChange,
}: {
  src: string;
  zoom: number;
  /** Degrees clockwise; pdf.js rotates the page itself, keeping it crisp. */
  rotation?: number;
  onZoomChange: (zoom: number) => void;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const docRef = useRef<PDFDocumentProxy | null>(null);
  const taskRef = useRef<RenderTask | null>(null);

  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );

  // Load the document whenever the chart changes.
  useEffect(() => {
    let cancelled = false;
    const task = pdfjs.getDocument({ url: src });

    task.promise.then(
      (doc) => {
        if (cancelled) return;
        docRef.current = doc;
        setOffset({ x: 0, y: 0 });
        setStatus("ready");
      },
      () => {
        if (!cancelled) setStatus("error");
      }
    );

    return () => {
      cancelled = true;
      task.destroy();
      docRef.current = null;
    };
  }, [src]);

  const render = useCallback(async () => {
    const doc = docRef.current;
    const canvas = canvasRef.current;
    const viewport = viewportRef.current;
    if (!doc || !canvas || !viewport) return;

    const page = await doc.getPage(1);
    const base = page.getViewport({ scale: 1, rotation });
    const fit = Math.min(
      viewport.clientWidth / base.width,
      viewport.clientHeight / base.height
    );

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const scaled = page.getViewport({ scale: fit * zoom, rotation });

    taskRef.current?.cancel();
    canvas.width = Math.floor(scaled.width * dpr);
    canvas.height = Math.floor(scaled.height * dpr);
    canvas.style.width = `${scaled.width}px`;
    canvas.style.height = `${scaled.height}px`;

    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    const task = page.render({ canvas, canvasContext: context, viewport: scaled });
    taskRef.current = task;
    try {
      await task.promise;
    } catch {
      // Cancelled by a newer render — expected while zooming.
    }
  }, [zoom, rotation]);

  useEffect(() => {
    if (status === "ready") void render();
  }, [status, render]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(() => void render());
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [render]);

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    setOffset((o) => ({ x: o.x + e.movementX, y: o.y + e.movementY }));
  }

  function onPointerUp(e: React.PointerEvent) {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDragging(false);
  }

  function onWheel(e: React.WheelEvent) {
    if (e.deltaY === 0) return;
    const next = Math.min(
      MAX_ZOOM,
      Math.max(MIN_ZOOM, zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15))
    );
    onZoomChange(Number(next.toFixed(3)));
  }

  return (
    <div
      ref={viewportRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
      className={`dot-grid relative flex-1 min-h-0 overflow-hidden touch-none ${
        dragging ? "cursor-grabbing" : "cursor-grab"
      }`}
    >
      <div
        className="absolute inset-0 grid place-items-center"
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      >
        <canvas
          ref={canvasRef}
          className="shadow-2xl rounded-sm bg-white select-none"
        />
      </div>

      {status !== "ready" && (
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <p className="font-mono text-xs text-ink-faint">
            {status === "loading" ? "Carregando carta…" : "Falha ao abrir a carta."}
          </p>
        </div>
      )}
    </div>
  );
}
