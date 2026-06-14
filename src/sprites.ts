import type { RoomTheme } from "./types";

// ---------------------------------------------------------------------------
// All pixel-art drawing. The game renders to a small internal canvas
// (see engine.ts) which is scaled up with image-rendering: pixelated, so simple
// rectangles read as crisp pixels.
// ---------------------------------------------------------------------------

function px(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string
): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export interface AvatarLook {
  scale: number;
  skin: string;
  hair: string;
  shirt: string;
  pants: string;
  elder: boolean;
}

const SKIN = "#f3c79b";
const SHIRTS = [
  "#ff9ecb", "#7fd0ff", "#a6e36b", "#ffc14d", "#b59cff",
  "#6bd6c2", "#ff8d6b", "#7f9cff", "#e07fd0", "#9c8cff",
  "#7fc9a6", "#d6b06b",
];

export function avatarLook(stageIndex: number): AvatarLook {
  const scaleByStage = [1.7, 2.0, 2.3, 2.6, 2.9, 3.1, 3.3, 3.4, 3.4, 3.4, 3.3, 3.2];
  const elder = stageIndex >= 10;
  const senior = stageIndex >= 9;
  const child = stageIndex <= 3;
  const hair = elder
    ? "#d9d9e2"
    : senior
    ? "#b7b7c4"
    : child
    ? "#7a4a1e"
    : "#3a2a1e";
  return {
    scale: scaleByStage[Math.max(0, Math.min(scaleByStage.length - 1, stageIndex))],
    skin: SKIN,
    hair,
    shirt: SHIRTS[stageIndex % SHIRTS.length],
    pants: stageIndex >= 7 ? "#2f3a4a" : "#3a3a6a",
    elder,
  };
}

/**
 * Draw a blocky person standing with feet at (cx, footY).
 * walkPhase animates legs/arms; `moving` toggles walk vs idle bob.
 */
export function drawAvatar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  footY: number,
  look: AvatarLook,
  walkPhase: number,
  moving: boolean
): void {
  const u = look.scale;
  const swing = moving ? Math.sin(walkPhase) : 0;
  const bob = moving ? 0 : Math.sin(walkPhase * 0.5) * 0.4;
  const stoop = look.elder ? 1.2 * u : 0;

  // measured in units, built upward from feet
  const legH = 5 * u;
  const bodyH = 6 * u;
  const headH = 6 * u;
  const bodyW = 7 * u;
  const headW = 6 * u;

  const baseY = footY + bob;
  const legTop = baseY - legH;
  const bodyTop = legTop - bodyH + stoop;
  const headTop = bodyTop - headH + stoop * 0.4;

  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(cx, footY + 1, bodyW * 0.7, 1.8 * u, 0, 0, Math.PI * 2);
  ctx.fill();

  // legs (alternating with swing)
  const legW = 2.4 * u;
  const legGap = 0.6 * u;
  const lOff = swing * 1.2 * u;
  px(ctx, cx - legGap - legW, legTop, legW, legH - lOff, look.pants);
  px(ctx, cx + legGap, legTop, legW, legH + lOff, look.pants);
  // shoes
  px(ctx, cx - legGap - legW, baseY - 1.2 * u - lOff, legW, 1.2 * u, "#2a2030");
  px(ctx, cx + legGap, baseY - 1.2 * u + lOff, legW, 1.2 * u, "#2a2030");

  // body
  px(ctx, cx - bodyW / 2, bodyTop, bodyW, bodyH, look.shirt);
  // simple belly/shade
  px(ctx, cx - bodyW / 2, bodyTop + bodyH - 1.4 * u, bodyW, 1.4 * u, shade(look.shirt));

  // arms swinging opposite to legs
  const armW = 1.7 * u;
  const armH = 5 * u;
  const aOff = swing * 1.2 * u;
  px(ctx, cx - bodyW / 2 - armW, bodyTop + 0.4 * u + aOff, armW, armH, look.shirt);
  px(ctx, cx + bodyW / 2, bodyTop + 0.4 * u - aOff, armW, armH, look.shirt);
  // hands
  px(ctx, cx - bodyW / 2 - armW, bodyTop + 0.4 * u + armH + aOff, armW, 1.4 * u, look.skin);
  px(ctx, cx + bodyW / 2, bodyTop + 0.4 * u + armH - aOff, armW, 1.4 * u, look.skin);

  // head
  px(ctx, cx - headW / 2, headTop, headW, headH, look.skin);
  // hair (top + sides)
  px(ctx, cx - headW / 2, headTop, headW, 1.8 * u, look.hair);
  px(ctx, cx - headW / 2, headTop, 1.2 * u, 3 * u, look.hair);
  px(ctx, cx + headW / 2 - 1.2 * u, headTop, 1.2 * u, 3 * u, look.hair);
  // eyes
  const eyeY = headTop + 3 * u;
  px(ctx, cx - 1.7 * u, eyeY, 1 * u, 1.2 * u, "#27202e");
  px(ctx, cx + 0.7 * u, eyeY, 1 * u, 1.2 * u, "#27202e");
  // smile
  px(ctx, cx - 1.2 * u, eyeY + 2 * u, 2.4 * u, 0.7 * u, "#b5605e");

  // elder cane
  if (look.elder) {
    px(ctx, cx + bodyW / 2 + armW + 0.6 * u, bodyTop, 0.9 * u, legH + bodyH, "#7a5a36");
  }
}

