"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useTheme } from "@/components/layout/ThemeToggle";

// WebGPU only exists in the browser, and the shader code is large: load it
// after the page is interactive.
const AeroShards = dynamic(() => import("./AeroShards"), { ssr: false });

/**
 * The home page backdrop: a field of glass shards drifting like a formation
 * seen from the cockpit, in the console's signal colour. Browsers without
 * WebGPU, or with it switched off, keep the plain background; the shards
 * follow the reduced-motion setting on their own.
 */
export default function HomeBackground() {
  const theme = useTheme();
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  const light = theme === "light";
  return (
    <div className="pointer-events-none fixed inset-0 opacity-70" aria-hidden>
      <AeroShards
        key={theme}
        lightMode={light}
        shardColor={light ? "#0e7490" : "#22d3ee"}
        accentColor={light ? "#0891b2" : "#67e8f9"}
        placement="right"
        material="glass"
        count={900}
        speed={0.6}
        glow={light ? 0 : 0.3}
        grain={0.04}
        vignette={0.45}
        markers="plus"
        pulseOnClick={false}
        holdToGather={false}
        mouseStrength={0.4}
        dpr={1.5}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
