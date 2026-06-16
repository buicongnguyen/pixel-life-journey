import type {
  Gender,
  HistoryEntry,
  HouseTier,
  LifeOption,
  Occupation,
  Partner,
  Stats,
  StatKey,
  VehicleTier,
} from "./types";
import {
  START_STATS,
  START_WEIGHT,
  STAT_KEYS,
  STAT_META,
  applyEffects,
  clampStat,
  crossEffects,
  lifeExpectancyFromHealth,
  wealthHappinessBias,
  weightColor,
  weightHealthDrain,
  weightStatus,
} from "./stats";
import { STAGES } from "./stages";
import { PARTNERS } from "./partners";
import { OCCUPATIONS } from "./occupations";
import { HOUSE_TIERS } from "./houses";
import { VEHICLES } from "./vehicles";
import { EVENTS, type RandomEvent } from "./events";
import { avatarLook, drawAvatar, drawPerson, drawRoom, drawStation } from "./sprites";
import { createUI, type UIRefs } from "./ui";
import { generateStory, type CauseOfEnd, type LifeStory } from "./story";

const W = 640;
const H = 360;
const FLOOR_Y = 250;
const DOOR_X = W - 74;
const SPEED = 162;
const ROW_BACK = 274;
const ROW_FRONT = 330;
const PY_MIN = 262;
const PY_MAX = 348;
const CAREER_INDEX = STAGES.findIndex((s) => s.id === "career");

type Mode =
  | "title"
  | "setup"
  | "playing"
  | "partner"
  | "occupation"
  | "house"
  | "vehicle"
  | "timetravel"
  | "event"
  | "transition"
  | "ending";

interface Station {
  x: number;
  y: number;
  opt: LifeOption;
}

/** A rewindable snapshot of the whole life, captured at each stage's start. */
interface Snapshot {
  stageIndex: number;
  age: number;
  stats: Stats;
  weight: number;
  partnerId: string | null;
  occupationId: string | null;
  homeQuality: number;
  homeIds: string[];
  hadChild: boolean;
  spouseDeceased: boolean;
  habitCount: number;
  investments: number;
  moneyWise: boolean;
  owned: string[];
  usedEvents: string[];
  eventsLog: string[];
  healthSum: number;
  healthCount: number;
  historyLen: number;
}

interface FloatText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

export class Game {
  private ui: UIRefs;
  private mode: Mode = "title";
  private stageIndex = 0;
  private stats: Stats = { ...START_STATS };
  private age = 0;
  private gender: Gender = "male";
  private weight = START_WEIGHT;
  private occupation: Occupation | null = null;
  private homeQuality = 0;
  private homes: HouseTier[] = []; // every property bought; you live in the best one
  private houseUpkeep = 0; // per-action wealth drain from your home (mortgage/upkeep)
  private rentalIncome = 0; // per-stage wealth from spare homes rented out
  private investments = 0; // wealth in the market — compounds over the stages
  private moneyWise = false; // learned money management → better, steadier returns
  private owned = new Set<string>(); // one-off, owned-for-life purchases (vehicles, skills)
  private spouseDeceased = false;
  private habitCount = 0;
  private eventCooldown = 2;
  private usedEvents = new Set<string>();
  private eventsLog: string[] = [];
  private timeline: Snapshot[] = [];
  private pendingHouseOptId: string | null = null;
  private history: HistoryEntry[] = [];
  private partner: Partner | null = null;
  private hadChild = false;

  private healthSum = 0;
  private healthCount = 0;

  private usedOnce = new Set<string>();
  private stations: Station[] = [];
  private floats: FloatText[] = [];
  private focusIndex = -1;

  private px = 46;
  private py = 236;
  private walkPhase = 0;
  private moving = false;
  private cooldown = 0;
  private hintTimer = 0;

  private transitionTimer = 0;
  private transitionNext = 0;

  private story: LifeStory | null = null;
  private deathAge = 0;
  private cause: CauseOfEnd = "natural";

  private input = { left: false, right: false, up: false, down: false };
  private actQueued = false;
  private lastTime = 0;
  private frameErrors = 0;

  constructor(mount: HTMLElement) {
    this.ui = createUI(mount);
    this.bindInput();
    this.showTitle();
    requestAnimationFrame(this.frame);
    // Debug handle for headless verification (mirrors other games' debug APIs).
    (window as unknown as { __pixelLife: Game }).__pixelLife = this;
  }

  /** Test/debug snapshot of the live game state. */
  debugState() {
    return {
      mode: this.mode,
      stage: STAGES[this.stageIndex]?.id,
      age: Math.round(this.age * 10) / 10,
      lifeExp: this.lifeExp(),
      stats: { ...this.stats },
      px: Math.round(this.px),
      py: Math.round(this.py),
      focus: this.focusIndex >= 0 ? this.stations[this.focusIndex]?.opt.id : null,
      partner: this.partner?.id ?? null,
      gender: this.gender,
      weight: Math.round(this.weight),
      occupation: this.occupation?.id ?? null,
      homeQuality: this.homeQuality,
      homes: this.homes.map((h) => h.id),
      houseUpkeep: Math.round(this.houseUpkeep * 100) / 100,
      rentalIncome: this.rentalIncome,
      investments: Math.round(this.investments * 10) / 10,
      moneyWise: this.moneyWise,
      owned: [...this.owned],
      habitCount: this.habitCount,
      events: [...this.eventsLog],
      timelineLen: this.timeline.filter(Boolean).length,
      historyLen: this.history.length,
    };
  }

  /** Test/debug: force a random event (by id, or a random eligible one). */
  debugFireEvent(id?: string): string | null {
    const e = id ? EVENTS.find((x) => x.id === id) : EVENTS[0];
    if (!e || this.mode !== "playing") return null;
    this.fireEvent(e);
    return e.id;
  }

  /** Test/debug: choose an option by id in the current stage (ignores position). */
  debugChoose(optId: string): void {
    const idx = this.stations.findIndex((s) => s.opt.id === optId);
    if (idx < 0) return;
    this.focusIndex = idx;
    this.cooldown = 0;
    this.doAction();
  }

  /** Test/debug: pick a partner / occupation / house / vehicle / rewind by id. */
  debugPick(kind: "partner" | "occupation" | "house" | "vehicle" | "rewind", id: string): void {
    if (kind === "partner") {
      const p = PARTNERS.find((x) => x.id === id);
      if (p) this.pickPartner(p);
    } else if (kind === "occupation") {
      const o = OCCUPATIONS.find((x) => x.id === id);
      if (o) this.pickOccupation(o);
    } else if (kind === "house") {
      const h = HOUSE_TIERS.find((x) => x.id === id);
      if (h) this.buyHouse(h);
    } else if (kind === "vehicle") {
      const v = VEHICLES.find((x) => x.id === id);
      if (v) this.buyVehicle(v);
    } else if (kind === "rewind") {
      this.rewind(Number(id));
    }
  }

