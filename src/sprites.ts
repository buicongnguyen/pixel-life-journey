import type { Gender, PersonKind, RoomTheme, SceneKind } from "./types";

// ---------------------------------------------------------------------------
// All pixel-art drawing. The game renders to a 640x360 internal canvas (see
// engine.ts) scaled up with image-rendering: pixelated, so rectangles read as
// crisp pixels. This module draws: detailed characters (player + NPCs you bond
// with), per-stage scenery, the door, and the option stations.
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
  ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
}

function shade(hex: string, amt = 34): string {
  const c = hex.replace("#", "");
  const r = Math.max(0, parseInt(c.slice(0, 2), 16) - amt);
  const g = Math.max(0, parseInt(c.slice(2, 4), 16) - amt);
  const b = Math.max(0, parseInt(c.slice(4, 6), 16) - amt);
  return `rgb(${r},${g},${b})`;
}
function tint(hex: string, amt = 30): string {
  const c = hex.replace("#", "");
  const r = Math.min(255, parseInt(c.slice(0, 2), 16) + amt);
  const g = Math.min(255, parseInt(c.slice(2, 4), 16) + amt);
  const b = Math.min(255, parseInt(c.slice(4, 6), 16) + amt);
  return `rgb(${r},${g},${b})`;
}

// ===========================================================================
// Characters
// ===========================================================================

type HairStyle = "short" | "long" | "bun";

export interface AvatarLook {
  scale: number;
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  shirt: string;
  pants: string;
  shoes: string;
  elder: boolean;
  gender: Gender;
  skirt: boolean;
}

const SKIN = "#f6c9a0";
const SHIRTS_M = ["#6b9bd0", "#7bc86b", "#e0b341", "#7f7fd0", "#5bb7a8", "#e08a5b", "#5da6e0", "#6bc090"];
const SHIRTS_F = ["#ff9ec0", "#ffb3d9", "#cf9eff", "#ff8fb0", "#b59cff", "#ff9ec9", "#e07fd0", "#ff8fc0"];

export function avatarLook(stageIndex: number, gender: Gender = "male"): AvatarLook {
  const scaleByStage = [2.3, 2.7, 3.1, 3.5, 3.9, 4.2, 4.5, 4.7, 4.7, 4.6, 4.4, 4.2];
  const elder = stageIndex >= 10;
  const senior = stageIndex >= 9;
  const child = stageIndex <= 3;
  const female = gender === "female";
  const hair = elder ? "#e2e2ea" : senior ? "#bdbdc8" : child ? "#874f23" : female ? "#5e3a1e" : "#3a2a1e";
  const shirts = female ? SHIRTS_F : SHIRTS_M;
  return {
    scale: scaleByStage[Math.max(0, Math.min(scaleByStage.length - 1, stageIndex))],
    skin: SKIN,
    hair,
    hairStyle: female ? (elder ? "bun" : "long") : "short",
    shirt: shirts[stageIndex % shirts.length],
    pants: female ? "#9a6ac4" : stageIndex >= 7 ? "#33405a" : "#3f3f6e",
    shoes: female ? "#c25b8e" : "#33293f",
    elder,
    gender,
    skirt: female && stageIndex >= 4, // girls/women wear a skirt from school age
  };
}

const PERSON_AGE_SCALE: Record<string, number> = { child: 3.0, teen: 3.9, adult: 4.4, elder: 4.2 };

