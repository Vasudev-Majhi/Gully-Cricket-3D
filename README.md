<div align="center">

```
   ██████╗ ██╗   ██╗██╗     ██╗  ██╗   ██╗     ██████╗██████╗ ██╗ ██████╗██╗  ██╗███████╗████████╗
  ██╔════╝ ██║   ██║██║     ██║  ╚██╗ ██╔╝    ██╔════╝██╔══██╗██║██╔════╝██║ ██╔╝██╔════╝╚══██╔══╝
  ██║  ███╗██║   ██║██║     ██║   ╚████╔╝     ██║     ██████╔╝██║██║     █████╔╝ █████╗     ██║
  ██║   ██║██║   ██║██║     ██║    ╚██╔╝      ██║     ██╔══██╗██║██║     ██╔═██╗ ██╔══╝     ██║
  ╚██████╔╝╚██████╔╝███████╗███████╗██║       ╚██████╗██║  ██║██║╚██████╗██║  ██╗███████╗   ██║
   ╚═════╝  ╚═════╝ ╚══════╝╚══════╝╚═╝        ╚═════╝╚═╝  ╚═╝╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝   ╚═╝
                                  ━━━━━━  3 D   E D I T I O N  ━━━━━━
```

### 🏏 A cinematic first-person Indian gully cricket experience — in your browser 🌇

*Bat. Bowl. Smash the aunty's window. Watch the dog wake up.*

<br>

