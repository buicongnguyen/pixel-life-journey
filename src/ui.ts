import type { StatKey } from "./types";
import { STAT_KEYS, STAT_META } from "./stats";

// ---------------------------------------------------------------------------
// Builds the DOM around the canvas: the top HUD (five meters + age), the bottom
// focus panel, on-screen touch controls, and an overlay layer used for the
// title screen, the marriage partner picker and the ending. The engine reads
// and writes these refs directly.
// ---------------------------------------------------------------------------

export interface UIRefs {
  frame: HTMLElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  stageLabel: HTMLElement;
  ageLabel: HTMLElement;
  leLabel: HTMLElement;
  bars: Record<StatKey, { fill: HTMLElement; val: HTMLElement }>;
  weightBar: { fill: HTMLElement; val: HTMLElement };
  warn: HTMLElement;
  focusPanel: HTMLElement;
  hint: HTMLElement;
  timeTravel: HTMLElement;
  overlay: HTMLElement;
  touch: Record<"up" | "down" | "left" | "right" | "act", HTMLElement>;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  html?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

export function createUI(mount: HTMLElement): UIRefs {
  mount.innerHTML = "";
  const frame = el("div", "plj-frame");

  // --- top HUD --------------------------------------------------------------
  const hud = el("div", "plj-hud");
  const topRow = el("div", "plj-hud-top");
  const stageLabel = el("span", "plj-stage", "👶 Newborn");
  const ageWrap = el("span", "plj-age");
  const ageLabel = el("span", "plj-age-num", "0");
  const leLabel = el("span", "plj-le", "");
  ageWrap.append(document.createTextNode("Age "), ageLabel, leLabel);
  topRow.append(stageLabel, ageWrap);

  const barsRow = el("div", "plj-bars");
  const bars = {} as Record<StatKey, { fill: HTMLElement; val: HTMLElement }>;
  for (const k of STAT_KEYS) {
    const meta = STAT_META[k];
    const item = el("div", "plj-bar");
    item.title = meta.label;
    const icon = el("span", "plj-bar-icon", meta.icon);
    const track = el("div", "plj-bar-track");
    const fill = el("div", "plj-bar-fill");
    fill.style.background = meta.color;
    const val = el("span", "plj-bar-val", "0");
    track.append(fill);
    item.append(icon, track, val);
    barsRow.append(item);
    bars[k] = { fill, val };
  }
  // 6th meter: body weight (colour shows healthy/over/under, not "more is better")
  const wItem = el("div", "plj-bar");
  wItem.title = "Weight";
  const wIcon = el("span", "plj-bar-icon", "⚖️");
  const wTrack = el("div", "plj-bar-track");
  const wFill = el("div", "plj-bar-fill");
  const wVal = el("span", "plj-bar-val", "50");
  wTrack.append(wFill);
  wItem.append(wIcon, wTrack, wVal);
  barsRow.append(wItem);
  const weightBar = { fill: wFill, val: wVal };
  hud.append(topRow, barsRow);

  // --- canvas ---------------------------------------------------------------
  const stage = el("div", "plj-stage-wrap");
  const canvas = el("canvas", "plj-canvas");
  canvas.width = 480;
  canvas.height = 270;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  const warn = el("div", "plj-warn", "⚠️ Your health is failing!");
  const hint = el("div", "plj-hint");
  const timeTravel = el("button", "plj-timetravel", "⏳");
  timeTravel.title = "Time travel (T)";
  stage.append(canvas, warn, hint, timeTravel);

  // --- bottom focus panel ---------------------------------------------------
  const focusPanel = el(
    "div",
    "plj-focus",
    `<span class="plj-focus-title">Move with arrows / WASD</span><span class="plj-focus-desc">Walk onto a glowing choice and press SPACE. Reach the door on the right to grow up.</span>`
  );

  // --- touch controls -------------------------------------------------------
  const touchWrap = el("div", "plj-touch");
  const dpad = el("div", "plj-dpad");
  const up = el("button", "plj-tbtn plj-up", "▲");
  const left = el("button", "plj-tbtn plj-left", "◀");
  const right = el("button", "plj-tbtn plj-right", "▶");
  const down = el("button", "plj-tbtn plj-down", "▼");
  dpad.append(up, left, right, down);
  const act = el("button", "plj-act", "✓");
  touchWrap.append(dpad, act);

  // --- overlay --------------------------------------------------------------
  const overlay = el("div", "plj-overlay");

  frame.append(hud, stage, focusPanel, touchWrap, overlay);
  mount.append(frame);

  return {
    frame,
    canvas,
    ctx,
    stageLabel,
    ageLabel,
    leLabel,
    bars,
    weightBar,
    warn,
    focusPanel,
    hint,
    timeTravel,
    overlay,
    touch: { up, down, left, right, act },
  };
}