export function personLook(kind: PersonKind, playerGender: Gender): AvatarLook {
  const opp: Gender = playerGender === "female" ? "male" : "female";
  type Spec = { g: Gender; age: keyof typeof PERSON_AGE_SCALE; hair: string; shirt: string };
  const map: Record<PersonKind, Spec> = {
    mother: { g: "female", age: "adult", hair: "#6a4327", shirt: "#ff9ec0" },
    father: { g: "male", age: "adult", hair: "#3a2a1e", shirt: "#6b9bd0" },
    grandma: { g: "female", age: "elder", hair: "#e2e2ea", shirt: "#c9a6d6" },
    grandpa: { g: "male", age: "elder", hair: "#cdced6", shirt: "#93a0ab" },
    sibling: { g: "male", age: "child", hair: "#874f23", shirt: "#7bc86b" },
    playmate: { g: "female", age: "child", hair: "#8a5a2e", shirt: "#ffd23f" },
    studyFriend: { g: "male", age: "teen", hair: "#3a2a1e", shirt: "#7fd0ff" },
    bestFriend: { g: "female", age: "teen", hair: "#6a4327", shirt: "#9be36b" },
    crush: { g: opp, age: "teen", hair: opp === "female" ? "#6a4327" : "#3a2a1e", shirt: opp === "female" ? "#ff8fd0" : "#7f9cff" },
    roommate: { g: "male", age: "teen", hair: "#2a2a1e", shirt: "#e08a5b" },
    coworker: { g: "female", age: "adult", hair: "#3a2a1e", shirt: "#5bb7a8" },
    boss: { g: "male", age: "adult", hair: "#2a2a2a", shirt: "#4a5562" },
    gymBuddy: { g: "male", age: "adult", hair: "#2a2018", shirt: "#ff6b6b" },
    spouse: { g: opp, age: "adult", hair: opp === "female" ? "#6a4327" : "#3a2a1e", shirt: opp === "female" ? "#ff9ec0" : "#6b9bd0" },
    child: { g: "male", age: "child", hair: "#874f23", shirt: "#ffd23f" },
    grandkid: { g: "female", age: "child", hair: "#8a5a2e", shirt: "#9be36b" },
    oldFriend: { g: "male", age: "elder", hair: "#cdced6", shirt: "#9c8cff" },
  };
  const s = map[kind];
  const female = s.g === "female";
  return {
    scale: PERSON_AGE_SCALE[s.age],
    skin: SKIN,
    hair: s.hair,
    hairStyle: female ? (s.age === "elder" ? "bun" : "long") : "short",
    shirt: s.shirt,
    pants: female ? "#9a6ac4" : "#33405a",
    shoes: female ? "#c25b8e" : "#33293f",
    elder: s.age === "elder",
    gender: s.g,
    skirt: female && s.age !== "child",
  };
}

