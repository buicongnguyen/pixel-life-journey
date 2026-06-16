import type { HouseTier } from "./types";

// ---------------------------------------------------------------------------
// Property you can buy once you're earning. The home you LIVE in is the nicest
// one you own — its QUALITY (1..5) becomes the background of every home stage
// (a villa is bright and grand; a studio is cracked and run-down). You can only
// buy what you can afford.
//
// A pricier home costs more to keep (`upkeep` quietly drains wealth every
// action) — so splurging on a mansion squeezes everything else. And once you
// own more than one place, the spare homes become rentals that pay you a
// `rentYield` every stage — the start of a little property empire.
// ---------------------------------------------------------------------------

export const HOUSE_TIERS: HouseTier[] = [
  {
    id: "studio",
    name: "Studio flat",
    emoji: "🏚️",
    cost: 10,
    quality: 1,
    happiness: 3,
    upkeep: 0,
    rentYield: 2,
    blurb: "Cheap and cramped, with cracks in the walls. It's a start.",
  },
  {
    id: "condo",
    name: "City condo",
    emoji: "🏢",
    cost: 22,
    quality: 2,
    happiness: 7,
    upkeep: 0.2,
    rentYield: 3,
    blurb: "A tidy apartment in a decent block. Comfortable and yours.",
  },
  {
    id: "townhouse",
    name: "Townhouse",
    emoji: "🏠",
    cost: 38,
    quality: 3,
    happiness: 11,
    upkeep: 0.35,
    rentYield: 5,
    blurb: "A bright, roomy townhouse. Proud to call it home.",
  },
  {
    id: "house",
    name: "Family house",
    emoji: "🏡",
    cost: 54,
    quality: 4,
    happiness: 15,
    upkeep: 0.5,
    rentYield: 7,
    blurb: "A lovely detached home with a garden. Room to grow.",
  },
  {
    id: "villa",
    name: "Luxury villa",
    emoji: "🏰",
    cost: 74,
    quality: 5,
    happiness: 20,
    upkeep: 0.8,
    rentYield: 10,
    blurb: "A magnificent villa — the reward for years of hard work, but grand to keep.",
  },
];