  // --- lifecycle ------------------------------------------------------------

  private newGame(): void {
    this.stats = { ...START_STATS };
    this.age = 0;
    this.weight = START_WEIGHT;
    this.occupation = null;
    this.homeQuality = 0;
    this.homes = [];
    this.houseUpkeep = 0;
    this.rentalIncome = 0;
    this.investments = 0;
    this.moneyWise = false;
    this.owned = new Set();
    this.spouseDeceased = false;
    this.habitCount = 0;
    this.eventCooldown = 2;
    this.usedEvents = new Set();
    this.eventsLog = [];
    this.timeline = [];
    this.pendingHouseOptId = null;
    this.history = [];
    this.partner = null;
    this.hadChild = false;
    this.healthSum = 0;
    this.healthCount = 0;
    this.floats = [];
    this.story = null;
    this.sampleHealth();
    this.loadStage(0);
  }

  private loadStage(i: number): void {
    this.stageIndex = i;
    const s = STAGES[i];
    this.usedOnce.clear();
    this.age = Math.max(this.age, s.ageStart);
    this.px = 70;
    this.py = 322;
    this.focusIndex = -1;
    this.buildStations();
    this.renderFocusPanel(); // reset the panel to the default prompt on stage entry
    this.sampleHealth();
    this.timeline[i] = this.snapshot(); // capture entry state for time travel
    if (s.isMarriage && !this.partner) {
      this.mode = "partner";
      this.showPartner();
    } else if (s.isCareer && !this.occupation) {
      this.mode = "occupation";
      this.showOccupation();
    } else {
      this.mode = "playing";
      this.clearOverlay();
    }
  }

  private snapshot(): Snapshot {
    return {
      stageIndex: this.stageIndex,
      age: this.age,
      stats: { ...this.stats },
      weight: this.weight,
      partnerId: this.partner?.id ?? null,
      occupationId: this.occupation?.id ?? null,
      homeQuality: this.homeQuality,
      homeIds: this.homes.map((h) => h.id),
      hadChild: this.hadChild,
      spouseDeceased: this.spouseDeceased,
      habitCount: this.habitCount,
      investments: this.investments,
      moneyWise: this.moneyWise,
      owned: [...this.owned],
      usedEvents: [...this.usedEvents],
      eventsLog: [...this.eventsLog],
      healthSum: this.healthSum,
      healthCount: this.healthCount,
      historyLen: this.history.length,
    };
  }

  /** Some NPC options only make sense in context (spouse alive, kids exist…). */
  private optionAvailable(o: LifeOption): boolean {
    if (o.person === "spouse") return !!this.partner && !this.spouseDeceased;
    if (o.person === "child" || o.person === "grandkid") return this.hadChild;
    // one-off purchases/skills disappear once you own them
    if (o.permanent && this.owned.has(o.id)) return false;
    // the vehicle picker hides once you own every vehicle
    if (o.opensVehiclePicker) return VEHICLES.some((v) => !this.owned.has("veh_" + v.id));
    return true;
  }

  private buildStations(): void {
    const opts = STAGES[this.stageIndex].options.filter((o) => this.optionAvailable(o));
    const n = opts.length;
    const xStart = 104;
    const xEnd = W - 120;
    // Spread every option across the width and alternate back/front rows, so no
    // two ever share a column — this keeps tall NPCs from hiding items behind
    // them and stops the always-on labels from overlapping each other.
    this.stations = opts.map((opt, i) => ({
      x: n === 1 ? (xStart + xEnd) / 2 : xStart + ((xEnd - xStart) * i) / (n - 1),
      y: i % 2 === 0 ? ROW_BACK : ROW_FRONT,
      opt,
    }));
  }

  // --- per-stage balance helpers -------------------------------------------

  private stageStep(): number {
    const s = STAGES[this.stageIndex];
    return Math.max(0.12, Math.min(3, (s.ageEnd - s.ageStart) / 7));
  }

  private sampleHealth(): void {
    this.healthSum += this.stats.health;
    this.healthCount += 1;
  }

  private avgHealth(): number {
    return this.healthCount ? this.healthSum / this.healthCount : this.stats.health;
  }

  private lifeExp(): number {
    return lifeExpectancyFromHealth(this.avgHealth());
  }

  /** The age your spouse passes away — a woman's husband leaves earlier. */
  private spouseDeathAge(): number {
    return this.gender === "female" ? 70 : 82;
  }

  private passiveTick(): void {
    const s = this.stats;
    // modern life drifts toward weight gain; being out of range drains health
    this.weight = clampStat(this.weight + 0.13);
    s.health = clampStat(s.health - (0.4 + this.age * 0.012) - weightHealthDrain(this.weight));
    s.fun = clampStat(s.fun - 0.45);
    s.happiness = clampStat(s.happiness - 0.25);
    s.smarts = clampStat(s.smarts - 0.15);
    // baseline cost of living + the upkeep on the home you live in (a grander
    // home quietly taxes everything else you'd like to do with your money)
    s.wealth = clampStat(s.wealth - 0.2 - this.houseUpkeep);
    // knock-on effects that wire the meters together (poverty, loneliness, etc.)
    const fx = crossEffects(s);
    s.health = clampStat(s.health + fx.health);
    s.happiness = clampStat(s.happiness + fx.happiness);
    // being very over/under-weight is also a little dispiriting
    const ws = weightStatus(this.weight);
    if (ws === "obese" || ws === "underweight") s.happiness = clampStat(s.happiness - 0.25);
  }

  // --- actions --------------------------------------------------------------