/** Draw a detailed blocky person with feet at (cx, footY). */
export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  cx: number,
  footY: number,
  look: AvatarLook,
  walkPhase: number,
  moving: boolean
): void {
  const u = look.scale;
  const swing = moving ? Math.sin(walkPhase) : 0;
  const bob = moving ? Math.abs(Math.sin(walkPhase)) * 0.6 * u : Math.sin(walkPhase * 0.5) * 0.3 * u;
  const stoop = look.elder ? 1.4 * u : 0;

  const legH = 5 * u;
  const bodyH = 6 * u;
  const headH = 6 * u;
  const bodyW = 6.2 * u;
  const headW = 5.6 * u;

  const baseY = footY - bob;
  const legTop = baseY - legH;
  const bodyTop = legTop - bodyH + stoop;
  const headTop = bodyTop - headH + stoop * 0.4 + 0.4 * u;

  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.20)";
  ctx.beginPath();
  ctx.ellipse(cx, footY + 1, bodyW * 0.75, 1.8 * u, 0, 0, Math.PI * 2);
  ctx.fill();

  const lOff = swing * 1.1 * u;

  if (look.skirt) {
    // bare legs + shoes, then a skirt over the top of them
    const legW = 1.9 * u;
    px(ctx, cx - legW - 0.3 * u, legTop + 1.5 * u, legW, legH - 1.5 * u - lOff, look.skin);
    px(ctx, cx + 0.3 * u, legTop + 1.5 * u, legW, legH - 1.5 * u + lOff, look.skin);
    px(ctx, cx - legW - 0.3 * u, baseY - 1.3 * u - lOff, legW, 1.3 * u, look.shoes);
    px(ctx, cx + 0.3 * u, baseY - 1.3 * u + lOff, legW, 1.3 * u, look.shoes);
  } else {
    const legW = 2.3 * u;
    const gap = 0.5 * u;
    px(ctx, cx - gap - legW, legTop, legW, legH - lOff, look.pants);
    px(ctx, cx + gap, legTop, legW, legH + lOff, look.pants);
    px(ctx, cx - gap - legW, baseY - 1.4 * u - lOff, legW, 1.4 * u, look.shoes);
    px(ctx, cx + gap, baseY - 1.4 * u + lOff, legW, 1.4 * u, look.shoes);
  }

  // torso / dress
  if (look.skirt) {
    // flared skirt (trapezoid of rects) sitting on top of the legs
    const sw = bodyW + 1.2 * u;
    px(ctx, cx - sw / 2, legTop + 0.5 * u, sw, 2.2 * u, look.pants);
    px(ctx, cx - sw / 2 + 0.8 * u, legTop - 0.8 * u, sw - 1.6 * u, 1.5 * u, look.pants);
  }
  px(ctx, cx - bodyW / 2, bodyTop, bodyW, bodyH, look.shirt);
  px(ctx, cx - bodyW / 2, bodyTop + bodyH - 1.3 * u, bodyW, 1.3 * u, shade(look.shirt, 26)); // hem shade
  px(ctx, cx - bodyW / 2, bodyTop, bodyW, 1 * u, tint(look.shirt, 24)); // shoulder highlight
  // collar
  px(ctx, cx - 1.2 * u, bodyTop, 2.4 * u, 1.2 * u, look.skin);

  // arms swinging opposite the legs
  const armW = 1.7 * u;
  const armH = 4.6 * u;
  const aOff = swing * 1.1 * u;
  px(ctx, cx - bodyW / 2 - armW + 0.3 * u, bodyTop + 0.6 * u + aOff, armW, armH, look.shirt);
  px(ctx, cx + bodyW / 2 - 0.3 * u, bodyTop + 0.6 * u - aOff, armW, armH, look.shirt);
  px(ctx, cx - bodyW / 2 - armW + 0.3 * u, bodyTop + 0.6 * u + armH + aOff, armW, 1.3 * u, look.skin);
  px(ctx, cx + bodyW / 2 - 0.3 * u, bodyTop + 0.6 * u + armH - aOff, armW, 1.3 * u, look.skin);

  // head + ears
  px(ctx, cx - headW / 2, headTop, headW, headH, look.skin);
  px(ctx, cx - headW / 2 - 0.7 * u, headTop + 2.4 * u, 0.8 * u, 1.6 * u, look.skin);
  px(ctx, cx + headW / 2 - 0.1 * u, headTop + 2.4 * u, 0.8 * u, 1.6 * u, look.skin);

  // hair behind (long) first
  if (look.hairStyle === "long") {
    px(ctx, cx - headW / 2 - 0.7 * u, headTop + 1 * u, 1.5 * u, headH + 2.2 * u, look.hair);
    px(ctx, cx + headW / 2 - 0.8 * u, headTop + 1 * u, 1.5 * u, headH + 2.2 * u, look.hair);
  }
  // hair cap
  px(ctx, cx - headW / 2, headTop - 0.4 * u, headW, 2.3 * u, look.hair);
  px(ctx, cx - headW / 2, headTop, 1.1 * u, 2.6 * u, look.hair);
  px(ctx, cx + headW / 2 - 1.1 * u, headTop, 1.1 * u, 2.6 * u, look.hair);
  px(ctx, cx - headW / 2, headTop - 0.4 * u, headW, 0.7 * u, tint(look.hair, 24));
  if (look.hairStyle === "bun") {
    px(ctx, cx - 1.1 * u, headTop - 1.8 * u, 2.2 * u, 1.8 * u, look.hair);
  }

  // face: brows, eyes (white + pupil), nose, mouth, blush
  const eyeY = headTop + 2.9 * u;
  px(ctx, cx - 2 * u, eyeY - 0.9 * u, 1.4 * u, 0.5 * u, shade(look.hair, 10)); // brow L
  px(ctx, cx + 0.6 * u, eyeY - 0.9 * u, 1.4 * u, 0.5 * u, shade(look.hair, 10)); // brow R
  px(ctx, cx - 2 * u, eyeY, 1.4 * u, 1.4 * u, "#ffffff");
  px(ctx, cx + 0.6 * u, eyeY, 1.4 * u, 1.4 * u, "#ffffff");
  px(ctx, cx - 1.5 * u, eyeY + 0.3 * u, 0.8 * u, 0.9 * u, "#2a2233");
  px(ctx, cx + 0.9 * u, eyeY + 0.3 * u, 0.8 * u, 0.9 * u, "#2a2233");
  px(ctx, cx - 0.3 * u, eyeY + 1.3 * u, 0.6 * u, 0.8 * u, shade(look.skin, 30)); // nose
  px(ctx, cx - 1.3 * u, eyeY + 2.5 * u, 2.6 * u, 0.7 * u, "#b5605e"); // mouth
  px(ctx, cx - 2.4 * u, eyeY + 1.7 * u, 1 * u, 0.7 * u, "rgba(255,140,160,0.5)"); // blush
  px(ctx, cx + 1.4 * u, eyeY + 1.7 * u, 1 * u, 0.7 * u, "rgba(255,140,160,0.5)");

  if (look.elder) {
    // glasses
    px(ctx, cx - 2.1 * u, eyeY - 0.2 * u, 1.8 * u, 1.9 * u, "rgba(255,255,255,0.0)");
    ctx.strokeStyle = "#5a5a66";
    ctx.lineWidth = Math.max(1, 0.4 * u);
    ctx.strokeRect(cx - 2.1 * u, eyeY - 0.2 * u, 1.8 * u, 1.9 * u);
    ctx.strokeRect(cx + 0.5 * u, eyeY - 0.2 * u, 1.8 * u, 1.9 * u);
    // cane
    px(ctx, cx + bodyW / 2 + armW + 0.4 * u, bodyTop, 0.9 * u, legH + bodyH + 1 * u, "#7a5a36");
  }
}

