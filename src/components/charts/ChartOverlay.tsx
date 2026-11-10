"use client";

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import * as pdfjs from "pdfjs-dist";
import type { ChartGeoref } from "@/lib/types";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

type Page = ChartGeoref["pages"][number];

/** Longest side of the rendered page, in canvas pixels. */
const RESOLUTION = 4096;

/**
 * Draws a georeferenced chart page under the procedure. The page is rendered
 * once by pdf.js, then placed with a CSS matrix: Leaflet's layer points are
 * linear in Web Mercator at a given zoom, and so is the page's fit, so three
 * corners settle the whole transform, rotation included.
 */
export default function ChartOverlay({
  file,
  page,
  opacity,
}: {
  file: string;
  page: Page & { number: number };
  opacity: number;
}) {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // The opacity slider must not re-render the page, so it travels by ref.
  const opacityRef = useRef(opacity);

  useEffect(() => {
    if (!map.getPane("chart")) {
      // Below the procedure (overlayPane is 400), above the tiles.
      const created = map.createPane("chart");
      created.style.zIndex = "350";
      // White paper on a dark map: the canvas is inverted, and the pane is
      // screened onto the tiles so the (now black) paper drops out, leaving
      // the linework light. The blend has to sit on the pane: it is its own
      // stacking context, so a blend on the canvas would see nothing below.
      created.style.mixBlendMode = "screen";
    }
    const pane = map.getPane("chart") as HTMLElement;

    const canvas = document.createElement("canvas");
    canvas.className = "leaflet-zoom-animated";
    Object.assign(canvas.style, {
      position: "absolute",
      left: "0",
      top: "0",
      width: `${page.width}px`,
      height: `${page.height}px`,
      transformOrigin: "0 0",
      pointerEvents: "none",
      filter: "invert(1) hue-rotate(180deg)",
      opacity: "0",
    });
    pane.appendChild(canvas);
    canvasRef.current = canvas;

    const [a, b, c, d, e, f] = page.affine;
    const corner = (u: number, v: number) =>
      L.CRS.EPSG3857.unproject(L.point(a * u + b * v + c, d * u + e * v + f));
    const corners = [corner(0, 0), corner(page.width, 0), corner(0, page.height)];

    const place = (toPoint: (latlng: L.LatLng) => L.Point) => {
      const [p0, p1, p2] = corners.map(toPoint);
      canvas.style.transform = `matrix(${(p1.x - p0.x) / page.width}, ${(p1.y - p0.y) / page.width}, ${
        (p2.x - p0.x) / page.height
      }, ${(p2.y - p0.y) / page.height}, ${p0.x}, ${p0.y})`;
    };
    const reset = () => place((ll) => map.latLngToLayerPoint(ll));
    const animate = (ev: L.ZoomAnimEvent) => {
      // The same private hook Leaflet's own ImageOverlay animates with.
      const m = map as unknown as {
        _latLngToNewLayerPoint: (ll: L.LatLng, zoom: number, center: L.LatLng) => L.Point;
      };
      place((ll) => m._latLngToNewLayerPoint(ll, ev.zoom, ev.center));
    };
    reset();
    map.on("zoom viewreset", reset);
    map.on("zoomanim", animate);

    let cancelled = false;
    const task = pdfjs.getDocument({ url: file });
    task.promise
      .then(async (doc) => {
        const sheet = await doc.getPage(page.number);
        const scale = RESOLUTION / Math.max(page.width, page.height);
        const viewport = sheet.getViewport({ scale });
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const context = canvas.getContext("2d");
        if (!context || cancelled) return;
        await sheet.render({ canvas, canvasContext: context, viewport }).promise;
        if (cancelled) return;
        canvas.dataset.ready = "1";
        canvas.style.opacity = String(opacityRef.current);
      })
      .catch(() => {
        // A chart that fails to load simply isn't drawn.
      });

    return () => {
      cancelled = true;
      map.off("zoom viewreset", reset);
      map.off("zoomanim", animate);
      void task.destroy();
      canvas.remove();
      if (canvasRef.current === canvas) canvasRef.current = null;
    };
  }, [map, file, page]);

  useEffect(() => {
    opacityRef.current = opacity;
    const canvas = canvasRef.current;
    if (canvas?.dataset.ready) canvas.style.opacity = String(opacity);
  }, [opacity]);

  return null;
}
