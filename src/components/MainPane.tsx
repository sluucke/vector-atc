"use client";

import { usePaneClass } from "./MobilePanes";

/**
 * The centre column. It is server-rendered content, so it needs this thin
 * client wrapper to know which tab is showing on a narrow screen.
 */
export default function MainPane({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  // The pane class carries `flex`, so the column direction has to come with it.
  return (
    <div className={`${className} flex-col ${usePaneClass("main")}`}>
      {children}
    </div>
  );
}