export function drawAvatar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  footY: number,
  look: AvatarLook,
  walkPhase: number,
  moving: boolean
): void {
  drawCharacter(ctx, cx, footY, look, walkPhase, moving);
}

const PERSON_LABEL: Record<PersonKind, string> = {
  mother: "Mum", father: "Dad", grandma: "Grandma", grandpa: "Grandpa",
  sibling: "Sibling", playmate: "Playmate", studyFriend: "Study pal", bestFriend: "Best friend",
  crush: "Crush", roommate: "Roommate", coworker: "Coworker", boss: "Boss",
  gymBuddy: "Gym buddy", spouse: "Spouse", child: "Your child", grandkid: "Grandkid",
  oldFriend: "Old friend",
};

/** Draw an NPC option as a little person standing in the room. */
export function drawPerson(
  ctx: CanvasRenderingContext2D,
  cx: number,
  footY: number,
  kind: PersonKind,
  playerGender: Gender,
  label: string,
  focused: boolean,
  used: boolean,
  t: number
): void {
  const look = personLook(kind, playerGender);
  ctx.save();
  if (used) ctx.globalAlpha = 0.45;
  const bobActive = focused;
  drawCharacter(ctx, cx, footY - (focused ? 1 : 0), look, t * 1.4, bobActive);
  ctx.restore();

  const name = label || PERSON_LABEL[kind];
  if (focused) {
    // glowing ring + name plate
    ctx.fillStyle = "rgba(255,255,255," + (0.18 + 0.12 * Math.sin(t * 6)) + ")";
    ctx.beginPath();
    ctx.ellipse(cx, footY + 1, 11 * 1.1, 4.4, 0, 0, Math.PI * 2);
    ctx.fill();
    drawNamePlate(ctx, cx, footY - look.scale * 19, name, "#ffe9a8");
  } else {
    drawNamePlate(ctx, cx, footY - look.scale * 19, name, "rgba(255,255,255,0.85)");
  }
  if (used) {
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.fillStyle = "#3ddc84";
    ctx.textAlign = "center";
    ctx.fillText("♥", cx, footY - look.scale * 17);
  }
}

function drawNamePlate(ctx: CanvasRenderingContext2D, cx: number, y: number, text: string, color: string): void {
  ctx.font = "10px 'Trebuchet MS', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const w = ctx.measureText(text).width + 10;
  px(ctx, cx - w / 2, y - 7, w, 13, "rgba(18,12,30,0.8)");
  ctx.fillStyle = color;
  ctx.fillText(text, cx, y);
}

