import type { HouseTier } from "./types";

// ---------------------------------------------------------------------------
// Houses you can buy once you're earning. The price you can afford sets your
// home's QUALITY (1..4), which becomes the background of every home stage that
// follows — a grand house is bright and decorated; a cheap one is cracked and
// run-down. You can only buy a tier you can afford.
// ---------------------------------------------------------------------------

export const HOUSE_TIERS: HouseTier[] = [
  {
    id: "flat",
    name: "Tiny flat",
    emoji: "🏚️",
    cost: 12,
    quality: 1,
    happiness: 3,
    blurb: "Cheap and cramped, with cracks in the walls. It's a start.",
  },
  {
    id: "house",
    name: "Cosy house",
    emoji: "🏠",
    cost: 26,
    quality: 2,
    happiness: 7,
    blurb: "A modest, comfortable home to call your own.",
  },
  {
    id: "nice",
    name: "Lovely home",
    emoji: "🏡",
    cost: 42,
    quality: 3,
    happiness: 12,
    blurb: "Bright, spacious and beautifully kept. Proud to live here.",
  },
  {
    id: "mansion",
    name: "Grand house",
    emoji: "🏰",
    cost: 66,
    quality: 4,
    happiness: 18,
    blurb: "A magnificent home. The reward for years of hard work.",
  },
];
