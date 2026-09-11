/**
 * Two whazzup snapshots a minute apart. For every en-route flight over Brazil,
 * the true track is the bearing between the two positions; comparing it with
 * the reported heading says whether that heading is true or magnetic, since
 * Brazilian variation is around 20°W.
 */
const URL = "https://api.ivao.aero/v2/tracker/whazzup";
const GAP_MS = 90_000;

const snapshot = async () => {
  const res = await fetch(URL, {
    headers: { "user-agent": "vector-atc-charts/1.0" },
  });
  const body = await res.json();
  const map = new Map();
  for (const pilot of body.clients.pilots) {
    const t = pilot.lastTrack;
    if (!t || t.onGround || t.state !== "En Route") continue;
    if (t.groundSpeed < 250) continue;
    // Brazil, roughly.
    if (t.latitude > 6 || t.latitude < -34) continue;
    if (t.longitude > -34 || t.longitude < -74) continue;
    map.set(pilot.callsign, t);
  }
  return map;
};

const toRad = Math.PI / 180;
function bearing(a, b) {
  const dLon = (b.longitude - a.longitude) * toRad;
  const l1 = a.latitude * toRad;
  const l2 = b.latitude * toRad;
  const y = Math.sin(dLon) * Math.cos(l2);
  const x =
    Math.cos(l1) * Math.sin(l2) - Math.sin(l1) * Math.cos(l2) * Math.cos(dLon);
  return (Math.atan2(y, x) / toRad + 360) % 360;
}

const first = await snapshot();
console.log(`primeira amostra: ${first.size} voos em rota sobre o Brasil`);
await new Promise((r) => setTimeout(r, GAP_MS));
const second = await snapshot();

const offsets = [];
for (const [callsign, a] of first) {
  const b = second.get(callsign);
  if (!b) continue;
  const moved = Math.hypot(b.latitude - a.latitude, b.longitude - a.longitude);
  if (moved < 0.05) continue;
  const track = bearing(a, b);
  const diff = ((b.heading - track + 540) % 360) - 180;
  if (Math.abs(diff) > 60) continue;
  offsets.push({ callsign, track: track.toFixed(0), heading: b.heading, diff });
}

offsets.sort((x, y) => x.diff - y.diff);
for (const o of offsets) {
  console.log(
    `${o.callsign.padEnd(8)} track ${String(o.track).padStart(3)}  heading ${String(o.heading).padStart(3)}  diff ${o.diff.toFixed(1)}`
  );
}

const median = offsets.length
  ? offsets[Math.floor(offsets.length / 2)].diff
  : null;
const mean = offsets.length
  ? offsets.reduce((s, o) => s + o.diff, 0) / offsets.length
  : null;
console.log(
  `\n${offsets.length} voos comparados · mediana ${median?.toFixed(1)}° · média ${mean?.toFixed(1)}°`
);
console.log(
  "Perto de 0 significa rumo verdadeiro; perto de +20 significa rumo magnético."
);