// ===========================================================================
// Scenery — a distinct backdrop per life stage
// ===========================================================================

export interface RoomDecor {
  scene: SceneKind;
  atHome: boolean;
  homeQuality: number;
}

export function drawRoom(
  ctx: CanvasRenderingContext2D,
  theme: RoomTheme,
  W: number,
  H: number,
  floorY: number,
  doorActive: boolean,
  t: number,
  decor: RoomDecor
): void {
  // base wall + floor
  px(ctx, 0, 0, W, floorY, theme.wall);
  px(ctx, 0, 0, W, floorY * 0.5, tint(theme.wall, 10));
  px(ctx, 0, floorY - 12, W, 12, theme.wallShade); // skirting
  px(ctx, 0, floorY, W, H - floorY, theme.floor);
  ctx.fillStyle = theme.floorShade;
  for (let x = 0; x < W; x += 40) ctx.fillRect(x, floorY, 2, H - floorY);
  px(ctx, 0, floorY, W, 3, theme.floorShade);

  drawScene(ctx, decor.scene, theme, W, floorY, t);
  if (decor.atHome && decor.homeQuality > 0) drawHomeQuality(ctx, theme, W, floorY, decor.homeQuality);

  drawDoor(ctx, theme, W, floorY, doorActive, t);
}

function window2(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, sky: string): void {
  px(ctx, x - 3, y - 3, w + 6, h + 6, "#6a5a3a");
  px(ctx, x, y, w, h, sky);
  px(ctx, x + w / 2 - 1, y, 2, h, "#6a5a3a");
  px(ctx, x, y + h / 2 - 1, w, 2, "#6a5a3a");
}

