# Gully Cricket 3D — Build Rules

## Tech Stack (LOCKED — do not add dependencies without explicit request)
- Three.js r170+ for rendering
- cannon-es for physics (NOT cannon.js, NOT ammo.js)
- Vanilla JavaScript only (NO TypeScript, NO React, NO frameworks)
- Vite as dev server and bundler
- Tailwind via CDN for HUD styling only

## Rendering requirements
- Use WebGLRenderer with antialias: true, shadowMap.enabled: true
- Set outputColorSpace to THREE.SRGBColorSpace
- Set toneMapping to THREE.ACESFilmicToneMapping, toneMappingExposure around 1.0
- Load HDRI from /assets/hdri/sunset.hdr as scene.environment AND scene.background
- Use EffectComposer with UnrealBloomPass (strength 0.3, radius 0.4, threshold 0.9)
- Enable shadows on directional light, cast shadows on dynamic objects, receive on ground
- Diffuse texture maps need colorSpace = THREE.SRGBColorSpace
- Normal, roughness, AO maps stay in default linear color space

## Physics requirements
- Gravity: new CANNON.Vec3(0, -9.82, 0)
- Ball: CANNON.Sphere, mass 0.16 (cricket ball mass in kg), restitution 0.6
- Bat: CANNON.Box, kinematic body controlled by player input
- Ground: static plane, friction 0.4
- Window: static box with collision event listener
- PHYSICS.md at project root overrides any conflicting physics guidance

## Code style
- Single main.js file is fine for this scope — do NOT over-engineer into 20 modules
- Comments in English, keep them brief
- Use const by default, let only when reassignment needed
- Name things descriptively: ball, bat, gully, aunty — not obj1, obj2

## Scope discipline
- No settings menu, no main menu, no pause screen
- Desktop only (mouse/keyboard) — do not add mobile touch controls
- Single innings, simple score counter
- Do NOT add features I did not ask for, ever
- If you finish a feature early, ASK what to do next — do not guess

## Behavior rules
- Start with the simplest possible working version, iterate from there
- When I report a bug, propose a fix in plain English BEFORE writing code
- If my request is ambiguous, ask ONE clarifying question before coding
- Preserve working code — do not rewrite modules that aren't broken

