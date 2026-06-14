import type { Stats } from "./types";

// ---------------------------------------------------------------------------
// Random "Easter egg" events. Every so often after an action, life throws a
// surprise — a windfall (found wallet, lottery, inheritance) or, now and then,
// a setback. They pop up, apply their effects, and get woven into your life
// story. Add one by dropping an entry in EVENTS.
// ---------------------------------------------------------------------------

export interface RandomEvent {
  id: string;
  emoji: string;
  title: string;
  desc: string;
  /** Big flashy money figure shown in the popup (flavour). */
  cash?: string;
  effects: Partial<Stats>;
  /** Relative frequency (higher = more common). */
  weight: number;
  /** Can only ever happen once per life. */
  once?: boolean;
  minAge?: number;
  maxAge?: number;
  /** false = a setback (styled differently). Defaults to true. */
  good?: boolean;
  /** Short clause for the life story's "twists of fate" line. */
  storyClause: string;
}

export const EVENTS: RandomEvent[] = [
  {
    id: "wallet",
    emoji: "👛",
    title: "Lucky find!",
    desc: "You spotted a fat wallet on the street and handed it in — the grateful owner let you keep a $100,000 reward!",
    cash: "+ $100,000",
    effects: { wealth: 12, happiness: 4 },
    weight: 5,
    minAge: 8,
    storyClause: "found a wallet and pocketed a handsome reward",
  },
  {
    id: "lottery",
    emoji: "🎟️",
    title: "JACKPOT!!",
    desc: "On a whim you bought a lottery ticket — and hit the jackpot for $500,000!",
    cash: "+ $500,000",
    effects: { wealth: 35, happiness: 10 },
    weight: 1,
    once: true,
    minAge: 18,
    storyClause: "won half a million on a lottery ticket",
  },
  {
    id: "inherit",
    emoji: "📜",
    title: "An inheritance",
    desc: "A distant relative remembered you fondly and left you a tidy inheritance.",
    cash: "+ $250,000",
    effects: { wealth: 20, happiness: 3 },
    weight: 2,
    once: true,
    minAge: 25,
    storyClause: "inherited a small fortune from family",
  },
  {
    id: "bonus",
    emoji: "🎉",
    title: "Surprise bonus",
    desc: "Your hard work paid off with an unexpected bonus.",
    cash: "+ $8,000",
    effects: { wealth: 7, happiness: 3 },
    weight: 4,
    minAge: 22,
    storyClause: "landed a surprise bonus at work",
  },
  {
    id: "puppy",
    emoji: "🐶",
    title: "A new friend",
    desc: "A stray puppy followed you home. Who could say no to that face?",
    effects: { happiness: 9, health: 2 },
    weight: 4,
    minAge: 5,
    storyClause: "adopted a stray puppy who adored you",
  },
  {
    id: "viral",
    emoji: "🌟",
    title: "You went viral!",
    desc: "Something you posted blew up online overnight — a little fame and fortune.",
    cash: "+ $15,000",
    effects: { wealth: 8, happiness: 6 },
    weight: 3,
    minAge: 12,
    storyClause: "had a moment of internet fame",
  },
  {
    id: "loan",
    emoji: "🤝",
    title: "Paid back!",
    desc: "An old friend finally repaid a loan you'd written off years ago.",
    cash: "+ $20,000",
    effects: { wealth: 9, happiness: 2 },
    weight: 3,
    minAge: 20,
    storyClause: "got back money from a long-forgotten loan",
  },
  {
    id: "contest",
    emoji: "🏆",
    title: "You won a contest!",
    desc: "You entered a contest just for fun — and actually won!",
    cash: "+ $5,000",
    effects: { wealth: 5, happiness: 7 },
    weight: 3,
    minAge: 8,
    storyClause: "won a contest you entered on a whim",
  },
  {
    id: "scholarship",
    emoji: "🎓",
    title: "Scholarship!",
    desc: "Your grades earned you a surprise scholarship.",
    cash: "+ $30,000",
    effects: { wealth: 10, smarts: 4, happiness: 5 },
    weight: 2,
    minAge: 14,
    maxAge: 24,
    storyClause: "earned a surprise scholarship",
  },
  {
    id: "gymfree",
    emoji: "🎁",
    title: "Free membership",
    desc: "You won a whole year of free gym membership. Time to get moving!",
    effects: { health: 8, happiness: 3 },
    weight: 3,
    minAge: 14,
    storyClause: "won a year of free gym membership",
  },
  // --- the occasional setback, to keep luck honest ---
  {
    id: "scam",
    emoji: "⚠️",
    title: "Scammed!",
    desc: "A too-good-to-be-true investment turned out to be a scam. Ouch.",
    cash: "− $40,000",
    effects: { wealth: -10, happiness: -5 },
    weight: 2,
    minAge: 25,
    good: false,
    storyClause: "lost money to a clever scammer",
  },
  {
    id: "medbill",
    emoji: "🏥",
    title: "Surprise bill",
    desc: "An unexpected medical bill landed on your doormat.",
    cash: "− $10,000",
    effects: { wealth: -7, health: -3 },
    weight: 2,
    minAge: 30,
    good: false,
    storyClause: "got hit with a surprise medical bill",
  },
  {
    id: "phone",
    emoji: "💥",
    title: "Cracked screen",
    desc: "You dropped your phone on the pavement. A small but annoying expense.",
    cash: "− $500",
    effects: { wealth: -3, happiness: -2 },
    weight: 2,
    minAge: 12,
    good: false,
    storyClause: "smashed a phone screen at the worst moment",
  },
];