  private doAction(): void {
    if (this.mode !== "playing" || this.cooldown > 0) return;

    // allow pressing action near an open door to advance (handy on touch)
    const s = STAGES[this.stageIndex];
    if (this.focusIndex < 0) {
      if (this.age >= s.ageEnd && this.px > DOOR_X - 36) this.advanceStage();
      return;
    }

    const opt = this.stations[this.focusIndex].opt;
    if (opt.once && this.usedOnce.has(opt.id)) {
      this.hint("You already did that this chapter.");
      return;
    }
    if (opt.permanent && this.owned.has(opt.id)) {
      this.hint("You already own that.");
      return;
    }

    // buying a house / vehicle opens a picker instead of applying a normal action
    if (opt.opensHousePicker) {
      this.pendingHouseOptId = opt.id;
      this.mode = "house";
      this.showHouse();
      return;
    }
    if (opt.opensVehiclePicker) {
      if (!VEHICLES.some((v) => !this.owned.has("veh_" + v.id))) {
        this.hint("You already own every vehicle!");
        return;
      }
      this.mode = "vehicle";
      this.showVehicle();
      return;
    }

    // Affordability gate: anything with a price — a cost, an investment stake, or
    // a gamble stake — simply can't be done when you're too broke. Nothing
    // happens, just like real life: not enough money to do that.
    const price = (opt.cost ?? 0) + (opt.invest ?? 0) + (opt.gamble?.stake ?? 0);
    if (price > 0 && this.stats.wealth < price) {
      this.hint("💸 Not enough money for that.");
      return;
    }

    const eff: Partial<Stats> = { ...opt.effects };
    // salary = base earnings x how smart you are x your occupation's pay
    if (opt.scalesWithSmarts && eff.wealth && eff.wealth > 0) {
      const smartFactor = 0.7 + this.stats.smarts / 140;
      const jobFactor = this.occupation?.salaryMul ?? 1;
      eff.wealth = Math.round(eff.wealth * smartFactor * jobFactor);
    }
    // pay any up-front cost
    if (opt.cost) eff.wealth = (eff.wealth ?? 0) - opt.cost;
    // buying stocks moves the stake out of your wallet and into the market pot
    if (opt.invest) {
      this.investments += opt.invest;
      eff.wealth = (eff.wealth ?? 0) - opt.invest;
    }
    // learning money management switches on smarter, steadier returns for life
    if (opt.moneyMgmt) this.moneyWise = true;

    // try-your-luck: roll the gamble and fold the outcome into this action
    let gambleClause: string | null = null;
    if (opt.gamble) {
      const g = opt.gamble;
      eff.wealth = (eff.wealth ?? 0) - g.stake;
      const r = Math.random();
      if (r < g.jackpotChance) {
        eff.wealth += g.jackpot;
        eff.happiness = (eff.happiness ?? 0) + 10;
        gambleClause = g.jackpotStory;
        this.floats.push({ x: this.px, y: this.py - 102, text: "✨ JACKPOT!", color: "#ffd23f", life: 1.7 });
      } else if (r < g.jackpotChance + g.prizeChance) {
        eff.wealth += g.prize;
        eff.happiness = (eff.happiness ?? 0) + 4;
        gambleClause = g.prizeStory;
      } else {
        eff.happiness = (eff.happiness ?? 0) - 3;
        gambleClause = g.bustStory;
      }
    }
    // one-off lifetime purchases/skills are remembered so they don't reappear
    if (opt.permanent) this.owned.add(opt.id);

    this.stats = applyEffects(this.stats, eff);
    if (gambleClause) this.eventsLog.push(gambleClause);
    if (opt.invest) this.floats.push({ x: this.px, y: this.py - 88, text: `${opt.invest} 📈`, color: "#5db8ff", life: 1.3 });

    // body weight: explicit delta, else derived from what kind of action it is
    const wDelta = opt.weight ?? this.autoWeightDelta(opt);
    this.weight = clampStat(this.weight + wDelta);

    this.age += opt.ageCost ?? this.stageStep();
    this.passiveTick();
    this.sampleHealth();
    this.cooldown = 0.28;
    if (opt.once) {
      this.usedOnce.add(opt.id);
      this.renderFocusPanel(); // reflect the "already done" state
    }
    if (opt.id === "baby") this.hadChild = true;

    // "good habits" book: reading it adds up — 5+ reads pays off in lasting health
    let habitBonus = 0;
    if (opt.habit) {
      this.habitCount += 1;
      if (this.habitCount === 5) {
        this.stats = applyEffects(this.stats, { health: 15, happiness: 5 });
        habitBonus = 15;
        this.hint("📗 Your good habits stuck for life! +15 ❤️");
      } else if (this.habitCount > 5) {
        this.stats = applyEffects(this.stats, { health: 4 });
        habitBonus = 4;
      }
    }

    this.history.push({
      stageId: s.id,
      stageName: s.name,
      optionId: opt.id,
      storyTag: opt.storyTag,
      ageAt: this.age,
    });
    this.spawnFloats(eff, wDelta);
    if (habitBonus) this.floats.push({ x: this.px, y: this.py - 90, text: `+${habitBonus} ❤️`, color: "#ff5d6c", life: 1.3 });

    if (this.stats.health <= 0) return this.finishLife("health", Math.round(this.age));

    // every so often, life throws a surprise (found wallet, lottery, …)
    if (this.mode === "playing") this.maybeFireEvent();
  }

  // --- random "Easter egg" events -------------------------------------------

  private maybeFireEvent(): void {
    if (this.eventCooldown > 0) {
      this.eventCooldown -= 1;
      return;
    }
    if (Math.random() > 0.16) return; // ~1 in 6 actions once off cooldown
    const pool = EVENTS.filter(
      (e) =>
        !(e.once && this.usedEvents.has(e.id)) &&
        this.age >= (e.minAge ?? 0) &&
        this.age <= (e.maxAge ?? 999)
    );
    if (pool.length === 0) return;
    const total = pool.reduce((sum, e) => sum + e.weight, 0);
    let r = Math.random() * total;
    let chosen = pool[0];
    for (const e of pool) {
      r -= e.weight;
      if (r <= 0) {
        chosen = e;
        break;
      }
    }
    this.fireEvent(chosen);
  }

  private fireEvent(e: RandomEvent): void {
    if (e.once) this.usedEvents.add(e.id);
    this.eventCooldown = 4;
    this.stats = applyEffects(this.stats, e.effects);
    this.eventsLog.push(e.storyClause);
    this.mode = "event";
    this.showEvent(e);
  }

  /** Body-weight change implied by an option when it has no explicit `weight`. */
  private autoWeightDelta(opt: LifeOption): number {
    // tuned so 1 junk + 1 exercise roughly cancels: balance keeps you healthy,
    // junk-heavy tips you overweight, exercise offsets it.
    if (opt.category === "food") return (opt.effects.health ?? 0) < 0 ? 3 : -1;
    if (opt.category === "health") return -3; // exercise & sports burn it off
    const t = opt.storyTag;
    if (t === "sedentary" || t === "gaming" || t === "screen" || t === "toy_phone") return 1.5;
    return 0;
  }

  private spawnFloats(eff: Partial<Stats>, wDelta = 0): void {
    let row = 0;
    const push = (text: string, color: string) => {
      this.floats.push({
        x: this.px + (row % 2 === 0 ? -18 : 18),
        y: this.py - 66 - Math.floor(row / 2) * 14,
        text,
        color,
        life: 1.1,
      });
      row++;
    };
    for (const k of STAT_KEYS) {
      const d = eff[k];
      if (!d) continue;
      push(`${d > 0 ? "+" : ""}${d} ${STAT_META[k].icon}`, d > 0 ? STAT_META[k].color : "#ff7a7a");
    }
    if (Math.abs(wDelta) >= 1) {
      // gaining weight is the "bad" direction, so colour it like a penalty
      push(`${wDelta > 0 ? "+" : ""}${Math.round(wDelta)} ⚖️`, wDelta > 0 ? "#ff9f6b" : "#7fd0a0");
    }
  }

