## Authority note
This file overrides any conflicting gameplay description elsewhere.
Where PROMPT.md and PHYSICS.md differ, follow PHYSICS.md. The input
model (S/F keys, not click-timing) was chosen after lab testing —
do not "improve" it back to click-to-swing.


# Gully Cricket Physics — Tested Parameters

These values have been empirically tested and tuned for the right
"feel." Use these as the starting point — do NOT re-derive from
scratch. Minor adjustments are fine but preserve the ratios and
general scale.

## Gravity and simulation
- `world.gravity: new CANNON.Vec3(0, -9.82, 0)`
- `world.fixedStep(1/60)` called once per rendered frame
- `requestAnimationFrame` loop; use `THREE.Timer` (NOT `THREE.Clock` — deprecated in three ≥0.180) with `timer.update()` each frame before `timer.getDelta()`

## Ball (cricket ball — scaled up for visibility)
- Shape: `CANNON.Sphere(radius = 0.12)` (real ball is 0.036m, but too small to see at 10m launch distance — 0.12 is a deliberate visibility bump)
- Mass: **0.16 kg** (real cricket ball)
- Restitution: **0.6**
- Linear damping: **0.1**
- Angular damping: **0.1**
- Material: `ballBody.material = new CANNON.Material({ restitution: 0.6 })`

## Bat (paddle-shaped to give a forgiving hit zone)
- Shape: `CANNON.Box(new CANNON.Vec3(0.2/2, 0.85/2, 0.25/2))`
  - batWidth (x): 0.2
  - batLength (y): 0.85
  - batDepth (z): **0.25** (critical — 0.04 like a real bat produces a ~5ms hit window and hits rarely register)
- Type: `CANNON.Body.KINEMATIC`
- Mass: 0 (required for kinematic)
- Position: `(0, 1.0, -0.5)` — must align with ball's x=0 line, or ball passes by
- Rotation: `batBody.quaternion.setFromEuler(0, 0, angle)` — rotate around **Z** (swings in XY plane). Rotating around Y is a turnstile and the bat never sweeps through the ball's path.

## Ball launch
- Initial position: `(0, 1.0, -10)` — 10 units in front of batsman
- Initial velocity: **`(0, 6, 8)`** — vertical component is mandatory, otherwise the ball falls to the ground before reaching the bat at z=-0.5 and rolls underneath
- Ball takes ~1.2s to reach the bat at y≈1.2m (right at bat-head height)
- Trigger on SPACE keydown; re-launch resets velocity and angularVelocity

## Swing mechanics
- `swingProgress` advances at **4 rad/s** (`swingProgress += dt * 4`)
- `angle = Math.sin(swingProgress) * Math.PI/2` — angle goes 0 → π/2 → 0 over swingProgress 0 → π
- Full swing duration: ~0.78s
- "Full-shaft-in-ball-path" window: only when angle is within ~7° of vertical, i.e. swingProgress near 0 or near π — which is also where angular velocity peaks
- `swingSpeed = Math.abs(Math.cos(swingProgress))` is the cleanest hit-quality metric (1 = peak angular velocity, 0 = mid-swing / bat horizontal)

## Outcome tiering
Separate keys were more ergonomic than pure timing, because the
center-pivot swing makes physical collision occur almost exclusively
when the bat is near vertical (swingSpeed ≥ 0.95), so timing alone
couldn't produce reliable variety.

- **S key → SIXER** — `scale = 1.0` → post-hit |v| ≈ 27 m/s at ~35° → carries 60–80m
- **F key → FOUR** — `scale = 0.55` → lower, flatter arc → 30–50m
- **Any collision without active swing (or swingSpeed < 0.25) → MISTIMED** — `scale = 0.15` → ball dribbles 5–15m

