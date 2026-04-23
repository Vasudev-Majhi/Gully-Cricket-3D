I'm building a 3D Gully Cricket game in the browser using Three.js
and cannon-es. You have ~5 hours to build a cinematic, visually
polished first-person batting experience.

## The setting
A narrow Indian residential gully (street) during golden hour. The
player stands as the batsman at one end. A ball is bowled from the
other end. The player swings the bat based on input. Based on swing
type, the ball flies as a mistimed shot, a four, or a sixer. If the
sixer hits the apartment window, the glass shatters.

## Atmosphere (critical — this is a cinematic experience, not a prototype)
The gully should feel ALIVE and Indian:
- Two/three-story apartment buildings on both sides, narrow gap between
- An aunty sprite standing on one balcony (use /assets/sprites/aunty_calm.png)
- A window on a balcony that can be broken (simple geometric box)
- A stray dog sleeping on the side (/assets/models/dog.glb)
- A parked Activa scooter (/assets/models/scooter.glb)
- An uncle sitting on a plastic chair reading newspaper (sprite)
- A kid on bicycle crossing the background occasionally (sprite, animated path)
- Laundry hanging on clothes lines between buildings
- Golden hour lighting (HDRI loaded from /assets/hdri/sunset.hdr)
- Warm, nostalgic color grading via ACES tone mapping + subtle bloom


## Gameplay
- First-person view, batsman's perspective
- Bat is visible in bottom-right of screen
- Press SPACE to bowl a ball — it flies toward the batsman over ~1.2s
- Press S to swing for a SIXER (aim for the window)
- Press F to swing for a FOUR (flatter, lower shot)
- Missing the ball or late swing = MISTIMED outcome
- Do NOT change this input model — S/F swing keys are intentional,
  tested, and documented in PHYSICS.md
- If sixer hits window: glass shatters with particles + sound +
  aunty sprite swaps to "shocked" pose + aunty voice line plays +
  dog barks
- Score HUD: runs counter top-left, current shot label ("FOUR!", "SIX!")


## Cameras (3 modes)
1. First-person batting (default)
2. Third-person chase: auto-activates when ball is hit, follows
   ball arc, returns to first-person after 3 seconds
3. Cinematic orbit (press 'C'): slow orbit around the gully for
   establishing shots


## Physics parameters (LOCKED)
Physics is already tested and documented. See /PHYSICS.md in the
project root — use those exact values as your starting point. Do
not re-derive from scratch. Where PROMPT.md and PHYSICS.md differ,
follow PHYSICS.md.

## Assets available (see /public/assets/ASSETS.md for full list)
[PASTE CONTENTS OF ASSETS.md HERE]

## Tech requirements (LOCKED)
- Three.js r170+, cannon-es, vanilla JS, Vite
- See AGENTS.md / CLAUDE.md / .cursorrules for rendering/physics
  specifics — do not deviate

## Build approach
Start by asking me ONE clarifying question if anything is ambiguous.
Then propose your build order (what you'll do first, second, third)
in plain English. I'll approve before you write code. After that,
we iterate feature by feature, committing after each success.

Do NOT try to build everything in one shot. That produces broken code.
