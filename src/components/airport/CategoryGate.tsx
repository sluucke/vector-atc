"use client";

import { useAirportContext } from "@/providers/AirportContextProvider";

/**
 * Hides a briefing section when its category is filtered out.
 *
 * The filter belongs to the aerodrome, not to the sidebar, so the same choice
 * has to reach the server-rendered sections in the centre. This thin wrapper is
 * how they read it.
 */
export default function CategoryGate({
  category,
  children,
}: {
  category: string;
  children: React.ReactNode;
}) {
  const { categories } = useAirportContext();
  if (!categories.includes(category)) return null;
  return <>{children}</>;
}