  private advanceStage(): void {
    if (this.mode !== "playing") return; // never advance twice in one frame
    const cur = STAGES[this.stageIndex];
    const lines: string[] = [`You lived through your ${cur.name} years.`];

    // partner modifiers shape every chapter after the wedding
    if (this.partner) this.stats = applyEffects(this.stats, this.partner.modifiers);

    // education pays off when you start your career
    if (this.stageIndex + 1 === CAREER_INDEX) {
      const bonus = Math.round(this.stats.smarts * 0.2);
      this.stats.wealth = clampStat(this.stats.wealth + bonus);
      lines.push(`Your studying paid off — +${bonus} 💰 to your starting salary.`);
    }

    // your investment pot compounds between chapters — Smarts and money sense
    // grow the returns, but markets can dip too. Gains are cashed into wealth.
    if (this.investments > 0) {
      const dipChance = this.moneyWise ? 0.1 : 0.18;
      if (Math.random() < dipChance) {
        const loss = 0.08 + Math.random() * 0.16;
        this.investments = Math.max(0, this.investments * (1 - loss));
        lines.push(`📉 Markets dipped — your investments slid to ~${Math.round(this.investments)} 💰. You hold on.`);
      } else {
        const rate = 0.12 + this.stats.smarts * 0.0014 + (this.moneyWise ? 0.06 : 0);
        this.investments *= 1 + rate;
        const realised = Math.round(this.investments * 0.22);
        this.investments = Math.max(0, this.investments - realised);
        if (realised > 0) {
          this.stats.wealth = clampStat(this.stats.wealth + realised);
          lines.push(`📈 Investments grew — you cashed out +${realised} 💰 (pot ~${Math.round(this.investments)} 💰).`);
        }
      }
      this.investments = Math.min(this.investments, 300); // keep the pot sane
    }

    // spare properties pay rent every chapter
    if (this.rentalIncome > 0) {
      this.stats.wealth = clampStat(this.stats.wealth + this.rentalIncome);
      lines.push(`🏘️ Rental income: +${this.rentalIncome} 💰 from your ${this.homes.length - 1 > 1 ? "properties" : "spare property"}.`);
    }

    // wealth nudges happiness with diminishing returns (Kahneman/Killingsworth)
    this.stats.happiness = clampStat(this.stats.happiness + wealthHappinessBias(this.stats.wealth));
    this.sampleHealth();

    const next = this.stageIndex + 1;

    // A spouse with a shorter life passes in old age. Men tend to die younger,
    // so a woman's (older) husband leaves her earlier than a man's wife. Checked
    // against the age you'll be in the next chapter, before any end-of-life test.
    if (this.partner && !this.spouseDeceased && next < STAGES.length) {
      const upcomingAge = Math.max(this.age, STAGES[next].ageStart);
      if (upcomingAge >= this.spouseDeathAge()) {
        this.spouseDeceased = true;
        this.stats = applyEffects(this.stats, { happiness: -16, health: -4 });
        const who = this.gender === "female" ? "husband" : "wife";
        lines.push(`💔 Your ${who} ${this.partner.name} passed away. You grieve, but carry on.`);
      }
    }

    const le = this.lifeExp();
    if (this.stats.health <= 0) return this.finishLife("health", Math.round(this.age));
    if (next >= STAGES.length) return this.finishLife("natural", Math.round(this.age));
    if (this.age >= le) return this.finishLife(le < 70 ? "health" : "natural", Math.round(this.age));

    lines.push(`Now entering: ${STAGES[next].emoji} ${STAGES[next].name}`);
    this.transitionNext = next;
    this.transitionTimer = 2.4;
    this.mode = "transition";
    this.showTransition(lines);
  }

  private finishLife(cause: CauseOfEnd, deathAge: number): void {
    if (this.mode === "ending") return; // idempotent — only die once
    this.cause = cause;
    this.deathAge = deathAge;
    this.story = generateStory({
      history: this.history,
      finalStats: this.stats,
      partner: this.partner,
      deathAge,
      cause,
      hadChild: this.hadChild,
      gender: this.gender,
      weight: this.weight,
      occupation: this.occupation,
      homeQuality: this.homeQuality,
      widowed: this.spouseDeceased,
      events: this.eventsLog,
      habitMaster: this.habitCount >= 5,
      vehicles: VEHICLES.filter((v) => this.owned.has("veh_" + v.id)).map((v) => `a ${v.name.toLowerCase()}`),
      moneyWise: this.moneyWise,
      propertiesOwned: this.homes.length,
    });
    this.mode = "ending";
    this.showEnding();
  }

  private pickPartner(p: Partner): void {
    this.partner = p;
    this.stats = applyEffects(this.stats, { happiness: 10, health: 2 });
    this.history.push({
      stageId: "marriage",
      stageName: "Marriage & Baby",
      optionId: "wed_" + p.id,
      storyTag: undefined,
      ageAt: this.age,
    });
    this.timeline[this.stageIndex] = this.snapshot(); // re-capture: now married
    this.mode = "playing";
    this.clearOverlay();
    this.hint(`💍 You married ${p.name}, ${p.title}!`);
  }

  private pickOccupation(o: Occupation): void {
    this.occupation = o;
    if (o.perks) this.stats = applyEffects(this.stats, o.perks);
    this.history.push({
      stageId: "career",
      stageName: "Career",
      optionId: "job_" + o.id,
      storyTag: o.storyTag,
      ageAt: this.age,
    });
    this.timeline[this.stageIndex] = this.snapshot();
    this.mode = "playing";
    this.clearOverlay();
    this.hint(`${o.emoji} You became a ${o.name}!`);
  }

  private buyHouse(h: HouseTier): void {
    if (this.stats.wealth < h.cost) {
      this.hint("You can't afford that one yet.");
      return;
    }
    const owningAlready = this.homes.length > 0;
    this.stats = applyEffects(this.stats, { wealth: -h.cost, happiness: h.happiness });
    this.homes.push(h);
    this.recomputeHomes();
    this.pendingHouseOptId = null;
    this.age += this.stageStep();
    this.passiveTick();
    this.sampleHealth();
    this.history.push({
      stageId: STAGES[this.stageIndex].id,
      stageName: STAGES[this.stageIndex].name,
      optionId: "house_" + h.id,
      storyTag: owningAlready ? "rental" : "home",
      ageAt: this.age,
    });
    this.mode = "playing";
    this.clearOverlay();
    this.hint(
      owningAlready
        ? `${h.emoji} A second property! You'll rent it out for income.`
        : `${h.emoji} You bought a ${h.name.toLowerCase()}!`
    );
  }

