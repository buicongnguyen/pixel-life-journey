import type { Occupation } from "./types";

// ---------------------------------------------------------------------------
// Careers chosen at the start of the Career stage. Your salary = the job's
// multiplier × how Smart you are, so the better jobs both PAY more and REQUIRE
// more Smarts (built up by studying in school and upskilling at work). Jobs you
// aren't smart enough for yet are shown locked.
// ---------------------------------------------------------------------------

export const OCCUPATIONS: Occupation[] = [
  {
    id: "doctor",
    name: "Doctor",
    emoji: "🩺",
    blurb: "Save lives. Top pay — but you need top grades.",
    salaryMul: 1.8,
    minSmarts: 68,
    perks: { wealth: 4, happiness: 3 },
    storyTag: "job_doctor",
  },
  {
    id: "lawyer",
    name: "Lawyer",
    emoji: "⚖️",
    blurb: "Argue for a living. Prestigious and well paid.",
    salaryMul: 1.7,
    minSmarts: 62,
    perks: { wealth: 4 },
    storyTag: "job_lawyer",
  },
  {
    id: "engineer",
    name: "Engineer",
    emoji: "💻",
    blurb: "Build and code. Strong, steady, modern money.",
    salaryMul: 1.55,
    minSmarts: 52,
    perks: { smarts: 3 },
    storyTag: "job_engineer",
  },
  {
    id: "entrepreneur",
    name: "Entrepreneur",
    emoji: "🚀",
    blurb: "Start your own thing. Big upside, big hustle.",
    salaryMul: 1.5,
    minSmarts: 44,
    perks: { fun: 2, happiness: 2 },
    storyTag: "job_entrepreneur",
  },
  {
    id: "teacher",
    name: "Teacher",
    emoji: "👩‍🏫",
    blurb: "Shape young minds. Modest pay, deep meaning.",
    salaryMul: 1.05,
    minSmarts: 36,
    perks: { happiness: 6, smarts: 2 },
    storyTag: "job_teacher",
  },
  {
    id: "chef",
    name: "Chef",
    emoji: "👨‍🍳",
    blurb: "Feed people joy. Long shifts, warm heart.",
    salaryMul: 1.05,
    minSmarts: 24,
    perks: { happiness: 5 },
    storyTag: "job_chef",
  },
  {
    id: "trades",
    name: "Tradesperson",
    emoji: "🔧",
    blurb: "Work with your hands. Honest, active, reliable.",
    salaryMul: 1.15,
    minSmarts: 14,
    perks: { health: 5 },
    storyTag: "job_trades",
  },
  {
    id: "artist",
    name: "Artist",
    emoji: "🎨",
    blurb: "Follow your passion. Money's thin, life is rich.",
    salaryMul: 0.8,
    minSmarts: 0,
    perks: { fun: 6, happiness: 4 },
    storyTag: "job_artist",
  },
];
