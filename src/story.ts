import type { Gender, HistoryEntry, Occupation, Partner, Stats } from "./types";
import { verdict, weightStatus } from "./stats";

// ---------------------------------------------------------------------------
// The life-story writer. At the end of the game we turn the recorded choices
// into a short, personal narrative — with pre-written comments that explain
// WHY each habit mattered (e.g. milk -> "a strong, healthy start"). Add a new
// behaviour by giving its option a storyTag and an entry in the banks below.
// ---------------------------------------------------------------------------

export type CauseOfEnd = "oldage" | "health" | "natural";

export interface StoryInput {
  history: HistoryEntry[];
  finalStats: Stats;
  partner: Partner | null;
  deathAge: number;
  cause: CauseOfEnd;
  hadChild: boolean;
  gender: Gender;
  weight: number;
  occupation: Occupation | null;
  homeQuality: number;
  widowed: boolean;
}

export interface LifeStory {
  title: string;
  paragraphs: string[];
  epitaph: string;
}

/** What the player DID, in plain words. */
const TAG_CLAUSES: Record<string, string> = {
  milk: "drank plenty of milk",
  sleep_baby: "slept long and soundly",
  cuddle: "were showered with cuddles",
  babble: "babbled at everyone who would listen",
  play_baby: "giggled at every rattle and toy",
  veggies: "ate your fruit and vegetables",
  junkfood: "loved sugary, greasy treats",
  play_learn: "loved building things and figuring them out",
  screen: "watched a lot of screens",
  play_active: "were always running around outside",
  family_love: "grew up wrapped in family love",
  read: "always had your nose in a book",
  sports: "threw yourself into sports",
  music: "filled your days with music",
  gaming: "spent long hours gaming",
  friends: "were surrounded by good friends",
  study: "studied hard",
  work_teen: "earned your own pocket money",
  party: "never missed a party",
  love: "fell head over heels in love",
  internship: "got a head start through internships",
  exercise: "kept your body strong",
  travel: "chased horizons and travelled",
  work: "built a steady career",
  overtime: "poured yourself into your work",
  baby: "welcomed a child into the world",
  family: "put family first",
  date: "kept the romance alive",
  provide: "worked to provide for your family",
  home: "made a home of your own",
  invest: "planned and invested for the future",
  hobby: "found real joy in your hobbies",
  checkup: "looked after your health",
  mentor: "mentored the next generation",
  grandkids: "doted on your grandchildren",
  sedentary: "spent your days in front of the TV",
  community: "stayed close to your community",
  volunteer: "gave back by volunteering",
  reflect: "reflected on a life well lived",
  rest: "rested and savoured the calm",
  toy_car: "raced your toy cars everywhere",
  toy_doll: "treasured your dolls and toys",
  toy_phone: "were always on your phone",
  upskill: "kept learning new skills at work",
};

/** The pre-written "why it mattered" notes — the heart of the storytelling. */
const TAG_NOTE: Record<string, string> = {
  milk: " — a strong, healthy start",
  sleep_baby: " — the quiet secret to growing up well",
  cuddle: " — and that love made you secure and happy",
  veggies: " — and your body thanked you for it",
  junkfood: " — which slowly wore your health down",
  play_active: " — building healthy habits early",
  family_love: " — a foundation that lasted a lifetime",
  read: " — quietly making you wiser",
  sports: " — keeping you fit and confident",
  study: " — and it opened real doors later",
  exercise: " — the habit that added years to your life",
  sleep: " — the quiet secret to a long life",
  overtime: " — though it quietly cost you your health and joy",
  party: " — fun you would never trade, even if it cost some sleep",
  travel: " — collecting memories worth more than money",
  friends: " — and those bonds kept you healthy and whole",
  checkup: " — catching trouble before it grew",
  sedentary: " — and the stillness slowly took its toll",
  grandkids: " — the sweetest happiness of all",
  community: " — because connection keeps people alive and well",
  gaming: " — though the hours added up",
  toy_phone: " — though the screen ate your hours",
  upskill: " — and it steadily lifted your earnings",
};

