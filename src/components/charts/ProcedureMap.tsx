"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Marker,
  Popup,
  Tooltip,
  useMap,
} from "react-leaflet";
import L, { type LatLngExpression, type LatLngBoundsExpression } from "leaflet";
import { Frame, Minus, Plus } from "lucide-react";
import "leaflet/dist/leaflet.css";
import { reciprocal } from "@/lib/ops/runway";
import type { AirportGeometry, GeoPoint, Procedure } from "@/lib/types";
import type { AirportTraffic, LiveFlight } from "@/lib/ivao/types";

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
        className={button}
      >
        <Frame className="size-3.5" />
      </button>
    </div>
  );
}

function aircraftIcon(heading: number | null, focused: boolean) {
  const size = focused ? 30 : 22;
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<svg viewBox="0 0 24 24" width="${size}" height="${size}" style="transform: rotate(${
      heading ?? 0
    }deg)${focused ? "; filter: drop-shadow(0 0 5px #22d3ee)" : ""}">
      <path d="M12 2 L14.4 11 L22 14.2 L22 16 L13.6 14.2 L13 20 L15.4 21.6 L15.4 22.6 L12 21.8 L8.6 22.6 L8.6 21.6 L11 20 L10.4 14.2 L2 16 L2 14.2 L9.6 11 Z"
        fill="${focused ? "#22d3ee" : "#e2e8f0"}" stroke="#080d13" stroke-width="0.8" stroke-linejoin="round"/>
    </svg>`,
  });
}

/** Pans to a flight opened from the traffic panel, once its position arrives. */
function FocusFlight({ flight }: { flight: LiveFlight | null }) {
  const map = useMap();
  const lat = flight?.latitude ?? null;
  const lon = flight?.longitude ?? null;

  useEffect(() => {
    if (lat === null || lon === null) return;
    map.setView([lat, lon], Math.max(map.getZoom(), 7));
  }, [map, lat, lon]);

  return null;
}

/** Live aircraft the network says are flying this procedure. */
function useProcedureTraffic(icao: string, procedureId: string) {
  const [flights, setFlights] = useState<LiveFlight[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/ivao/traffic?icao=${icao}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as AirportTraffic;
        const relevant = [...data.arrivals, ...data.departures].filter(
          (flight) =>
            flight.procedure.procedureIds.includes(procedureId) &&
            flight.latitude !== null &&
            flight.longitude !== null
        );
        if (!cancelled) setFlights(relevant);
      } catch {
        // Keep the last known positions rather than clearing the map.
      }
    }

    void poll();
    const timer = setInterval(poll, 20_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [icao, procedureId]);

  return flights;
}

export default function ProcedureMap({
  icao,
  procedure,
  geometry,
  focusCallsign,
}: {
  icao: string;
  procedure: Procedure;
  geometry: AirportGeometry;
  focusCallsign?: string | null;
}) {
  const color = procedure.type === "SID" ? SID_COLOR : STAR_COLOR;
  const flights = useProcedureTraffic(icao, procedure.id);
  const focused =
    flights.find((f) => f.callsign === focusCallsign?.toUpperCase()) ?? null;

  const { paths, runways, aerodrome, bounds } = useMemo(() => {
    const geo = procedure.geometryKey
      ? geometry.procedures[procedure.geometryKey]
      : null;

    // Where the runway "X" physically begins. Coding tables publish either the
    // threshold of X or the departure end of its reciprocal — the same spot —
    // and some aerodromes (SBBR) publish only departure ends.
    const startOf = (rwy: string): GeoPoint | null =>
      geometry.runwayPoints[rwy]?.thr ??
      geometry.runwayPoints[reciprocal(rwy)]?.der ??
      null;

    const runways: [number, number][][] = [];
    const seen = new Set<string>();
    for (const rwy of Object.keys(geometry.runwayPoints)) {
      const key = [rwy, reciprocal(rwy)].sort().join("/");
      if (seen.has(key)) continue;
      seen.add(key);
      const a = startOf(rwy);
      const b = startOf(reciprocal(rwy));
      if (a && b) runways.push([[a.lat, a.lon], [b.lat, b.lon]]);
    }
    const ends = runways.flat();
    const aerodrome: [number, number] | null = ends.length
      ? [
          ends.reduce((s, p) => s + p[0], 0) / ends.length,
          ends.reduce((s, p) => s + p[1], 0) / ends.length,
        ]
      : null;

    /** A leg's fix, or a runway end when the table names one ("RW29R"). */
    const pointOf = (ident: string): GeoPoint | null => {
      const rwy = ident.match(/^RWY?(\d{2}[LRC]?)$/)?.[1];
      return rwy ? startOf(rwy) : (geometry.fixes[ident] ?? null);
    };

    const procedureRunway = procedure.runway.split("/")[0];
    // A departure starts where the runway ends.
    const departureEnd = startOf(reciprocal(procedureRunway));

    const label = (leg: { altitude: string | null; distance: number | null }) =>
      [
        leg.altitude && `${leg.altitude.replace("+", "≥").replace("-", "≤")}ft`,
        leg.distance && `${leg.distance}NM`,
      ]
        .filter(Boolean)
        .join(" · ");

    const resolved = Object.entries(geo?.transitions ?? {}).map(([name, legs]) => ({
      name,
      fixes: legs.flatMap((leg) => {
        const at = leg.fix ? pointOf(leg.fix) : null;
        return at && leg.fix ? [{ ident: leg.fix, ...at, label: label(leg) }] : [];
      }),
    }));
    const common = resolved.find((t) => t.name === "RWY");
    const commonFirst = common?.fixes[0] ?? null;
    const commonLast = common?.fixes[common.fixes.length - 1] ?? null;

    const paths: Plotted[] = [];
    for (const { name, fixes } of resolved) {
      if (fixes.length === 0) continue;
      const isCommon = name === "RWY";
      const points: [number, number][] = fixes.map((f) => [f.lat, f.lon]);

      if (procedure.type === "SID") {
        // The common segment climbs out of the runway; each transition picks
        // up where the common segment ends.
        if (isCommon && departureEnd) points.unshift([departureEnd.lat, departureEnd.lon]);
        if (!isCommon && commonLast && fixes[0].ident !== commonLast.ident) {
          points.unshift([commonLast.lat, commonLast.lon]);
        }
      } else if (!isCommon && commonFirst && fixes[fixes.length - 1].ident !== commonFirst.ident) {
        // An arrival's transitions feed the common segment.
        points.push([commonFirst.lat, commonFirst.lon]);
      }

      paths.push({ name, points, fixes, common: isCommon });
    }

    const all = [...paths.flatMap((p) => p.points as [number, number][]), ...ends];
    return {
      paths,
      runways,
      aerodrome,
      bounds: all.length > 0 ? (all as LatLngBoundsExpression) : null,
    };
  }, [procedure, geometry]);

  const center: LatLngExpression = aerodrome ?? [0, 0];

  if (paths.length === 0) {
    return (
      <div className="dot-grid flex-1 min-h-0 grid place-items-center">
        <p className="max-w-xs text-center text-xs text-ink-faint leading-relaxed">
          Este procedimento não tem rota codificada disponível. Use a carta
          original.
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

        {runways.map((line, i) => (
          <Polyline
            key={i}
            positions={line}
            pathOptions={{ color: "#e2e8f0", weight: 6, opacity: 0.95, lineCap: "butt" }}
          />
        ))}

        {aerodrome && (
          <CircleMarker
            center={aerodrome}
            radius={14}
            pathOptions={{ color: "#e2e8f0", weight: 1.5, opacity: 0.7, fillOpacity: 0.06 }}
          >
            <Tooltip
              permanent
              direction="bottom"
              offset={[0, 14]}
              className="!bg-raised !border-0 !text-ink !font-mono !text-[11px] !font-semibold !shadow-lg !px-1.5 !py-0.5"
            >
              {icao}
            </Tooltip>
          </CircleMarker>
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

        {flights.map((flight) => (
          <Marker
            key={flight.callsign}
            position={[flight.latitude as number, flight.longitude as number]}
            icon={aircraftIcon(
              flight.heading,
              flight.callsign === focused?.callsign
            )}
          >
            <Tooltip
              permanent
              direction="top"
              offset={[0, -10]}
              className="!bg-raised !border-0 !text-ink !font-mono !text-[10px] !shadow-lg !px-1.5 !py-0.5"
            >
              {flight.callsign}
            </Tooltip>
            <Popup>
              <div className="font-mono text-[11px] leading-relaxed">
                <p className="font-semibold text-[12px]">{flight.callsign}</p>
                <p>
                  {flight.aircraftIcao ?? "—"} · {flight.departure ?? "????"} →{" "}
                  {flight.destination ?? "????"}
                </p>
                <p>
                  {flight.altitude !== null && `${flight.altitude} ft`}
                  {flight.groundSpeed !== null && ` · ${flight.groundSpeed} kt`}
                  {flight.heading !== null && ` · ${flight.heading}°`}
                </p>
                <p>
                  {flight.state ?? "—"}
                  {flight.flightLevel ? ` · ${flight.flightLevel}` : ""}
                </p>
                <p className="italic">
                  {flight.procedure.confidence === "confirmed"
                    ? `${procedure.name} declarada no plano`
                    : `${procedure.name} inferida por ${flight.procedure.fix}`}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}

        <FocusFlight flight={focused} />
        <MapControls bounds={bounds} />
      </MapContainer>

      {flights.length > 0 && (
        <p className="absolute top-2 right-2 z-[400] font-mono text-[10px] px-2 py-1 rounded bg-raised/90 border border-line text-ink-dim">
          {flights.length} na rede
        </p>
      )}

      <p className="absolute bottom-1 right-2 z-[400] font-mono text-[9px] text-ink-faint/70">
        Esri · HERE · Garmin · © OpenStreetMap
      </p>
    </div>
  );
}