function drawScene(ctx: CanvasRenderingContext2D, scene: SceneKind, theme: RoomTheme, W: number, floorY: number, t: number): void {
  switch (scene) {
    case "nursery": {
      window2(ctx, 70, 36, 78, 56, "#bfe6ff");
      // mobile
      const mx = W * 0.62;
      px(ctx, mx - 26, 12, 52, 3, "#caa6e0");
      const sway = Math.sin(t * 1.5) * 2;
      for (const [dx, col] of [[-22, "#ff9ec0"], [0, "#9ad0ff"], [22, "#b6e3a0"]] as const) {
        px(ctx, mx + dx + sway, 15, 3, 9, "#caa6e0");
        px(ctx, mx + dx - 4 + sway, 24, 11, 8, col);
      }
      // alphabet blocks on the floor
      for (let i = 0; i < 3; i++) px(ctx, W - 150 + i * 18, floorY - 16, 15, 15, ["#ff9ec0", "#9ad0ff", "#b6e3a0"][i]);
      break;
    }
    case "playroom": {
      window2(ctx, 60, 34, 74, 52, "#bfe6ff");
      // toy shelf
      px(ctx, W - 168, 40, 120, 60, shade(theme.wall, 18));
      for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) px(ctx, W - 160 + c * 28, 48 + r * 28, 18, 18, ["#ffd23f", "#ff8fd0", "#7fd0ff", "#9be36b"][(r + c) % 4]);
      // ball + rug
      px(ctx, 150, floorY - 14, 16, 16, "#ff6b6b");
      break;
    }
    case "school": {
      // blackboard
      px(ctx, 64, 26, 220, 86, "#26402f");
      px(ctx, 60, 22, 228, 6, "#6a5a3a");
      ctx.fillStyle = "rgba(235,235,220,0.85)";
      ctx.font = "13px 'Trebuchet MS', monospace";
      ctx.textAlign = "left";
      ctx.fillText("A B C  1 2 3", 78, 56);
      ctx.fillText("2 + 2 = 4", 78, 80);
      px(ctx, 250, 104, 26, 4, "#caa37a"); // chalk ledge
      // clock
      px(ctx, W - 150, 30, 26, 26, "#e8e8ee");
      px(ctx, W - 138, 34, 2, 11, "#333");
      px(ctx, W - 138, 42, 8, 2, "#333");
      // lockers
      for (let i = 0; i < 4; i++) px(ctx, W - 110 + i * 26, 70, 22, 50, i % 2 ? "#5a7a9e" : "#4a6a8e");
      // desks
      for (let i = 0; i < 3; i++) px(ctx, 80 + i * 80, floorY - 18, 46, 16, "#9a7a4a");
      break;
    }
    case "campus": {
      window2(ctx, 60, 30, 120, 70, "#a9d4ff");
      // pennant banner
      px(ctx, W - 180, 28, 110, 26, "#7a3f9e");
      ctx.fillStyle = "#ffe9a8";
      ctx.font = "12px 'Trebuchet MS', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("UNIVERSITY", W - 125, 45);
      // bookshelf
      px(ctx, W - 150, 64, 96, 56, shade(theme.wall, 16));
      for (let i = 0; i < 8; i++) px(ctx, W - 146 + i * 11, 70 + (i % 2) * 26, 8, 24, ["#ff6b6b", "#6bd0ff", "#9be36b", "#ffd23f"][i % 4]);
      break;
    }
    case "office": {
      // city skyline window
      window2(ctx, 56, 26, 150, 78, "#8fb8e6");
      for (let i = 0; i < 6; i++) px(ctx, 64 + i * 24, 90 - (i % 3) * 18, 18, 16 + (i % 3) * 18, "#41506a");
      // clock + water cooler + monitor on desk
      px(ctx, W - 150, 30, 24, 24, "#e8e8ee");
      px(ctx, W - 120, 66, 22, 54, "#9fd6e8");
      px(ctx, W - 96, 78, 6, 42, "#cfe6ee");
      px(ctx, 96, floorY - 26, 60, 18, "#6a7886"); // desk
      px(ctx, 110, floorY - 44, 30, 20, "#222"); // monitor
      px(ctx, 113, floorY - 41, 24, 14, "#5fd0ff");
      break;
    }
    case "home": {
      window2(ctx, 58, 30, 90, 60, "#bfe0ff");
      // sofa
      px(ctx, W - 200, floorY - 34, 120, 26, "#9a5a6a");
      px(ctx, W - 200, floorY - 46, 120, 14, "#b06a7a");
      px(ctx, W - 204, floorY - 44, 12, 36, "#b06a7a");
      px(ctx, W - 92, floorY - 44, 12, 36, "#b06a7a");
      // TV
      px(ctx, 92, 60, 70, 44, "#1c1c24");
      px(ctx, 96, 64, 62, 36, "#3a4a6a");
      px(ctx, 120, 104, 14, 8, "#1c1c24");
      break;
    }
    case "sunset": {
      // big warm sunset window
      px(ctx, 54, 24, 150, 92, "#6a4a5e");
      const grd = ctx.createLinearGradient(0, 24, 0, 116);
      grd.addColorStop(0, "#ffd6a8");
      grd.addColorStop(0.6, "#ff9e7a");
      grd.addColorStop(1, "#c46a8e");
      ctx.fillStyle = grd;
      ctx.fillRect(58, 28, 142, 84);
      px(ctx, 120, 70, 22, 22, "#ffe9b0"); // sun
      px(ctx, 58, 96, 142, 16, "#9e6a8a"); // distant hills
      // rocking chair
      px(ctx, W - 150, floorY - 40, 10, 40, "#7a5a36");
      px(ctx, W - 150, floorY - 44, 40, 10, "#8a6a40");
      break;
    }
  }
}

function drawHomeQuality(ctx: CanvasRenderingContext2D, theme: RoomTheme, W: number, floorY: number, q: number): void {
  if (q === 1) {
    for (const [x, y] of [[210, 40], [W - 230, 60], [320, 90]] as const) {
      const c = "rgba(0,0,0,0.30)";
      px(ctx, x, y, 2, 10, c); px(ctx, x + 2, y + 8, 2, 8, c); px(ctx, x - 2, y + 14, 2, 9, c); px(ctx, x + 3, y + 20, 2, 8, c);
    }
    return;
  }
  for (let i = 0; i < q; i++) {
    const fx = 220 + i * 48;
    px(ctx, fx, 30, 34, 28, "#5a4632");
    px(ctx, fx + 4, 34, 26, 20, theme.accent);
    px(ctx, fx + 4, 45, 26, 9, shade(theme.accent, 26));
  }
  if (q >= 3) drawPlant(ctx, 24, floorY);
  if (q >= 4) {
    px(ctx, 0, 0, W, 5, "#ffd76b");
    drawPlant(ctx, W - 40, floorY);
  }
}

