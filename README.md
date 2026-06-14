# 👶 Pixel Life Journey

A 2D pixel-art **life simulation**. Live one whole life — from your first bottle of
milk to your last sunset — by walking left to right through twelve rooms, one for each
stage of life. Every choice you make shifts your five life meters and ages you. Keep
them in balance, and at the very end the game writes the **story of the life you lived**.

**▶ Play it live:** https://buicongnguyen.github.io/pixel-life-journey/

---

## 🎮 How to play

1. **Pick boy or girl** at birth, then walk around each room with the **arrow keys / WASD**
   (or the on-screen D-pad on a phone).
2. Step onto a glowing **choice** and press **Space** to do it. Each choice changes your
   meters — ❤️ Health, 😊 Happiness, 💰 Wealth, 🎉 Fun, 🧠 Smarts, ⚖️ Weight — and ages you.
3. When you're old enough, the **door on the right glows** — walk into it to grow up
   into the next stage of life.
4. **Keep your balance.** Live on junk food and your weight climbs and your health
   collapses. Chase money with endless overtime and your fun, happiness and health pay for
   it. Study hard to unlock better-paid careers, buy the nicest home you can afford, marry
   well, stay active.
5. Changed your mind? Tap the **⏳ time-travel pill** (or press `T`) to jump back to any
   age and re-live from there.
6. At the end, read your **life story** — then live another.

> The little `~78y` next to your age is your **life expectancy**. It rises and falls with
> how well you look after your health and weight.

## ✨ What you control

- **👦/👧 Gender** at birth (changes your character and story).
- **👨‍👩‍👧 The people in your life** — bond with the characters in each room: **Mum, Dad,
  Grandma, Grandpa** as a baby; **study pals, best friends and a first crush** at school;
  a **coworker and gym buddy** at work; your **spouse, kids, grandkids and old friends**
  later on. Connection is one of the biggest drivers of a long, happy life.
- **🧸 Toys** — toy car, doll, smartphone — each a different childhood trade-off.
- **⚖️ Weight** — a live meter; junk food piles it on, exercise burns it off, and being
  over- or under-weight quietly costs you health.
- **💼 Occupation** — choose a career (Doctor, Engineer, Teacher, Artist…). Your salary =
  the job × how smart you are, and the best jobs are locked until you're smart enough.
- **🏠 A house** — buy what you can afford; a grand home is bright, a cheap one is cracked
  and run-down, and it becomes the backdrop of the rest of your life.
- **⏳ Time travel** — rewind to any past age and try a different life.
- **🎲 Twists of fate** — surprise events pop up as you live: find a wallet (+$100k), hit
  a 🎟️ lottery jackpot (+$500k), inherit a fortune, go viral, adopt a puppy — or cop the
  odd scam or medical bill. They're woven into your life story.
- **📗 The good-habits book** — a special item that rewards repetition: read it **5+ times**
  across your life and the habit sticks, giving you lasting health.

Every stage has its **own hand-drawn pixel backdrop** — a pastel nursery, a classroom,
a campus, an office, your home — and **everything is interconnected**: poverty is
stressful, loneliness and poor health drag your mood, and marrying as a woman means your
husband sadly tends to pass before you do.

## 🌱 The twelve stages

👶 Newborn → 🧒 Toddler → 🧒 Early Childhood → 🎒 Elementary → 📐 Middle School →
🎓 High School → 🏛️ University → 💼 Career → 💍 Marriage & Baby → 🧑‍🦳 Middle Age →
👴 Senior → 🌅 Retirement → ⚰️ The End

At the **Marriage & Baby** stage you choose one of eight partners — and who you marry
shapes every chapter that follows.

## 🧠 It's modelled on real research

The balance between the meters is based on published findings, so playing well rewards
the same habits that help in real life:

- **Money buys happiness with diminishing returns** — being broke hurts a lot, extra
  riches help less and less (Kahneman & Killingsworth, 2023).
- **~90% of longevity is lifestyle** — diet, exercise, **sleep** and social connection
  drive your life expectancy (Harvard Nutrition Source; longevity-habits research).
- **Overwork backfires** — the biggest pay cheques cost you health, fun and happiness
  (WHO/ILO long-working-hours review).

See [`DESIGN.md`](DESIGN.md) for the full balance model, the life-stage graph, every
option's effects, and the sources.

## 🗺️ Coming next

A **Biography mode**: a guided author flow to recreate a real person's life (name,
gender, and the choices that actually happened at each stage), plus the ability to add
your own custom stages and items — so you can record and replay it as the **biography of
a grandparent, parent, or yourself** to share with family.

---

## 🛠️ Tech

- **Vite + TypeScript** and a hand-rolled **HTML5 Canvas** pixel renderer — no game engine.
- Zero runtime dependencies; everything runs in the browser, nothing is stored or sent.
- One internal 480×270 canvas scaled up with `image-rendering: pixelated` for crisp pixels.

## 💻 Develop

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check + production build into dist/
npm run preview  # preview the production build
```

A debug handle is exposed as `window.__pixelLife` for testing (state snapshot,
`debugChoose(id)`).

## 📁 Project structure

```
src/
├── main.ts        # bootstrap
├── engine.ts      # game state, loop, input, rendering, overlays
├── stages.ts      # the 12 life stages + their options (all game content)
├── partners.ts    # the 8 marriage candidates
├── occupations.ts # careers + salary multipliers (pay scales with Smarts)
├── houses.ts      # buyable house tiers + home quality
├── events.ts      # random "Easter egg" events (wallet, lottery, inheritance…)
├── stats.ts       # the meters (incl. weight) + research-grounded balance math
├── story.ts       # the life-story writer (pre-written comment bank)
├── sprites.ts     # pixel-art drawing (rooms, the growing character, stations)
├── ui.ts          # DOM: HUD, focus panel, touch controls, overlay
├── types.ts       # shared types
└── style.css      # retro UI styling
```

## 🚀 Deploy

Pushing to `main` triggers `.github/workflows/deploy-pages.yml`, which builds the site
and publishes `dist/` to GitHub Pages. To enable it the first time: repo **Settings →
Pages → Build and deployment → Source: GitHub Actions**.

---

Made with pixels and a little life advice. Live well. 🌅