  /**
   * You live in the nicest place you own (that sets the home background and its
   * upkeep); every other property is rented out for a per-stage income.
   */
  private recomputeHomes(): void {
    if (this.homes.length === 0) {
      this.homeQuality = 0;
      this.houseUpkeep = 0;
      this.rentalIncome = 0;
      return;
    }
    let best = this.homes[0];
    for (const h of this.homes) if (h.quality > best.quality) best = h;
    this.homeQuality = best.quality;
    this.houseUpkeep = best.upkeep;
    // the home you live in earns nothing; the rest are rentals
    let rent = 0;
    let usedLiveIn = false;
    for (const h of this.homes) {
      if (h === best && !usedLiveIn) { usedLiveIn = true; continue; }
      rent += h.rentYield;
    }
    this.rentalIncome = rent;
  }

  private buyVehicle(v: VehicleTier): void {
    const key = "veh_" + v.id;
    if (this.owned.has(key)) {
      this.hint("You already own that.");
      return;
    }
    if (this.stats.wealth < v.cost) {
      this.hint("You can't afford that one yet.");
      return;
    }
    this.owned.add(key);
    this.stats = applyEffects(this.stats, { ...v.effects, wealth: (v.effects.wealth ?? 0) - v.cost });
    this.age += this.stageStep();
    this.passiveTick();
    this.sampleHealth();
    this.history.push({
      stageId: STAGES[this.stageIndex].id,
      stageName: STAGES[this.stageIndex].name,
      optionId: "veh_" + v.id,
      storyTag: v.storyTag,
      ageAt: this.age,
    });
    this.spawnFloats({ ...v.effects, wealth: (v.effects.wealth ?? 0) - v.cost });
    this.mode = "playing";
    this.clearOverlay();
    this.hint(`${v.emoji} You bought a ${v.name.toLowerCase()}!`);
    if (this.stats.health <= 0) return this.finishLife("health", Math.round(this.age));
  }

  /** Time travel: jump back to the start of a previously-visited stage. */
  private rewind(stageIndex: number): void {
    const snap = this.timeline[stageIndex];
    if (!snap) return;
    this.stats = { ...snap.stats };
    this.weight = snap.weight;
    this.age = snap.age;
    this.homes = snap.homeIds.map((id) => HOUSE_TIERS.find((h) => h.id === id)).filter(Boolean) as HouseTier[];
    this.recomputeHomes();
    this.hadChild = snap.hadChild;
    this.spouseDeceased = snap.spouseDeceased;
    this.habitCount = snap.habitCount;
    this.investments = snap.investments;
    this.moneyWise = snap.moneyWise;
    this.owned = new Set(snap.owned);
    this.usedEvents = new Set(snap.usedEvents);
    this.eventsLog = [...snap.eventsLog];
    this.eventCooldown = 2;
    this.healthSum = snap.healthSum;
    this.healthCount = snap.healthCount;
    this.partner = snap.partnerId ? PARTNERS.find((p) => p.id === snap.partnerId) ?? null : null;
    this.occupation = snap.occupationId
      ? OCCUPATIONS.find((o) => o.id === snap.occupationId) ?? null
      : null;
    this.history = this.history.slice(0, snap.historyLen);
    this.floats = [];
    this.clearOverlay();
    this.loadStage(stageIndex);
    this.hint(`⏳ You travelled back to age ${Math.floor(this.age)}.`);
  }

  // --- main loop ------------------------------------------------------------

  private frame = (t: number): void => {
    const dt = Math.min(0.05, (t - this.lastTime) / 1000 || 0);
    this.lastTime = t;
    // a single bad frame must never freeze the whole game
    try {
      this.update(dt);
      this.render();
    } catch (err) {
      if (this.frameErrors++ < 5) console.error("[pixel-life] frame error", err);
    }
    requestAnimationFrame(this.frame);
  };

  private update(dt: number): void {
    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.hintTimer > 0) {
      this.hintTimer -= dt;
      if (this.hintTimer <= 0) this.ui.hint.textContent = "";
    }

    // floats animate in every mode
    this.floats = this.floats.filter((f) => (f.life -= dt) > 0);
    for (const f of this.floats) f.y -= dt * 26;

    if (this.mode === "transition") {
      this.actQueued = false;
      this.transitionTimer -= dt;
      if (this.transitionTimer <= 0) this.loadStage(this.transitionNext);
      return;
    }

    if (this.mode !== "playing") {
      this.moving = false;
      this.actQueued = false; // drop inputs queued while an overlay was open
      return;
    }

    // movement
    let dx = 0;
    let dy = 0;
    if (this.input.left) dx -= 1;
    if (this.input.right) dx += 1;
    if (this.input.up) dy -= 1;
    if (this.input.down) dy += 1;
    this.moving = dx !== 0 || dy !== 0;
    if (this.moving) {
      const len = Math.hypot(dx, dy) || 1;
      this.px += (dx / len) * SPEED * dt;
      this.py += (dy / len) * SPEED * dt;
      this.px = Math.max(48, Math.min(W - 36, this.px));
      this.py = Math.max(PY_MIN, Math.min(PY_MAX, this.py));
      this.walkPhase += dt * 10;
    } else {
      this.walkPhase += dt * 3;
    }

    if (this.actQueued) {
      this.actQueued = false;
      this.doAction();
    }
    // doAction may have advanced or ended the life — stop the frame if so
    if (this.mode !== "playing") return;

    this.updateFocus();

    // door
    const s = STAGES[this.stageIndex];
    const doorActive = this.age >= s.ageEnd;
    if (this.px > DOOR_X) {
      if (doorActive) this.advanceStage();
      else this.hint(`Grow a little more first (age ${Math.floor(this.age)} → ${s.ageEnd}).`);
    }
    // walking through the door transitioned us — don't also run mortality
    if (this.mode !== "playing") return;