function drawPlant(ctx: CanvasRenderingContext2D, x: number, floorY: number): void {
  px(ctx, x, floorY - 10, 16, 10, "#9e6b3f");
  px(ctx, x + 2, floorY - 28, 12, 18, "#3f9e5a");
  px(ctx, x + 4, floorY - 36, 8, 10, "#4fb56b");
}

function drawDoor(ctx: CanvasRenderingContext2D, theme: RoomTheme, W: number, floorY: number, doorActive: boolean, t: number): void {
  const dw = 58;
  const dh = 124;
  const dx = W - dw - 10;
  const dy = floorY - dh;
  px(ctx, dx - 5, dy - 5, dw + 10, dh + 5, theme.wallShade);
  px(ctx, dx, dy, dw, dh, doorActive ? theme.accent : "#2c2438");
  if (doorActive) {
    const a = 0.35 + 0.25 * Math.sin(t * 4);
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fillRect(dx, dy, dw, dh);
    px(ctx, dx + dw / 2 - 3, dy + dh / 2 - 14, 6, 28, "#27202e");
    drawArrow(ctx, dx + dw / 2 + 11, dy + dh / 2, "#27202e");
  } else {
    px(ctx, dx + dw - 14, dy + dh / 2 - 4, 6, 8, theme.accent);
  }
}

function drawArrow(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  px(ctx, x - 10, y - 3, 10, 5, color);
  px(ctx, x - 3, y - 8, 4, 4, color);
  px(ctx, x - 3, y + 4, 4, 4, color);
  px(ctx, x + 1, y - 4, 4, 4, color);
  px(ctx, x + 1, y, 4, 4, color);
}

// ===========================================================================
// Option stations (non-person choices)
// ===========================================================================

const CAT_TINT: Record<string, string> = {
  health: "#ff5d6c", food: "#ffa14d", fun: "#ff8fd0", smarts: "#5db8ff",
  wealth: "#3ddc84", social: "#ffd23f", rest: "#9c8cff", special: "#ffffff",
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
  const tintC = CAT_TINT[category] ?? "#ffffff";
  const bob = focused ? Math.sin(t * 6) * 3 : 0;
  const plate = 36;
  const top = y - plate - 12 + bob;

  // pedestal
  px(ctx, x - 22, y - 4, 44, 12, "#241d33");
  px(ctx, x - 22, y - 4, 44, 3, "#3a3350");
  // glow when focused
  if (focused) {
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.ellipse(x, y + 2, 24, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // icon plate (bevelled)
  ctx.save();
  if (used) ctx.globalAlpha = 0.4;
  px(ctx, x - plate / 2, top, plate, plate, focused ? tintC : "#2c2640");
  px(ctx, x - plate / 2, top, plate, 4, focused ? "#ffffff" : tintC);
  px(ctx, x - plate / 2, top + plate - 4, plate, 4, shade(focused ? tintC : "#2c2640", 24));
  ctx.font = "24px system-ui, 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(icon, x, top + plate / 2 + 1);
  if (used) {
    ctx.fillStyle = "#3ddc84";
    ctx.font = "16px system-ui, sans-serif";
    ctx.fillText("✓", x + 13, top + 6);
  }
  ctx.restore();

  // label when focused
  if (focused) {
    ctx.font = "10px 'Trebuchet MS', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const w = ctx.measureText(label).width + 12;
    px(ctx, x - w / 2, top - 14, w, 14, "rgba(18,12,30,0.85)");
    ctx.fillStyle = "#fff";
    ctx.fillText(label, x, top - 7);
  }
}
