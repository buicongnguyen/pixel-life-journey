import type { Partner } from "./types";

// ---------------------------------------------------------------------------
// Marriage candidates. The Marriage & Baby stage shows these and asks the
// player to choose one. The chosen partner's modifiers are applied passively
// at every stage transition afterwards — so who you marry shapes the rest of
// your life. Eight archetypes (a mix of women and men); pick one.
// ---------------------------------------------------------------------------

export const PARTNERS: Partner[] = [
  {
    id: "maya",
    name: "Maya",
    title: "the Doctor",
    emoji: "👩‍⚕️",
    blurb: "Caring and disciplined. Keeps the whole family healthy.",
    modifiers: { health: 3, happiness: 1 },
    storyTag: "mate_doctor",
  },
  {
    id: "leo",
    name: "Leo",
    title: "the Entrepreneur",
    emoji: "👨‍💼",
    blurb: "Ambitious and driven. Builds wealth, but works long hours.",
    modifiers: { wealth: 4, fun: -1 },
    storyTag: "mate_entrepreneur",
  },
  {
    id: "aria",
    name: "Aria",
    title: "the Artist",
    emoji: "👩‍🎨",
    blurb: "Free-spirited and warm. Life is colourful, money is tight.",
    modifiers: { fun: 3, happiness: 2, wealth: -1 },
    storyTag: "mate_artist",
  },
  {
    id: "sam",
    name: "Sam",
    title: "the Teacher",
    emoji: "👨‍🏫",
    blurb: "Patient and wise. Makes you and the kids a little smarter.",
    modifiers: { smarts: 3, happiness: 1 },
    storyTag: "mate_teacher",
  },
  {
    id: "nina",
    name: "Nina",
    title: "the Athlete",
    emoji: "🏃‍♀️",
    blurb: "Energetic and fun. Drags you out for runs and adventures.",
    modifiers: { health: 2, fun: 2 },
    storyTag: "mate_athlete",
  },
  {
    id: "jude",
    name: "Jude",
    title: "the Chef",
    emoji: "👨‍🍳",
    blurb: "Generous and cosy. Every meal is healthy and delicious.",
    modifiers: { health: 2, happiness: 2 },
    storyTag: "mate_chef",
  },
  {
    id: "ravi",
    name: "Ravi",
    title: "the Engineer",
    emoji: "👨‍🔧",
    blurb: "Steady and clever. A dependable, comfortable home.",
    modifiers: { wealth: 2, smarts: 2 },
    storyTag: "mate_engineer",
  },
  {
    id: "elena",
    name: "Elena",
    title: "the Traveller",
    emoji: "🧳",
    blurb: "Adventurous and joyful. You'll see the world together.",
    modifiers: { fun: 3, happiness: 1, wealth: -1 },
    storyTag: "mate_traveller",
  },
];
