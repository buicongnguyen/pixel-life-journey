import type { HistoryEntry, LifeOption, Partner, Stats, StatKey } from "./types";
import {
  START_STATS,
  STAT_KEYS,
  STAT_META,
  applyEffects,
  clampStat,
  lifeExpectancyFromHealth,
  wealthHappinessBias,
} from "./stats";
import { STAGES } from "./stages";
import { PARTNERS } from "./partners";
import { avatarLook, drawAvatar, drawRoom, drawStation } from "./sprites";
import { createUI, type UIRefs } from "./ui";
import { generateStory, type CauseOfEnd, type LifeStory } from "./story";

const W = 480;
const H = 270;
const FLOOR_Y = 196;
const DOOR_X = W - 56;
const SPEED = 124;
const CAREER_INDEX = STAGES.findIndex((s) => s.id === "career");

type Mode = "title" | "playing" | "partner" | "transition" | "ending";

interface Station {
  x: number;
  y: number;
  opt: LifeOption;
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
      historyLen: this.history.length,
    };
  }

  /** Test/debug: choose an option by id in the current stage (ignores position). */
  debugChoose(optId: string): void {
    const idx = this.stations.findIndex((s) => s.opt.id === optId);
    if (idx < 0) return;
    this.focusIndex = idx;
    this.cooldown = 0;
    this.doAction();
  }

  // --- lifecycle ------------------------------------------------------------

  private newGame(): void {
    this.stats = { ...START_STATS };
    this.age = 0;
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
    this.px = 46;
    this.py = 236;
    this.focusIndex = -1;
    this.buildStations();
    this.sampleHealth();
    if (s.isMarriage && !this.partner) {
      this.mode = "partner";
      this.showPartner();
    } else {
      this.mode = "playing";
      this.clearOverlay();
    }
  }

  private buildStations(): void {
    const opts = STAGES[this.stageIndex].options;
    const backCount = Math.ceil(opts.length / 2);
    const rows: LifeOption[][] = [opts.slice(0, backCount), opts.slice(backCount)];
    const rowY = [184, 240];
    const stations: Station[] = [];
    rows.forEach((row, r) => {
      const n = row.length;
      const xStart = 76;
      const xEnd = W - 92;
      row.forEach((opt, c) => {
        const x = n === 1 ? (xStart + xEnd) / 2 : xStart + ((xEnd - xStart) * c) / (n - 1);
        stations.push({ x, y: rowY[r], opt });
      });
    });
    this.stations = stations;
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

  private passiveTick(): void {
    const s = this.stats;
    s.health = clampStat(s.health - (0.4 + this.age * 0.012));
    s.fun = clampStat(s.fun - 0.45);
    s.happiness = clampStat(s.happiness - 0.25 - (s.health < 25 ? 0.6 : 0));
    s.smarts = clampStat(s.smarts - 0.15);
    s.wealth = clampStat(s.wealth - 0.2);
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

    const eff: Partial<Stats> = { ...opt.effects };
    if (opt.scalesWithSmarts && eff.wealth && eff.wealth > 0) {
      eff.wealth = Math.round(eff.wealth * (0.7 + this.stats.smarts / 140));
    }
    this.stats = applyEffects(this.stats, eff);

    this.age += opt.ageCost ?? this.stageStep();
    this.passiveTick();
    this.sampleHealth();
    this.cooldown = 0.28;
    if (opt.once) {
      this.usedOnce.add(opt.id);
      this.renderFocusPanel(); // reflect the "already done" state
    }
    if (opt.id === "baby") this.hadChild = true;

    this.history.push({
      stageId: s.id,
      stageName: s.name,
      optionId: opt.id,
      storyTag: opt.storyTag,
      ageAt: this.age,
    });
    this.spawnFloats(eff);

    if (this.stats.health <= 0) this.finishLife("health", Math.round(this.age));
  }

  private spawnFloats(eff: Partial<Stats>): void {
    let row = 0;
    for (const k of STAT_KEYS) {
      const d = eff[k];
      if (!d) continue;
      this.floats.push({
        x: this.px + (row % 2 === 0 ? -14 : 14),
        y: this.py - 46 - Math.floor(row / 2) * 12,
        text: `${d > 0 ? "+" : ""}${d} ${STAT_META[k].icon}`,
        color: d > 0 ? STAT_META[k].color : "#ff7a7a",
        life: 1.1,
      });
      row++;
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

    // wealth nudges happiness with diminishing returns (Kahneman/Killingsworth)
    this.stats.happiness = clampStat(this.stats.happiness + wealthHappinessBias(this.stats.wealth));
    this.sampleHealth();

    const next = this.stageIndex + 1;
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
    this.mode = "playing";
    this.clearOverlay();
    this.hint(`💍 You married ${p.name}, ${p.title}!`);
  }

  // --- main loop ------------------------------------------------------------

  private frame = (t: number): void => {
    const dt = Math.min(0.05, (t - this.lastTime) / 1000 || 0);
    this.lastTime = t;
    this.update(dt);
    this.render();
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
      this.transitionTimer -= dt;
      if (this.transitionTimer <= 0) this.loadStage(this.transitionNext);
      return;
    }

    if (this.mode !== "playing") {
      this.moving = false;
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
      this.px = Math.max(34, Math.min(W - 24, this.px));
      this.py = Math.max(168, Math.min(250, this.py));
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
      if (dx < 26 && dy < 26 && dx < bestDx) {
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

    if ((this.mode === "playing" || this.mode === "transition" || this.mode === "partner") &&
        this.stageIndex < STAGES.length) {
      const s = STAGES[this.stageIndex];
      const t = this.walkPhase;
      const doorActive = this.age >= s.ageEnd;
      drawRoom(ctx, s.theme, W, H, FLOOR_Y, doorActive, t);

      // stations sorted by y so closer ones overlap correctly
      const order = [...this.stations].sort((a, b) => a.y - b.y);
      for (const st of order) {
        const focused = this.stations[this.focusIndex] === st && this.mode === "playing";
        const used = !!st.opt.once && this.usedOnce.has(st.opt.id);
        drawStation(ctx, st.x, st.y, st.opt.icon, st.opt.label, st.opt.category, focused, used, t);
      }

      drawAvatar(ctx, this.px, this.py, avatarLook(this.stageIndex), this.walkPhase, this.moving);
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
    const s = STAGES[Math.min(this.stageIndex, STAGES.length - 1)];
    this.ui.stageLabel.textContent = `${s.emoji} ${s.name}`;
    this.ui.ageLabel.textContent = String(Math.floor(this.age));
    this.ui.leLabel.textContent = this.mode === "title" ? "" : ` · ~${this.lifeExp()}y`;
    this.ui.warn.style.display = this.mode === "playing" && this.stats.health < 25 ? "block" : "none";
  }

  private renderFocusPanel(): void {
    const panel = this.ui.focusPanel;
    if (this.focusIndex < 0) {
      panel.innerHTML = `<span class="plj-focus-title">Move with arrows / WASD</span><span class="plj-focus-desc">Walk onto a choice and press SPACE. Reach the glowing door to grow up.</span>`;
      return;
    }
    const opt = this.stations[this.focusIndex].opt;
    panel.innerHTML =
      `<span class="plj-focus-title">${opt.icon} ${opt.label}</span>` +
      `<span class="plj-focus-desc">${opt.desc}</span>` +
      `<span class="plj-chips">${effectChips(opt.effects)}<b class="plj-press">SPACE</b></span>`;
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
    this.ui.overlay.querySelector<HTMLButtonElement>("#plj-start")!.onclick = () => this.newGame();
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