function shade(hex: string): string {
  const c = hex.replace("#", "");
  const r = Math.max(0, parseInt(c.slice(0, 2), 16) - 34);
  const g = Math.max(0, parseInt(c.slice(2, 4), 16) - 34);
  const b = Math.max(0, parseInt(c.slice(4, 6), 16) - 34);
  return `rgb(${r},${g},${b})`;
}

export function drawRoom(
  ctx: CanvasRenderingContext2D,
  theme: RoomTheme,
  W: number,
  H: number,
  floorY: number,
  doorActive: boolean,
  t: number
): void {
  // wall
  px(ctx, 0, 0, W, floorY, theme.wall);
  // wall wainscot band
  px(ctx, 0, floorY - 10, W, 10, theme.wallShade);
  // two windows / pictures
  for (const wx of [70, W - 130]) {
    px(ctx, wx, 26, 60, 40, theme.wallShade);
    px(ctx, wx + 4, 30, 52, 32, theme.accent);
    px(ctx, wx + 28, 26, 4, 40, theme.wallShade);
    px(ctx, wx, 44, 60, 4, theme.wallShade);
  }
  // floor
  px(ctx, 0, floorY, W, H - floorY, theme.floor);
  // floor boards
  ctx.fillStyle = theme.floorShade;
  for (let x = 0; x < W; x += 32) ctx.fillRect(x, floorY, 2, H - floorY);
  px(ctx, 0, floorY, W, 3, theme.floorShade);

  // door on the right
  const dw = 46;
  const dh = 96;
  const dx = W - dw - 8;
  const dy = floorY - dh;
  px(ctx, dx - 4, dy - 4, dw + 8, dh + 4, theme.wallShade);
  px(ctx, dx, dy, dw, dh, doorActive ? theme.accent : "#2c2438");
  if (doorActive) {
    // glow pulse + arrow
    const a = 0.35 + 0.25 * Math.sin(t * 4);
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fillRect(dx, dy, dw, dh);
    px(ctx, dx + dw / 2 - 2, dy + dh / 2 - 10, 4, 20, "#27202e");
    drawArrow(ctx, dx + dw / 2 + 8, dy + dh / 2, "#27202e");
  } else {
    px(ctx, dx + dw - 12, dy + dh / 2 - 3, 5, 6, theme.accent); // knob
  }
}

function drawArrow(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  px(ctx, x - 8, y - 2, 8, 4, color);
  px(ctx, x - 2, y - 6, 3, 3, color);
  px(ctx, x - 2, y + 3, 3, 3, color);
  px(ctx, x + 1, y - 3, 3, 3, color);
  px(ctx, x + 1, y, 3, 3, color);
}

const CAT_TINT: Record<string, string> = {
  health: "#ff5d6c",
  food: "#ffa14d",
  fun: "#ff8fd0",
  smarts: "#5db8ff",
  wealth: "#3ddc84",
  social: "#ffd23f",
  rest: "#9c8cff",
  special: "#ffffff",
};

export function drawStation(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  icon: string,
  label: string,
  category: string,
  focused: boolean,
  used: boolean,
  t: number
): void {
  const tint = CAT_TINT[category] ?? "#ffffff";
  const bob = focused ? Math.sin(t * 6) * 2 : 0;
  const top = y - 34 + bob;

  // pedestal
  px(ctx, x - 16, y - 6, 32, 10, "#2a2336");
  px(ctx, x - 16, y - 6, 32, 3, "#3a3350");

  // icon plate
  ctx.save();
  if (used) ctx.globalAlpha = 0.4;
  px(ctx, x - 13, top, 26, 26, focused ? tint : "#2c2640");
  px(ctx, x - 13, top, 26, 3, focused ? "#ffffff" : tint);

  // emoji icon
  ctx.font = "18px system-ui, 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(icon, x, top + 14);

  if (used) {
    ctx.fillStyle = "#3ddc84";
    ctx.font = "14px system-ui, sans-serif";
    ctx.fillText("✓", x + 10, top + 4);
  }
  ctx.restore();

  // label
  if (focused) {
    ctx.font = "8px 'Trebuchet MS', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const w = ctx.measureText(label).width + 8;
    px(ctx, x - w / 2, top - 13, w, 11, "rgba(20,14,30,0.85)");
    ctx.fillStyle = "#fff";
    ctx.fillText(label, x, top - 11);
  }
}