interface Era {
  stages: string[];
  phrase: string;
}

const ERAS: Era[] = [
  { stages: ["newborn", "toddler", "early"], phrase: "your earliest years" },
  { stages: ["elementary", "middle", "high"], phrase: "your school years" },
  { stages: ["university", "career"], phrase: "your twenties" },
  { stages: ["marriage", "midlife"], phrase: "your middle years" },
  { stages: ["senior", "retirement"], phrase: "your later years" },
];

function dominantTags(history: HistoryEntry[], stageIds: string[], n: number): string[] {
  const counts = new Map<string, number>();
  for (const h of history) {
    if (!h.storyTag) continue;
    if (!stageIds.includes(h.stageId)) continue;
    // job & house are narrated by their own paragraph, so keep them out of eras
    if (h.storyTag.startsWith("job_") || h.storyTag === "home") continue;
    counts.set(h.storyTag, (counts.get(h.storyTag) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map((e) => e[0]);
}

function clauseFor(tag: string): string {
  return (TAG_CLAUSES[tag] ?? "found your own way") + (TAG_NOTE[tag] ?? "");
}

function joinClauses(tags: string[]): string {
  const clauses = tags.map(clauseFor);
  if (clauses.length === 0) return "drifted along without leaving much of a mark";
  if (clauses.length === 1) return clauses[0];
  return clauses.slice(0, -1).join(", ") + ", and you " + clauses[clauses.length - 1];
}

export function generateStory(input: StoryInput): LifeStory {
  const { history, finalStats, partner, deathAge, cause, hadChild } = input;
  const { gender, weight, occupation, homeQuality, widowed } = input;
  const paragraphs: string[] = [];

  // Opening
  const child = gender === "female" ? "girl" : "boy";
  paragraphs.push(
    `A baby ${child} was born, full of promise. Over ${Math.round(
      deathAge
    )} years, here is the life you lived.`
  );

  // One paragraph per era that actually had choices
  for (const era of ERAS) {
    const tags = dominantTags(history, era.stages, 2);
    if (tags.length === 0) continue;
    const cap = era.phrase.charAt(0).toUpperCase() + era.phrase.slice(1);
    paragraphs.push(`${cap}: you ${joinClauses(tags)}.`);
  }

  // Work + home
  const work = workHomeParagraph(occupation, homeQuality);
  if (work) paragraphs.push(work);

  // Partner + family
  if (partner) {
    const childLine = hadChild
      ? " Together you raised a child of your own."
      : " You built a life together as a pair.";
    paragraphs.push(
      `You married ${partner.name}, ${partner.title}.${childLine} ${partnerLine(
        partner
      )}`
    );
    if (widowed) {
      const who = gender === "female" ? "husband" : "wife";
      paragraphs.push(
        `In your later years you lost your ${who}, and learned to carry their memory forward.`
      );
    }
  } else {
    paragraphs.push(
      "You walked through life as your own person, never marrying — free, and on your own terms."
    );
  }

  // The verdict on the meters (incl. fitness)
  paragraphs.push(verdictParagraph(finalStats, weight));

  // How it ended
  paragraphs.push(endingParagraph(cause, deathAge, finalStats));

  return {
    title: titleFor(finalStats, cause),
    paragraphs,
    epitaph: epitaphFor(finalStats, cause),
  };
}

function workHomeParagraph(occupation: Occupation | null, homeQuality: number): string | null {
  if (!occupation && homeQuality === 0) return null;
  const parts: string[] = [];
  if (occupation) {
    const art = /^[aeiou]/i.test(occupation.name) ? "an" : "a";
    parts.push(`You made your living as ${art} ${occupation.name.toLowerCase()}`);
  }
  if (homeQuality > 0) {
    const homes: Record<number, string> = {
      1: "and lived in a cramped little flat with cracks in the walls",
      2: "and made a cosy house your home",
      3: "and settled into a lovely, bright home",
      4: "and lived in a grand house befitting your success",
    };
    parts.push((occupation ? "" : "You ") + homes[homeQuality]);
  }
  return parts.join(" ").replace(/^You and/, "You") + ".";
}

function partnerLine(p: Partner): string {
  const top = Object.entries(p.modifiers).sort(
    (a, b) => Math.abs(b[1] as number) - Math.abs(a[1] as number)
  )[0];
  const key = top?.[0];
  const map: Record<string, string> = {
    health: "They kept you healthy and active for years.",
    wealth: "They helped build a comfortable life.",
    fun: "They filled your days with colour and adventure.",
    happiness: "They brought you steady, lasting happiness.",
    smarts: "They made you and your family a little wiser.",
  };
  return (key && map[key]) ?? "They were by your side through it all.";
}

function verdictParagraph(s: Stats, weight: number): string {
  const parts: string[] = [];
  const wv = verdict(s.wealth);
  const hv = verdict(s.happiness);
  const sv = verdict(s.smarts);
  parts.push(
    wv === "great"
      ? "You ended your days wealthy and secure"
      : wv === "good"
      ? "You were comfortable, never wanting for much"
      : wv === "ok"
      ? "Money was sometimes tight, but you got by"
      : "You were never rich — life was a financial struggle"
  );
  parts.push(
    hv === "great"
      ? "and remarkably happy"
      : hv === "good"
      ? "and content with your lot"
      : hv === "ok"
      ? "with happiness that came and went"
      : "though happiness often felt out of reach"
  );
  parts.push(
    sv === "great"
      ? "— and wise beyond your years."
      : sv === "good"
      ? "— with hard-won wisdom."
      : sv === "ok"
      ? "— learning as you went."
      : "— book-smarts were never your thing."
  );
  // the smarts clause always begins with "—"; tidy the comma before it
  let para = parts.join(", ").replace(", —", " —");
  // a note on how you carried your body through life
  const ws = weightStatus(weight);
  const fit: Record<string, string> = {
    healthy: " You kept yourself fit and well-fed throughout.",
    overweight: " The years of rich food showed on your frame.",
    obese: " Years of overeating left you heavy, and it cost your health.",
    underweight: " You stayed thin, sometimes too thin for your own good.",
  };
  return para + fit[ws];
}

function endingParagraph(cause: CauseOfEnd, age: number, s: Stats): string {
  const a = Math.round(age);
  if (cause === "health") {
    return `Years of neglected health caught up with you. Your journey ended early, at just ${a}. A reminder that without health, nothing else has time to matter.`;
  }
  if (verdict(s.health) === "great" || verdict(s.happiness) === "great") {
    return `At ${a}, you slipped away peacefully — strong and smiling to the very end, surrounded by those you loved. A life well lived.`;
  }
  return `At ${a}, your long journey came gently to a close. You looked back on a full life, with no regrets worth keeping.`;
}

function titleFor(s: Stats, cause: CauseOfEnd): string {
  if (cause === "health") return "A Life Cut Short";
  const avg = (s.health + s.happiness + s.wealth + s.fun + s.smarts) / 5;
  if (avg >= 75) return "A Life Truly Well Lived";
  if (avg >= 55) return "A Good, Full Life";
  if (avg >= 35) return "An Ordinary Life, Quietly Lived";
  return "A Hard Road Travelled";
}

function epitaphFor(s: Stats, cause: CauseOfEnd): string {
  if (cause === "health") return "Gone too soon — health is the wealth we forget to keep.";
  const top = (Object.entries(s) as [keyof Stats, number][]).sort(
    (a, b) => b[1] - a[1]
  )[0][0];
  const map: Record<string, string> = {
    health: "Lived strong, every single day.",
    happiness: "Loved much, and was much loved.",
    wealth: "Built something that lasted.",
    fun: "Never stopped finding the joy.",
    smarts: "Forever curious, forever learning.",
  };
  return map[top] ?? "A life lived in full.";
}