    // continuous mortality
    const le = this.lifeExp();
    if (this.stats.health <= 0) this.finishLife("health", Math.round(this.age));
    else if (this.age >= le) this.finishLife(le < 70 ? "health" : "natural", Math.round(this.age));
  }

  private updateFocus(): void {
    let best = -1;
    let bestDx = 999;
    this.stations.forEach((st, i) => {
      const dx = Math.abs(this.px - st.x);
      const dy = Math.abs(this.py - st.y);
      if (dx < 34 && dy < 34 && dx < bestDx) {
        best = i;
        bestDx = dx;
      }
    });
    if (best !== this.focusIndex) {
      this.focusIndex = best;
      this.renderFocusPanel();
    }
  }

  // --- rendering ------------------------------------------------------------

  private render(): void {
    const ctx = this.ui.ctx;
    ctx.fillStyle = "#140d24";
    ctx.fillRect(0, 0, W, H);

    const inRoom =
      this.mode === "playing" ||
      this.mode === "transition" ||
      this.mode === "partner" ||
      this.mode === "occupation" ||
      this.mode === "house" ||
      this.mode === "vehicle" ||
      this.mode === "timetravel" ||
      this.mode === "event";
    if (inRoom && this.stageIndex < STAGES.length) {
      const s = STAGES[this.stageIndex];
      const t = this.walkPhase;
      const doorActive = this.age >= s.ageEnd;
      drawRoom(ctx, s.theme, W, H, FLOOR_Y, doorActive, t, {
        scene: s.scene,
        atHome: !!s.atHome,
        homeQuality: this.homeQuality,
      });

      // draw stations, people and the avatar together, sorted by depth (y)
      type Drawable = { y: number; station?: Station };
      const drawables: Drawable[] = this.stations.map((st) => ({ y: st.y, station: st }));
      drawables.push({ y: this.py }); // the avatar
      drawables.sort((a, b) => a.y - b.y);
      for (const d of drawables) {
        if (!d.station) {
          drawAvatar(ctx, this.px, this.py, avatarLook(this.stageIndex, this.gender), this.walkPhase, this.moving);
          continue;
        }
        const st = d.station;
        const focused = this.stations[this.focusIndex] === st && this.mode === "playing";
        const used = !!st.opt.once && this.usedOnce.has(st.opt.id);
        if (st.opt.person) {
          drawPerson(ctx, st.x, st.y, st.opt.person, this.gender, st.opt.label, focused, used, t);
        } else {
          drawStation(ctx, st.x, st.y, st.opt.icon, st.opt.label, st.opt.category, focused, used, t);
        }
      }
    }

    // floats
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 9px 'Trebuchet MS', system-ui, sans-serif";
    for (const f of this.floats) {
      ctx.globalAlpha = Math.max(0, Math.min(1, f.life));
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;

    this.renderHud();
  }

  private renderHud(): void {
    for (const k of STAT_KEYS) {
      const v = Math.round(this.stats[k]);
      const bar = this.ui.bars[k];
      bar.fill.style.width = `${this.stats[k]}%`;
      bar.val.textContent = String(v);
      bar.fill.style.opacity = v < 20 ? "0.6" : "1";
    }
    // weight meter: colour reflects healthy / over / under, not "more is better"
    const wb = this.ui.weightBar;
    wb.fill.style.width = `${this.weight}%`;
    wb.fill.style.background = weightColor(this.weight);
    wb.val.textContent = String(Math.round(this.weight));

    const s = STAGES[Math.min(this.stageIndex, STAGES.length - 1)];
    const occ = this.occupation ? ` · ${this.occupation.emoji} ${this.occupation.name}` : "";
    this.ui.stageLabel.textContent = `${s.emoji} ${s.name}${occ}`;
    this.ui.ageLabel.textContent = String(Math.floor(this.age));
    this.ui.leLabel.textContent =
      this.mode === "title" || this.mode === "setup" ? "" : ` · ~${this.lifeExp()}y`;
    this.ui.warn.style.display =
      this.mode === "playing" && (this.stats.health < 25 || weightStatus(this.weight) === "obese")
        ? "block"
        : "none";
    // time-travel pill appears once you have a past worth revisiting
    const canRewind = this.mode === "playing" && this.timeline.filter(Boolean).length > 1;
    this.ui.timeTravel.style.display = canRewind ? "flex" : "none";
  }

  private renderFocusPanel(): void {
    const panel = this.ui.focusPanel;
    if (this.focusIndex < 0) {
      panel.innerHTML = `<span class="plj-focus-title">Move with arrows / WASD</span><span class="plj-focus-desc">Walk onto a choice and press SPACE. Reach the glowing door to grow up.</span>`;
      return;
    }
    const opt = this.stations[this.focusIndex].opt;
    const mk = (text: string, color: string) => `<span class="plj-chip" style="color:${color}">${text}</span>`;
    const extra: string[] = [];
    if (opt.cost) extra.push(mk(`−${opt.cost} 💰`, "#ff8a8a"));
    if (opt.invest) extra.push(mk(`invest ${opt.invest} 📈`, "#5db8ff"));
    if (opt.gamble) {
      extra.push(mk(`stake ${opt.gamble.stake} 💰`, "#ff8a8a"));
      extra.push(mk(`win up to ${opt.gamble.jackpot} 💰`, "#3ddc84"));
    }
    const price = (opt.cost ?? 0) + (opt.invest ?? 0) + (opt.gamble?.stake ?? 0);
    const broke = price > 0 && this.stats.wealth < price;
    const press = broke
      ? `<b class="plj-press" style="background:#5a2a33;color:#ffc4c4">💸 can't afford</b>`
      : `<b class="plj-press">SPACE</b>`;
    panel.innerHTML =
      `<span class="plj-focus-title">${opt.icon} ${opt.label}</span>` +
      `<span class="plj-focus-desc">${opt.desc}</span>` +
      `<span class="plj-chips">${effectChips(opt.effects)}${extra.join("")}${press}</span>`;
  }

  private hint(text: string): void {
    this.ui.hint.textContent = text;
    this.hintTimer = 1.6;
  }

  // --- overlays -------------------------------------------------------------

  private clearOverlay(): void {
    this.ui.overlay.classList.remove("show");
    this.ui.overlay.innerHTML = "";
  }

  private showTitle(): void {
    const meters = STAT_KEYS.map(
      (k) => `<span class="plj-meter-key"><b style="color:${STAT_META[k].color}">${STAT_META[k].icon}</b> ${STAT_META[k].label}</span>`
    ).join("");
    this.ui.overlay.innerHTML = `
      <div class="plj-card plj-title">
        <h1>Pixel Life <span>Journey</span></h1>
        <p class="plj-sub">Live a whole life — from your first bottle of milk to your last sunset.</p>
        <div class="plj-meters">${meters}</div>
        <p class="plj-rules">Walk through 12 rooms, one for each stage of life. Every choice shifts your meters and ages you. Keep your <b>health</b> up or your life runs short. Chase money too hard and your joy, fun and health pay the price. At the end, read the story of the life you lived.</p>
        <button class="plj-btn" id="plj-start">Begin your life →</button>
        <p class="plj-foot">Arrows / WASD to move · SPACE to choose · or use the on-screen pad</p>
      </div>`;
    this.ui.overlay.classList.add("show");
    this.ui.overlay.querySelector<HTMLButtonElement>("#plj-start")!.onclick = () => this.showSetup();
  }

  private showSetup(): void {
    this.mode = "setup";
    this.ui.overlay.innerHTML = `
      <div class="plj-card plj-title">
        <h2>A new life begins…</h2>
        <p class="plj-sub">Is it a boy or a girl?</p>
        <div class="plj-genders">
          <button class="plj-gender" data-g="male"><span class="plj-gender-face">👦</span><span>Boy</span></button>
          <button class="plj-gender" data-g="female"><span class="plj-gender-face">👧</span><span>Girl</span></button>
        </div>
        <p class="plj-foot">You'll grow from a newborn all the way to old age.</p>
      </div>`;
    this.ui.overlay.classList.add("show");
    this.ui.overlay.querySelectorAll<HTMLButtonElement>(".plj-gender").forEach((btn) => {
      btn.onclick = () => {
        this.gender = btn.dataset.g === "female" ? "female" : "male";
        this.newGame();
      };
    });
  }

  private showTransition(lines: string[]): void {
    this.ui.overlay.innerHTML = `
      <div class="plj-card plj-grow">
        <div class="plj-grow-emoji">✨</div>
        ${lines.map((l) => `<p>${l}</p>`).join("")}
      </div>`;
    this.ui.overlay.classList.add("show");
  }

  private showPartner(): void {
    const cards = PARTNERS.map(
      (p) => `
      <button class="plj-partner" data-id="${p.id}">
        <span class="plj-partner-face">${p.emoji}</span>
        <span class="plj-partner-name">${p.name}</span>
        <span class="plj-partner-title">${p.title}</span>
        <span class="plj-partner-blurb">${p.blurb}</span>
        <span class="plj-chips">${effectChips(p.modifiers)}</span>
      </button>`
    ).join("");
    this.ui.overlay.innerHTML = `
      <div class="plj-card plj-partners-card">
        <h2>💍 Time to settle down</h2>
        <p class="plj-sub">Choose who to share the rest of your life with. They'll shape every chapter to come.</p>
        <div class="plj-partners">${cards}</div>
      </div>`;
    this.ui.overlay.classList.add("show");
    this.ui.overlay.querySelectorAll<HTMLButtonElement>(".plj-partner").forEach((btn) => {
      btn.onclick = () => {
        const p = PARTNERS.find((x) => x.id === btn.dataset.id);
        if (p) this.pickPartner(p);
      };
    });
  }

  private showOccupation(): void {
    const cards = OCCUPATIONS.map((o) => {
      const locked = this.stats.smarts < o.minSmarts;
      const pay = o.salaryMul >= 1.4 ? "💰💰💰" : o.salaryMul >= 1.0 ? "💰💰" : "💰";
      return `
      <button class="plj-partner${locked ? " locked" : ""}" data-id="${o.id}" ${locked ? "disabled" : ""}>
        <span class="plj-partner-face">${o.emoji}</span>
        <span class="plj-partner-name">${o.name}</span>
        <span class="plj-partner-title">Pay ${pay}</span>
        <span class="plj-partner-blurb">${o.blurb}</span>
        <span class="plj-chips">${locked ? `<span class="plj-chip" style="color:#ff8a8a">🔒 needs 🧠 ${o.minSmarts}</span>` : effectChips(o.perks ?? {})}</span>
      </button>`;
    }).join("");
    this.ui.overlay.innerHTML = `
      <div class="plj-card plj-partners-card">
        <h2>💼 Choose your career</h2>
        <p class="plj-sub">Your salary = the job × how smart you are. Study more to unlock better-paying jobs.</p>
        <div class="plj-partners">${cards}</div>
      </div>`;
    this.ui.overlay.classList.add("show");
    this.ui.overlay.querySelectorAll<HTMLButtonElement>(".plj-partner:not(.locked)").forEach((btn) => {
      btn.onclick = () => {
        const o = OCCUPATIONS.find((x) => x.id === btn.dataset.id);
        if (o) this.pickOccupation(o);
      };
    });
  }

  private showHouse(): void {
    const stars = (q: number) => "★".repeat(q) + "☆".repeat(5 - q);
    const cards = HOUSE_TIERS.map((h) => {
      const afford = this.stats.wealth >= h.cost;
      const upkeep = h.upkeep > 0 ? `<span class="plj-chip" style="color:#ffb4b4">−${h.upkeep}/yr upkeep</span>` : "";
      return `
      <button class="plj-partner${afford ? "" : " locked"}" data-id="${h.id}" ${afford ? "" : "disabled"}>
        <span class="plj-partner-face">${h.emoji}</span>
        <span class="plj-partner-name">${h.name}</span>
        <span class="plj-partner-title">${stars(h.quality)}</span>
        <span class="plj-partner-blurb">${h.blurb}</span>
        <span class="plj-chips"><span class="plj-chip" style="color:#ff8a8a">−${h.cost} 💰</span><span class="plj-chip" style="color:#ffd23f">+${h.happiness} 😊</span>${upkeep}<span class="plj-chip" style="color:#3ddc84">rent +${h.rentYield}</span></span>
      </button>`;
    }).join("");
    const owned = this.homes.length;
    const portfolio = owned
      ? `<p class="plj-sub" style="color:#9fe0b8">You own ${owned} ${owned === 1 ? "property" : "properties"} · live-in quality ${"★".repeat(this.homeQuality)}${this.rentalIncome > 0 ? ` · rent +${this.rentalIncome} 💰/yr` : ""}. Buy another to rent it out.</p>`
      : "";
    this.ui.overlay.innerHTML = `
      <div class="plj-card plj-partners-card">
        <h2>🏠 Buy property</h2>
        <p class="plj-sub">You live in the grandest place you own — that sets your home's look. Pricier homes cost upkeep every year, but a spare place earns rent. Buy only what you can afford.</p>
        ${portfolio}
        <div class="plj-partners">${cards}</div>
        <button class="plj-btn plj-btn-ghost" id="plj-house-cancel">Not now</button>
      </div>`;
    this.ui.overlay.classList.add("show");
    this.ui.overlay.querySelectorAll<HTMLButtonElement>(".plj-partner:not(.locked)").forEach((btn) => {
      btn.onclick = () => {
        const h = HOUSE_TIERS.find((x) => x.id === btn.dataset.id);
        if (h) this.buyHouse(h);
      };
    });
    this.ui.overlay.querySelector<HTMLButtonElement>("#plj-house-cancel")!.onclick = () => {
      this.pendingHouseOptId = null;
      this.mode = "playing";
      this.clearOverlay();
    };
  }

  private showVehicle(): void {
    const cards = VEHICLES.map((v) => {
      const owned = this.owned.has("veh_" + v.id);
      const afford = this.stats.wealth >= v.cost;
      const usable = !owned && afford;
      return `
      <button class="plj-partner${usable ? "" : " locked"}" data-id="${v.id}" ${usable ? "" : "disabled"}>
        <span class="plj-partner-face">${v.emoji}</span>
        <span class="plj-partner-name">${v.name}</span>
        <span class="plj-partner-title">${owned ? "✓ owned" : afford ? "" : "🔒 too pricey"}</span>
        <span class="plj-partner-blurb">${v.blurb}</span>
        <span class="plj-chips"><span class="plj-chip" style="color:#ff8a8a">−${v.cost} 💰</span>${effectChips(v.effects)}</span>
      </button>`;
    }).join("");
    this.ui.overlay.innerHTML = `
      <div class="plj-card plj-partners-card">
        <h2>🛵 Buy a vehicle</h2>
        <p class="plj-sub">Your own set of wheels — yours for life. A bicycle keeps you fit; a motorbike thrills; a car is comfort; a sports car is pure status. Pricier rides leave less for everything else.</p>
        <div class="plj-partners">${cards}</div>
        <button class="plj-btn plj-btn-ghost" id="plj-veh-cancel">Not now</button>
      </div>`;
    this.ui.overlay.classList.add("show");
    this.ui.overlay.querySelectorAll<HTMLButtonElement>(".plj-partner:not(.locked)").forEach((btn) => {
      btn.onclick = () => {
        const v = VEHICLES.find((x) => x.id === btn.dataset.id);
        if (v) this.buyVehicle(v);
      };
    });
    this.ui.overlay.querySelector<HTMLButtonElement>("#plj-veh-cancel")!.onclick = () => {
      this.mode = "playing";
      this.clearOverlay();
    };
  }

  private showTimeTravel(): void {
    if (this.mode !== "playing") return;
    const past: { snap: Snapshot; i: number }[] = [];
    this.timeline.forEach((snap, i) => {
      if (snap && i <= this.stageIndex) past.push({ snap, i });
    });
    if (past.length < 2) return;
    this.mode = "timetravel";
    const cards = past
      .map(({ snap, i }) => {
        const st = STAGES[i];
        return `
      <button class="plj-partner" data-i="${i}">
        <span class="plj-partner-face">${st.emoji}</span>
        <span class="plj-partner-name">${st.name}</span>
        <span class="plj-partner-title">Age ${Math.floor(snap.age)}</span>
      </button>`;
      })
      .join("");
    this.ui.overlay.innerHTML = `
      <div class="plj-card plj-partners-card">
        <h2>⏳ Time-Travel Pill</h2>
        <p class="plj-sub">Jump back to any age and re-live from there — a chance to change everything that came after.</p>
        <div class="plj-partners">${cards}</div>
        <button class="plj-btn plj-btn-ghost" id="plj-tt-cancel">Stay in the present</button>
      </div>`;
    this.ui.overlay.classList.add("show");
    this.ui.overlay.querySelectorAll<HTMLButtonElement>(".plj-partner").forEach((btn) => {
      btn.onclick = () => this.rewind(Number(btn.dataset.i));
    });
    this.ui.overlay.querySelector<HTMLButtonElement>("#plj-tt-cancel")!.onclick = () => {
      this.mode = "playing";
      this.clearOverlay();
    };
  }

  private showEvent(e: RandomEvent): void {
    const good = e.good !== false;
    this.ui.overlay.innerHTML = `
      <div class="plj-card plj-event ${good ? "plj-event-good" : "plj-event-bad"}">
        <div class="plj-event-emoji">${e.emoji}</div>
        <h2>${e.title}</h2>
        ${e.cash ? `<p class="plj-event-cash">${e.cash}</p>` : ""}
        <p class="plj-event-desc">${e.desc}</p>
        <div class="plj-chips" style="justify-content:center">${effectChips(e.effects)}</div>
        <button class="plj-btn" id="plj-event-ok">${good ? "Lucky me! ✨" : "Ugh… 😅"}</button>
      </div>`;
    this.ui.overlay.classList.add("show");
    this.ui.overlay.querySelector<HTMLButtonElement>("#plj-event-ok")!.onclick = () => {
      this.mode = "playing";
      this.clearOverlay();
    };
  }

  private showEnding(): void {
    const story = this.story!;
    const summary = STAT_KEYS.map(
      (k) => `<span class="plj-end-stat"><b style="color:${STAT_META[k].color}">${STAT_META[k].icon}</b> ${Math.round(this.stats[k])}</span>`
    ).join("");
    this.ui.overlay.innerHTML = `
      <div class="plj-card plj-end">
        <h2>${story.title}</h2>
        <p class="plj-epitaph">“${story.epitaph}”</p>
        <div class="plj-story">${story.paragraphs.map((p) => `<p>${p}</p>`).join("")}</div>
        <div class="plj-end-stats">${summary}</div>
        <button class="plj-btn" id="plj-restart">Live another life ↺</button>
      </div>`;
    this.ui.overlay.classList.add("show");
    this.ui.overlay.querySelector<HTMLButtonElement>("#plj-restart")!.onclick = () => this.newGame();
  }

  // --- input ----------------------------------------------------------------

  private bindInput(): void {
    const setDir = (e: KeyboardEvent, down: boolean): void => {
      switch (e.key) {
        case "ArrowLeft": case "a": case "A": this.input.left = down; break;
        case "ArrowRight": case "d": case "D": this.input.right = down; break;
        case "ArrowUp": case "w": case "W": this.input.up = down; break;
        case "ArrowDown": case "s": case "S": this.input.down = down; break;
        case " ": case "Enter": case "e": case "E":
          if (down) this.actQueued = true;
          break;
        case "t": case "T":
          if (down) this.showTimeTravel();
          break;
        default: return;
      }
      e.preventDefault();
    };
    window.addEventListener("keydown", (e) => setDir(e, true));
    window.addEventListener("keyup", (e) => setDir(e, false));

    const bindHold = (node: HTMLElement, key: "left" | "right" | "up" | "down"): void => {
      const on = (e: Event) => { e.preventDefault(); this.input[key] = true; };
      const off = (e: Event) => { e.preventDefault(); this.input[key] = false; };
      node.addEventListener("pointerdown", on);
      node.addEventListener("pointerup", off);
      node.addEventListener("pointerleave", off);
      node.addEventListener("pointercancel", off);
    };
    bindHold(this.ui.touch.left, "left");
    bindHold(this.ui.touch.right, "right");
    bindHold(this.ui.touch.up, "up");
    bindHold(this.ui.touch.down, "down");
    this.ui.touch.act.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      this.actQueued = true;
    });
    this.ui.timeTravel.addEventListener("click", () => this.showTimeTravel());
  }
}

function effectChips(effects: Partial<Stats>): string {
  return (Object.entries(effects) as [StatKey, number][])
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<span class="plj-chip" style="color:${v > 0 ? STAT_META[k].color : "#ff8a8a"}">${
          v > 0 ? "+" : ""
        }${v} ${STAT_META[k].icon}</span>`
    )
    .join("");
}