## Base impulse values (from testing)
- `swingImpulseForward: 6` (Ns)
- `swingImpulseUpward: 4.6` (Ns)
- `swingImpulseSideways: 0`
- Forward:Upward ≈ **1.3 : 1** — tuned for natural sixer arc; preserve this ratio when scaling
- Applied impulse direction in world: `(sideways, upward, -forward)` — forward component is **negative z** because the batsman hits the ball AWAY from camera; ball incoming is +z, so hit reverses and accelerates into -z

## Collision detection pattern
```javascript
ballBody.addEventListener('collide', (event) => {
  if (event.body !== batBody) return;
  let label, scale;
  if (!swinging || swingSpeed < 0.25)  { label = 'MISTIMED'; scale = 0.15; }
  else if (swingShot === 'four')       { label = 'FOUR';     scale = 0.55; }
  else                                 { label = 'SIXER';    scale = 1.0;  }
  ballBody.applyImpulse(
    new CANNON.Vec3(
      PARAMS.swingImpulseSideways * scale,
      PARAMS.swingImpulseUpward   * scale,
      -PARAMS.swingImpulseForward * scale   // -z = away from batsman
    ),
    ballBody.position
  );
});
```

## Critical gotchas discovered during testing
- **Rotating the bat around its own Y-axis is a turnstile.** The bat
  stays in place and spins around its length; it never sweeps through
  the ball's path. Always rotate around **Z** for a pendulum swing.
- **Bat center must equal ball's x-coordinate.** Starting with bat at
  x=0.3 and ball at x=0 (as in the scaffold) means the ball passes
  0.25m to the side and never collides — no amount of swing-speed
  tuning fixes this.
- **Thin bat = tunneling.** batDepth of 0.04 gives the moving ball only
  ~5ms inside the collision volume. Either increase batDepth to ~0.25
  or enable CCD on the ball (`ballBody.ccdSpeedThreshold = 5`). The
  fat paddle is simpler.
- **Ball drops to ground before reaching bat if vy is too low.** At
  vz=8 over 10m, flight takes ~1.2s and gravity drops the ball by ~7m.
  Use vy=6 minimum so the ball is still airborne at z=-0.5.
- **Impulse direction is sign-sensitive.** Applying `+swingImpulseForward`
  in z pushes the ball toward the camera (into the batsman); you want
  `-swingImpulseForward` to send it out to the field.
- **Camera default looks straight down −z from (0,1.6,0).** Move it to
  roughly `(2, 1.6, 1.5)` with `lookAt(0.3, 1.0, -0.5)` to see the
  approach, the bat, and the post-hit flight into the markers.
- **Tiny ball = invisible ball.** At real-world radius 0.036m against a
  50m ground, you simply can't see it. Bump to 0.12 for visibility —
  the physics still reads as a cricket ball.
- **Impulse logs can look misleading.** Logging `ballBody.velocity`
  captures a reference; expanding it in DevTools later shows the
  current velocity, not the at-collision snapshot. Log primitives
  (`v.x.toFixed(2)`, etc.) if you need a true snapshot.

## Feel notes (for preserving intent, not just numbers)
- A sixer should feel DRAMATIC — high arc, long flight time, viewer
  has time to say "oohhh" before it lands. Confirmed at forward=6,
  upward=4.6 with 1.0× scale: ~27 m/s at 35°, ~70m range, ~2.5s hang.
- A four should feel SHARP — lower arc, faster travel, crisp. 0.55×
  scale produces a ~15 m/s flat-ish drive, lands in 30–50m.
- A mistimed hit should feel WEAK — ball barely moves, comedic
  rather than frustrating. 0.15× scale with the incoming ball's
  momentum reversed by restitution gives a 3–5 m/s dribble.

## Distance markers (debug aid)
Yellow 0.3m cubes every 10m along -z, offset to x=-5 so they don't
obstruct the ball's x=0 line:
```javascript
for (let z = -10; z <= 100; z += 10) {
  const marker = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.3, 0.3),
    new THREE.MeshStandardMaterial({ color: 0xffff00 })
  );
  marker.position.set(-5, 0.15, -z);
  scene.add(marker);
}
```
