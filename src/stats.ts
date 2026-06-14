import type { StatKey, Stats } from "./types";

// ---------------------------------------------------------------------------
// Stat model + the research-grounded relationships between indices.
// See DESIGN.md "Balance model" for the sources behind these numbers.
// ---------------------------------------------------------------------------

export const STAT_KEYS: StatKey[] = [
  "health",
  "happiness",
  "wealth",
  "fun",
  "smarts",
];

export const STAT_META: Record<
  StatKey,
  { label: string; icon: string; color: string }
> = {
  health: { label: "Health", icon: "❤️", color: "#ff5d6c" },
  happiness: { label: "Happy", icon: "😊", color: "#ffd23f" },
  wealth: { label: "Wealth", icon: "💰", color: "#3ddc84" },
  fun: { label: "Fun", icon: "🎉", color: "#ff8fd0" },
  smarts: { label: "Smarts", icon: "🧠", color: "#5db8ff" },
};

/** Where every life begins. A newborn: healthy-ish, happy, poor, playful, not yet wise. */
export const START_STATS: Stats = {
  health: 72,
  happiness: 68,
  wealth: 25,
  fun: 62,
  smarts: 12,
};

export const BASE_LIFE_EXPECTANCY = 85;

export function clampStat(v: number): number {
  return Math.max(0, Math.min(100, v));
}

export function applyEffects(stats: Stats, effects: Partial<Stats>): Stats {
  const next: Stats = { ...stats };
  for (const k of STAT_KEYS) {
    const d = effects[k];
    if (d !== undefined) next[k] = clampStat(next[k] + d);
  }
  return next;
}

/**
 * Wealth -> happiness with diminishing returns.
 * Kahneman & Killingsworth (2023): emotional wellbeing rises with the LOG of
 * income — poverty hurts a lot, extra riches help less and less.
 * Returns a small per-transition nudge to happiness, from about -4 (broke) to
 * about +3 (rich). The curve flattens at the top, never a flat ceiling.
 */
export function wealthHappinessBias(wealth: number): number {
  const w = clampStat(wealth);
  const norm = Math.log10(1 + w) / Math.log10(101); // 0..1, concave
  return Math.round((norm * 7 - 4) * 10) / 10;
}

/**
 * Life expectancy from the running average of health across life.
 * ~90% of longevity is lifestyle (Harvard/longevity research), so health habits
 * dominate. avg 100 -> ~90 yrs, avg 50 -> ~70, avg 20 -> ~58, avg 0 -> ~50.
 */
export function lifeExpectancyFromHealth(avgHealth: number): number {
  return Math.round(50 + 0.4 * clampStat(avgHealth));
}

/** Qualitative verdict for a final stat, used by the story + ending. */
export function verdict(value: number): "poor" | "ok" | "good" | "great" {
  if (value < 30) return "poor";
  if (value < 55) return "ok";
  if (value < 78) return "good";
  return "great";
}
