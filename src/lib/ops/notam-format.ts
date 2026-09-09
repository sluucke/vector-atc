export interface Notam {
  id: string;
  number: string;
  /** Q-code, e.g. QMRTT (runway closed). */
  code: string | null;
  category: string | null;
  status: string | null;
  text: string;
  /** Raw AISWEB validity groups, YYMMDDHHMM. */
  validFrom: string | null;
  validTo: string | null;
  lower: string | null;
  upper: string | null;
}

const MONTHS = [
  "JAN", "FEV", "MAR", "ABR", "MAI", "JUN",
  "JUL", "AGO", "SET", "OUT", "NOV", "DEZ",
];

/** AISWEB validity groups are YYMMDDHHMM: "2609030000" -> "03SET26 00:00Z" */
export function formatNotamTime(value: string | null): string | null {
  if (!value || value.length !== 10 || !/^[0-9]+$/.test(value)) return null;
  const month = Number(value.slice(2, 4));
  if (month < 1 || month > 12) return null;
  return (
    value.slice(4, 6) +
    MONTHS[month - 1] +
    value.slice(0, 2) +
    " " +
    value.slice(6, 8) +
    ":" +
    value.slice(8, 10) +
    "Z"
  );
}
