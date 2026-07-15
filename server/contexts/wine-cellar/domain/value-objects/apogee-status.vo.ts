/**
 * Apogée (drinking window) logic, expressed in absolute years.
 *
 * A wine's window is the closed year range `[gardeMin, gardeMax]`; either bound
 * may be `null` (open-ended). All rules here are pure — no I/O — so they can be
 * shared by the list filter (`drinkableInYear`) and the apogée calendar, and
 * unit-tested in isolation.
 */

export type ApogeeStatus =
  /** No drinking window recorded (both bounds null). */
  | 'garde-non-renseignee'
  /** Window opens after the reference year. */
  | 'a-venir'
  /** First fifth of the window: may start drinking. */
  | 'debut-apogee'
  /** Core of the window, or drinkable with a missing bound: at its peak. */
  | 'au-sommet'
  /** Last fifth of the window: still good, drink soon. */
  | 'fin-apogee'
  /** Window closed before the reference year. */
  | 'depasse'

/**
 * Whether a wine is drinkable in year `y`, i.e. inside its (possibly
 * open-ended) window. An unset bound never constrains that side.
 */
export function isDrinkableInYear(
  gardeMin: number | null,
  gardeMax: number | null,
  y: number,
): boolean {
  return (gardeMin === null || gardeMin <= y) && (gardeMax === null || gardeMax >= y)
}

/**
 * Fraction of the window (as a percentage) at each end considered the
 * "début"/"fin" phases. Proportional so a 4-year and a 10-year window scale
 * accordingly (≈1 vs ≈2 years per edge) rather than sharing a fixed cutoff.
 */
const EDGE_PERCENT = 20

/**
 * Classifies a wine's apogée relative to the reference year `refYear`.
 * See {@link ApogeeStatus} for the meaning of each bucket.
 *
 * Within a fully-bounded window `[gardeMin, gardeMax]`, the first
 * {@link EDGE_PERCENT}% of years are `debut-apogee`, the last {@link EDGE_PERCENT}%
 * are `fin-apogee`, and the middle is `au-sommet`. Two disambiguation rules:
 * (a) the nuance is only drawn when BOTH bounds are known — a window with a
 * missing bound is simply `au-sommet` while drinkable; (b) on a single-year
 * window the closing signal wins (`fin-apogee`). Comparisons use integer math
 * (`distance × 100 ≤ EDGE_PERCENT × span`) to avoid floating-point drift.
 */
export function computeApogeeStatus(
  gardeMin: number | null,
  gardeMax: number | null,
  refYear: number,
): ApogeeStatus {
  if (gardeMin === null && gardeMax === null) return 'garde-non-renseignee'
  if (gardeMax !== null && gardeMax < refYear) return 'depasse'
  if (gardeMin !== null && gardeMin > refYear) return 'a-venir'
  // Drinkable this year from here on.
  if (gardeMin === null || gardeMax === null) return 'au-sommet'
  const span = gardeMax - gardeMin
  if (span === 0) return 'fin-apogee'
  // Closing phase takes precedence; the two edges never overlap for span > 0.
  if ((gardeMax - refYear) * 100 <= EDGE_PERCENT * span) return 'fin-apogee'
  if ((refYear - gardeMin) * 100 <= EDGE_PERCENT * span) return 'debut-apogee'
  return 'au-sommet'
}
