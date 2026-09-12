/**
 * The PT-BR/EN-US choice shared by every reference panel (phraseology, traffic
 * circuit, …). One choice, remembered once, rather than each dialog asking
 * again.
 */
export type Lang = "pt" | "en";

const KEY = "vector:lang";

export const langStore = {
  subscribe(listener: () => void) {
    window.addEventListener("storage", listener);
    return () => window.removeEventListener("storage", listener);
  },
  get(): Lang {
    try {
      return window.localStorage.getItem(KEY) === "en" ? "en" : "pt";
    } catch {
      return "pt";
    }
  },
  set(next: Lang) {
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      // A browser that refuses storage still gets the choice for this visit.
    }
  },
};