[![Three.js](https://img.shields.io/badge/Three.js-r184-000000?style=for-the-badge&logo=three.js&logoColor=white)](https://threejs.org/)
[![cannon-es](https://img.shields.io/badge/cannon--es-0.20-FF6B35?style=for-the-badge&logo=javascript&logoColor=white)](https://pmndrs.github.io/cannon-es/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![JavaScript](https://img.shields.io/badge/Vanilla_JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/docs/Web/JavaScript)
[![Built with Claude](https://img.shields.io/badge/Built_with-Claude_Code-D97757?style=for-the-badge&logo=anthropic&logoColor=white)](https://claude.com/claude-code)

<br>

[**▶ Play Demo**](#-quick-start) · [**📐 Physics Codex**](#-physics-the-locked-tuning) · [**🤖 Codex Twin**](https://github.com/Vasudev-Majhi/Gully-Cricket-3D-Codex) · [**🎮 Controls**](#-controls)

</div>

---

## 🌇 The Scene

A narrow Indian residential gully during **golden hour**. Two-story apartments lean over the lane. Laundry sways between balconies. An aunty stands watch from her window. A stray dog naps near a parked Activa. An uncle reads the newspaper on a plastic chair.

You hold the bat. A ball comes hurtling down the pitch.

**One swing decides everything.**

> Hit a six into the apartment window? Glass shatters. Aunty screams. Dog barks. The gully wakes up.

<br>

<div align="center">

| 🎬 **Cinematic** | ⚡ **Real Physics** | 🪟 **Destructible** | 🎥 **3 Cameras** |
|:---:|:---:|:---:|:---:|
| Golden-hour HDRI<br>ACES tone mapping<br>UnrealBloom post-FX | cannon-es rigid bodies<br>Real cricket-ball mass<br>Tuned swing arc | Shattering window<br>Particle glass shards<br>Reactive aunty sprite | First-person batting<br>Third-person chase<br>Cinematic orbit |

</div>

---

## 🎮 Controls

<div align="center">

| Key | Action | Outcome |
|:---:|:---|:---|
| <kbd>SPACE</kbd> | 🎯 Bowl the ball | A 0.16 kg cricket ball flies in over ~1.2 s |
| <kbd>S</kbd> | 💥 Swing for a **SIXER** | High arc, ~70 m carry — aim for the window |
| <kbd>F</kbd> | 🚀 Swing for a **FOUR** | Flat, sharp drive — 30–50 m |
| <kbd>C</kbd> | 🎥 Cinematic orbit camera | Slow establishing shot of the gully |
| *miss / late* | 🥲 **MISTIMED** | Ball dribbles 5–15 m. The gully laughs. |

</div>

---

## 🚀 Quick Start

```bash
# Clone the repo
git clone https://github.com/Vasudev-Majhi/Gully-Cricket-3D.git
cd Gully-Cricket-3D

# Install dependencies
npm install

# Run the dev server
npm run dev
```

Open the printed URL (usually `http://localhost:5173`) and start swinging. 🏏

### 📦 Build for production

```bash
npm run build       # bundles to dist/
npm run preview     # serves the production build locally
```

---

## 🛠️ Tech Stack

<div align="center">

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   🎨  RENDERING        Three.js r184 + EffectComposer       │
│       ├─ ACES Filmic tone mapping                           │
│       ├─ UnrealBloomPass (0.3 / 0.4 / 0.9)                  │
│       ├─ HDRI environment + IBL                             │
│       └─ Shadow-mapped directional light                    │
│                                                             │
│   ⚙️   PHYSICS         cannon-es 0.20                        │
│       ├─ Kinematic bat body (pendulum swing)                │
│       ├─ Dynamic ball with restitution 0.6                  │
│       └─ Collision-event swing tiering                      │
│                                                             │
│   ⚡  TOOLING         Vite 8  •  Vanilla JS  •  Tailwind CDN │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

</div>

> 🚫 No frameworks. No TypeScript. No 20-file ceremony. One scene, one `main.js`, one good time.

---

## 📐 Physics — The Locked Tuning

The "feel" of this game lives in carefully tested numbers. The headline values:

```js
// Ball — a real cricket ball, bumped up for visibility
shape:         CANNON.Sphere(0.12)
mass:          0.16 kg
restitution:   0.6
launch:        position (0, 1.0, -10)   velocity (0, 6, 8)

// Bat — a forgiving paddle, swings around Z
shape:         CANNON.Box(0.2, 0.85, 0.25)
type:          KINEMATIC
swing:         angle = sin(progress) * π/2,  progress += dt * 4

// Outcomes — driven by swing key + swingSpeed
SIXER (S):     scale 1.00 → ~27 m/s @ 35°, ~70 m carry
FOUR  (F):     scale 0.55 → ~15 m/s flat,  30–50 m carry
MISTIMED:     scale 0.15 → 3–5 m/s dribble
```

🧪 **Lessons learned the hard way** are documented in the sister repo's [`PHYSICS.md`](https://github.com/Vasudev-Majhi/Gully-Cricket-3D-Codex/blob/main/PHYSICS.md) — including:

- 🌀 Rotating the bat around its own Y-axis is a turnstile (it spins, never sweeps)
- 🎯 Bat center must align with the ball's x-coordinate or you whiff every time
- 🪶 Thin bats tunnel through the ball — use `batDepth = 0.25` or enable CCD
- 🪂 Ball drops to ground if vertical launch velocity is too low — `vy = 6` minimum

---

## 🧠 Behind the Scenes

This repo is one half of a **dual-agent experiment**: the same `PROMPT.md` was handed to two different coding agents to see how each interprets a creative brief with cinematic ambition and locked physics.

<div align="center">

| Repo | Built By | Outcome |
|:---|:---:|:---|
| 🏏 **Gully-Cricket-3D** *(you are here)* | 🤖 [Claude Code](https://claude.com/claude-code) | Full cinematic build with reactive NPCs & shattering glass |
| 🧪 [Gully-Cricket-3D-Codex](https://github.com/Vasudev-Majhi/Gully-Cricket-3D-Codex) | 🤖 OpenAI Codex | Sister build — see the differences in approach |

</div>

> Curious about how two AIs tackle the same cinematic brief differently? **Diff the two `main.js` files.** 🍿

---

## 📁 Project Layout

```
Gully-Cricket-3D/
├── 📜 index.html             # Entry HTML — loads main.js
├── 🎮 src/
│   └── main.js               # The whole game (~39 KB of pure joy)
├── 🎨 public/
│   └── assets/               # Sprites, models, HDRI, sounds
├── 📋 CLAUDE.md              # Build rules — locked tech stack
├── 📜 PROMPT.md              # The original creative brief
├── 📦 package.json
└── 📖 README.md              # ← you are reading this
```

---

## 🎯 Roadmap

- [x] First-person batting + ball physics
- [x] Cinematic golden-hour gully
- [x] Three camera modes (FP / chase / orbit)
- [x] Shattering window + reactive aunty
- [ ] Multi-ball over with score tracking
- [ ] Sound design pass (bat thwack, window crash, aunty voice line)
- [ ] Mobile touch controls *(maybe — gully cricket on the train? 🚇)*

---

## 🙏 Credits

- 🏏 Game design & build direction: **Vasudev Majhi**
- 🤖 Implementation agent: **Claude Code** (Anthropic)
- 🌅 HDRI environment: golden-hour outdoor capture
- 🛺 Vibes: every Indian gully at 6 PM on a summer evening

---

<div align="center">

### 🏏 Now go break that window.

*Made with `npm run dev` and a lot of nostalgia.*

[![Star this repo](https://img.shields.io/github/stars/Vasudev-Majhi/Gully-Cricket-3D?style=social)](https://github.com/Vasudev-Majhi/Gully-Cricket-3D)

</div>
