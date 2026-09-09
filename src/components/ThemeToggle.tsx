"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

const KEY = "vector:theme";
type Theme = "dark" | "light";

const listeners = new Set<() => void>();

function current(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

const store = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get: current,
  // The console is dark by default, so that is what the server renders.
  getServer: (): Theme => "dark",
  set(theme: Theme) {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem(KEY, theme);
    } catch {
      // Non-fatal: the choice just won't survive a reload.
    }
    listeners.forEach((listener) => listener());
  },
};

export default function ThemeToggle() {
  const theme = useSyncExternalStore(store.subscribe, store.get, store.getServer);
  const next: Theme = theme === "dark" ? "light" : "dark";
  const Icon = theme === "dark" ? Sun : Moon;

  return (
    <button
      onClick={() => store.set(next)}
      aria-label={next === "light" ? "Tema claro" : "Tema escuro"}
      title={next === "light" ? "Mudar para tema claro" : "Mudar para tema escuro"}
      className="grid place-items-center size-7 rounded-md text-ink-faint hover:bg-hover hover:text-ink transition-colors duration-150"
    >
      <Icon className="size-3.5" />
    </button>
  );
}
