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

export interface LifeOption {
  id: string;
  /** Short label drawn under the station. */
  label: string;
  /** Emoji icon drawn on the station. */
  icon: string;
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
  options: LifeOption[];
  /** Marriage stage shows a partner picker before the room loads. */
  isMarriage?: boolean;
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
