import type { Occupation } from "./types";

// ---------------------------------------------------------------------------
// Careers chosen at the start of the Career stage. Your salary = a base pay ×
// the job's multiplier × how high your IQ is, so the better jobs both PAY more
// and REQUIRE a higher IQ (built up by studying in school and upskilling at
// work). Jobs your IQ isn't high enough for yet are shown locked.
// ---------------------------------------------------------------------------

export const OCCUPATIONS: Occupation[] = [
  {
    id: "doctor",
    name: "Doctor",
    emoji: "🩺",
    blurb: "Save lives. Top pay — but you need a top-tier IQ.",
    salaryMul: 1.8,
    minIq: 132,
    perks: { happiness: 3 },
    storyTag: "job_doctor",
  },
  {
    id: "lawyer",
    name: "Lawyer",
    emoji: "⚖️",
    blurb: "Argue for a living. Prestigious and very well paid.",
    salaryMul: 1.7,
    minIq: 126,
    perks: { happiness: 1 },
    storyTag: "job_lawyer",
  },
  {
    id: "engineer",
    name: "Engineer",
    emoji: "💻",
    blurb: "Build and code. Strong, steady, modern money.",
    salaryMul: 1.55,
    minIq: 118,
    perks: { smarts: 2 },
    storyTag: "job_engineer",
  },
  {
    id: "entrepreneur",
    name: "Entrepreneur",
    emoji: "🚀",
    blurb: "Start your own thing. Big upside, big hustle.",
    salaryMul: 1.5,
    minIq: 110,
    perks: { fun: 2, happiness: 2 },
    storyTag: "job_entrepreneur",
  },
  {
    id: "teacher",
    name: "Teacher",
    emoji: "👩‍🏫",
    blurb: "Shape young minds. Modest pay, deep meaning.",
    salaryMul: 1.05,
    minIq: 102,
    perks: { happiness: 6, smarts: 2 },
    storyTag: "job_teacher",
  },
  {
    id: "chef",
    name: "Chef",
    emoji: "👨‍🍳",
    blurb: "Feed people joy. Long shifts, warm heart.",
    salaryMul: 1.05,
    minIq: 94,
    perks: { happiness: 5 },
    storyTag: "job_chef",
  },
  {
    id: "trades",
    name: "Tradesperson",
    emoji: "🔧",
    blurb: "Work with your hands. Honest, active, reliable.",
    salaryMul: 1.15,
    minIq: 86,
    perks: { health: 5 },
    storyTag: "job_trades",
  },
  {
    id: "artist",
    name: "Artist",
    emoji: "🎨",
    blurb: "Follow your passion. Money's thin, life is rich.",
    salaryMul: 0.8,
    minIq: 0,
    perks: { fun: 6, happiness: 4 },
    storyTag: "job_artist",
  },
];
