"use client";

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Tooltip,
  useMap,
} from "react-leaflet";
import type { LatLngExpression, LatLngBoundsExpression } from "leaflet";
import { Frame, Minus, Plus } from "lucide-react";
import "leaflet/dist/leaflet.css";
import type { AirportGeometry, Procedure } from "@/lib/types";

const SID_COLOR = "#22d3ee";
const STAR_COLOR = "#fbbf24";

interface Plotted {
  name: string;
  points: LatLngExpression[];
  fixes: { ident: string; lat: number; lon: number; label?: string }[];
  common: boolean;
}

/** Path-construction points (SV021, SV061…) aren't spoken on frequency. */
const isNamedFix = (ident: string) => !/^[A-Z]{2}\d{3}$/.test(ident);

function FitBounds({ bounds }: { bounds: LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    // The map mounts inside a flex pane, so its size isn't final on init.
    map.invalidateSize();
    if (bounds) map.fitBounds(bounds, { padding: [48, 48] });
  }, [map, bounds]);
  return null;
}

function MapControls({ bounds }: { bounds: LatLngBoundsExpression | null }) {
  const map = useMap();
  const button =
    "grid place-items-center size-7 rounded-md bg-raised/90 border border-line text-ink-dim hover:text-ink hover:border-line-strong transition-colors duration-150";

  return (
    <div className="absolute left-3 bottom-3 z-[400] flex flex-col gap-1">
      <button
        onClick={() => map.zoomIn()}
        aria-label="Aproximar"
        className={button}
      >
        <Plus className="size-4" />
      </button>
      <button
        onClick={() => map.zoomOut()}
        aria-label="Afastar"
        className={button}
      >
        <Minus className="size-4" />
      </button>
      <button
        onClick={() => bounds && map.fitBounds(bounds, { padding: [48, 48] })}
        aria-label="Enquadrar procedimento"
        title="Enquadrar procedimento"
        className={button}
      >
        <Frame className="size-3.5" />
      </button>
    </div>
  );
}

export default function ProcedureMap({
  procedure,
  geometry,
}: {
  procedure: Procedure;
  geometry: AirportGeometry;
}) {
  const color = procedure.type === "SID" ? SID_COLOR : STAR_COLOR;

  const { paths, runway, bounds } = useMemo(() => {
    const geo = procedure.geometryKey
      ? geometry.procedures[procedure.geometryKey]
      : null;

    const runwayEnds = Object.entries(geometry.runwayPoints)
      .filter(([ident]) => ident !== "17" && ident !== "35")
      .map(([, p]) => p.thr)
      .filter((p): p is NonNullable<typeof p> => Boolean(p));

    const start = geometry.runwayPoints[procedure.runway]?.thr;
    const paths: Plotted[] = [];

    for (const [name, legs] of Object.entries(geo?.transitions ?? {})) {
      const fixes = legs
        .filter((leg) => leg.fix && geometry.fixes[leg.fix])
        .map((leg) => ({
          ident: leg.fix as string,
          ...geometry.fixes[leg.fix as string],
          label: [
            leg.altitude && `${leg.altitude.replace("+", "≥").replace("-", "≤")}ft`,
            leg.distance && `${leg.distance}NM`,
          ]
            .filter(Boolean)
            .join(" · "),
        }));
      if (fixes.length === 0) continue;

      const common = name === "RWY";
      const legPoints = fixes.map((f) => [f.lat, f.lon] as [number, number]);
      // A SID's first leg climbs on runway heading with no coded fix, so the
      // line only makes sense if it starts at the threshold.
      const points: LatLngExpression[] =
        common && procedure.type === "SID" && start
          ? [[start.lat, start.lon] as [number, number], ...legPoints]
          : legPoints;

      paths.push({ name, points, fixes, common });
    }

    const all = paths.flatMap((p) => p.points as [number, number][]);
    const runwayLine =
      runwayEnds.length === 2
        ? (runwayEnds.map((p) => [p.lat, p.lon]) as [number, number][])
        : null;

    return {
      paths,
      runway: runwayLine,
      bounds: all.length > 0 ? (all as LatLngBoundsExpression) : null,
    };
  }, [procedure, geometry]);

  const center: LatLngExpression = runway
    ? [(runway[0][0] + runway[1][0]) / 2, (runway[0][1] + runway[1][1]) / 2]
    : [0, 0];

  if (paths.length === 0) {
    return (
      <div className="dot-grid flex-1 min-h-0 grid place-items-center">
        <p className="max-w-xs text-center text-xs text-ink-faint leading-relaxed">
          Este procedimento não possui coding table publicada pelo DECEA, então
          não há geometria codificada para plotar. Use a carta original.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 relative">
      <MapContainer
        center={center}
        zoom={8}
        className="absolute inset-0 bg-canvas"
        zoomControl={false}
        attributionControl={false}
        // Leaflet fades tiles in from opacity 0 via requestAnimationFrame; the
        // frame never lands when the pane isn't painting, leaving a blank map.
        fadeAnimation={false}
      >
        {/* Esri's dark canvas needs no API key. A commercial launch should move
            to a keyed provider (CARTO/Stadia/MapTiler) — one URL swap. */}
        <TileLayer
          url="https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          attribution="Esri"
        />
        <TileLayer
          url="https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
          attribution="Esri"
        />
        <FitBounds bounds={bounds} />

        {runway && (
          <Polyline
            positions={runway}
            pathOptions={{ color: "#e2e8f0", weight: 5, opacity: 0.9 }}
          />
        )}

        {paths.map((path) => (
          <Polyline
            key={path.name}
            positions={path.points}
            pathOptions={{
              color,
              weight: path.common ? 3 : 2,
              opacity: path.common ? 1 : 0.75,
              dashArray: path.common ? undefined : "6 5",
            }}
          />
        ))}

        {paths.flatMap((path) =>
          path.fixes.map((fix) => {
            const named = isNamedFix(fix.ident);
            return (
              <CircleMarker
                key={`${path.name}-${fix.ident}`}
                center={[fix.lat, fix.lon]}
                radius={named ? 4 : 2.5}
                pathOptions={{
                  color,
                  fillColor: "#0b1118",
                  fillOpacity: 1,
                  weight: named ? 2 : 1.5,
                  opacity: named ? 1 : 0.6,
                }}
              >
                <Tooltip
                  permanent={named}
                  direction="right"
                  offset={[6, 0]}
                  className="!bg-raised !border-0 !text-ink !font-mono !text-[10px] !shadow-lg !px-1.5 !py-0.5"
                >
                  {fix.ident}
                  {fix.label && (
                    <span className="text-ink-faint"> {fix.label}</span>
                  )}
                </Tooltip>
              </CircleMarker>
            );
          })
        )}

        <MapControls bounds={bounds} />
      </MapContainer>

      <p className="absolute bottom-1 right-2 z-[400] font-mono text-[9px] text-ink-faint/70">
        Esri · HERE · Garmin · © OpenStreetMap
      </p>
    </div>
  );
}
