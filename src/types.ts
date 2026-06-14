// ---------------------------------------------------------------------------
// Core type definitions for Pixel Life Journey.
// The whole game is data-driven: stages and their options are plain data
// (see stages.ts), so adding content = adding an entry, no engine changes.
// ---------------------------------------------------------------------------

/** The five life indices shown in the HUD. All are 0..100 meters. */
export type StatKey = "health" | "happiness" | "wealth" | "fun" | "smarts";

export type Stats = Record<StatKey, number>;

/** Loose grouping used for icon tinting and balance reasoning. */
export type OptionCategory =
  | "health"
  | "food"
  | "fun"
  | "smarts"
  | "wealth"
  | "social"
  | "rest"
  | "special";

/** A person you can interact with in a room — drawn as a little character. */
export type PersonKind =
  | "mother"
  | "father"
  | "grandma"
  | "grandpa"
  | "sibling"
  | "playmate"
  | "studyFriend"
  | "bestFriend"
  | "crush"
  | "roommate"
  | "coworker"
  | "boss"
  | "gymBuddy"
  | "spouse"
  | "child"
  | "grandkid"
  | "oldFriend";

/** The scenery drawn behind a stage's room. */
export type SceneKind =
  | "nursery"
  | "playroom"
  | "school"
  | "campus"
  | "office"
  | "home"
  | "sunset";

export interface LifeOption {
  id: string;
  /** Short label drawn under the station. */
  label: string;
  /** Emoji icon drawn on the station (ignored when `person` is set). */
  icon: string;
  /** If set, this choice is a PERSON drawn as a little character, not a pedestal. */
  person?: PersonKind;
  /** One-line description shown in the focus panel. */
  desc: string;
  category: OptionCategory;
  /** Stat deltas applied when chosen. */
  effects: Partial<Stats>;
  /** Years this action costs (defaults to the stage's per-action age step). */
  ageCost?: number;
  /** If true, can only be chosen once per stage (e.g. "Have a baby"). */
  once?: boolean;
  /** If true, the positive wealth gain is scaled by Smarts (study pays off). */
  scalesWithSmarts?: boolean;
  /** Explicit body-weight delta (else it's derived from category — see engine). */
  weight?: number;
  /** Choosing this opens the house-buying picker instead of a normal action. */
  opensHousePicker?: boolean;
  /** A repeatable "good habit" — reading it 5+ times across life pays off in health. */
  habit?: boolean;
  /** Key into the story comment bank (see story.ts). */
  storyTag?: string;
}

export interface RoomTheme {
  wall: string;
  wallShade: string;
  floor: string;
  floorShade: string;
  accent: string;
}

export interface Stage {
  id: string;
  name: string;
  emoji: string;
  /** Age the player is at when the stage starts. */
  ageStart: number;
  /** The door opens once age >= ageEnd. */
  ageEnd: number;
  blurb: string;
  theme: RoomTheme;
  /** Scenery drawn behind this room (school, office, home…). */
  scene: SceneKind;
  options: LifeOption[];
  /** Marriage stage shows a partner picker before the room loads. */
  isMarriage?: boolean;
  /** Career stage shows the occupation picker before the room loads. */
  isCareer?: boolean;
  /** Home stages render the player's house quality (cracks vs decor) behind them. */
  atHome?: boolean;
}

export interface Partner {
  id: string;
  name: string;
  /** Short archetype, e.g. "the Doctor". */
  title: string;
  emoji: string;
  blurb: string;
  /** Applied passively at every stage transition after the wedding. */
  modifiers: Partial<Stats>;
  storyTag: string;
}

/** One recorded choice, used to write the life story at the end. */
export interface HistoryEntry {
  stageId: string;
  stageName: string;
  optionId: string;
  storyTag?: string;
  ageAt: number;
}

export type Gender = "male" | "female";

/** A job chosen at the start of the Career stage. */
export interface Occupation {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  /** Multiplier on the wealth earned from work-style options. */
  salaryMul: number;
  /** Smarts required to unlock this career. */
  minSmarts: number;
  /** Small one-off boost applied when you take the job. */
  perks?: Partial<Stats>;
  storyTag: string;
}

/** A house tier the player can buy once they're working. */
export interface HouseTier {
  id: string;
  name: string;
  emoji: string;
  /** Wealth cost. */
  cost: number;
  /** 1 (run-down, cracked) .. 4 (mansion). Drives the home background. */
  quality: number;
  /** Happiness gained from buying it. */
  happiness: number;
  blurb: string;
}
