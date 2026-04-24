import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ========================================================================
// Renderer
// ========================================================================
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('app').appendChild(renderer.domElement);

// ========================================================================
// Scene + camera
// ========================================================================
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  72,
  window.innerWidth / window.innerHeight,
  0.1,
  500,
);
// First-person presets, swappable via 1/2/3/4 keys. Preset 1 is the
// default batsman POV (unchanged). Others give cinematic alternatives
// the player can pick and have the chase cam return to.
const FP_PRESETS = {
  1: {
    label: 'BATSMAN',
    pos:    new THREE.Vector3(-0.35, 1.6, 1.2),
    target: new THREE.Vector3(0, 5.5, -15),
  },
  2: {
    label: 'THIRD PERSON',
    pos:    new THREE.Vector3(0, 2.8, 2.8),
    target: new THREE.Vector3(0, 1.3, -10),
  },
  3: {
    label: 'BROADCAST',
    pos:    new THREE.Vector3(3.6, 1.8, -4),
    target: new THREE.Vector3(0, 1.3, -5),
  },
  4: {
    label: 'AUNTY ROOFTOP',
    pos:    new THREE.Vector3(-3.2, 12.8, -17.0),
    target: new THREE.Vector3(0, 1.0, 0),
  },
};
const fp = {
  pos: FP_PRESETS[1].pos.clone(),
  target: FP_PRESETS[1].target.clone(),
  active: 1,
};
camera.position.copy(fp.pos);
camera.lookAt(fp.target);

// ========================================================================
// Post-processing — UnrealBloom (CLAUDE.md spec) + subtle vignette
// ========================================================================
const composer = new EffectComposer(renderer);
composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
composer.setSize(window.innerWidth, window.innerHeight);

composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.3,  // strength
  0.4,  // radius
  0.9,  // threshold
);
composer.addPass(bloomPass);

// Subtle vignette — darkens corners for cinematic framing
const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    strength: { value: 0.55 },
    offset: { value: 0.38 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float strength;
    uniform float offset;
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      vec2 p = vUv - 0.5;
      float dist = length(p);
      float v = smoothstep(offset, offset + 0.5, dist);
      color.rgb *= (1.0 - v * strength);
      gl_FragColor = color;
    }
  `,
};
composer.addPass(new ShaderPass(VignetteShader));

// OutputPass handles tone mapping + sRGB conversion at the end of the chain
composer.addPass(new OutputPass());

// ========================================================================
// HDRI + lights
// ========================================================================
new RGBELoader().load('/assets/hdri/sunset.hdr', (hdr) => {
  hdr.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = hdr;
  scene.background = hdr;
});

const sun = new THREE.DirectionalLight(0xffd5a0, 2.2);
sun.position.set(-18, 22, -6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
const sc = sun.shadow.camera;
sc.left = -30;
sc.right = 30;
sc.top = 30;
sc.bottom = -30;
sc.near = 0.5;
sc.far = 80;
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.02;
scene.add(sun);

// ========================================================================
// Ground (visual)
// ========================================================================
const texLoader = new THREE.TextureLoader();

function loadPBR(dir, base) {
  const diff = texLoader.load(`/assets/textures/${dir}/${base}_diff_1k.jpg`);
  const nor = texLoader.load(`/assets/textures/${dir}/${base}_nor_gl_1k.jpg`);
  const rough = texLoader.load(`/assets/textures/${dir}/${base}_rough_1k.jpg`);
  const ao = texLoader.load(`/assets/textures/${dir}/${base}_ao_1k.jpg`);
  diff.colorSpace = THREE.SRGBColorSpace;
  for (const t of [diff, nor, rough, ao]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  }
  return { diff, nor, rough, ao };
}

const groundTex = loadPBR('ground', 'cracked_concrete');
for (const t of Object.values(groundTex)) t.repeat.set(6, 30);

const groundMat = new THREE.MeshStandardMaterial({
  map: groundTex.diff,
  normalMap: groundTex.nor,
  roughnessMap: groundTex.rough,
  aoMap: groundTex.ao,
  roughness: 1.0,
  metalness: 0.0,
});

const groundMesh = new THREE.Mesh(new THREE.PlaneGeometry(30, 120), groundMat);
groundMesh.rotation.x = -Math.PI / 2;
groundMesh.position.set(0, 0, -30);
groundMesh.geometry.setAttribute('uv2', groundMesh.geometry.attributes.uv);
groundMesh.receiveShadow = true;
scene.add(groundMesh);

// ========================================================================
// Physics world (PHYSICS.md values — do not re-derive)
// ========================================================================
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
world.broadphase = new CANNON.NaiveBroadphase();
world.allowSleep = false;

// --- Ground body ---
const groundBody = new CANNON.Body({
  mass: 0,
  shape: new CANNON.Plane(),
  material: new CANNON.Material({ friction: 0.4, restitution: 0.3 }),
});
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(groundBody);

// ========================================================================
// Ball (Sphere r=0.12, mass 0.16, restitution 0.6) — PHYSICS.md
// ========================================================================
const BALL_RADIUS = 0.12;

const ballBody = new CANNON.Body({
  mass: 0.16,
  shape: new CANNON.Sphere(BALL_RADIUS),
  linearDamping: 0.1,
  angularDamping: 0.1,
  material: new CANNON.Material({ restitution: 0.6 }),
  position: new CANNON.Vec3(0, 1.0, -10),
});
world.addBody(ballBody);

const ballMesh = new THREE.Mesh(
  new THREE.SphereGeometry(BALL_RADIUS, 24, 16),
  new THREE.MeshStandardMaterial({ color: 0xb4271a, roughness: 0.55, metalness: 0.0 }),
);
ballMesh.castShadow = true;
scene.add(ballMesh);

// ========================================================================
// Bat (Box 0.2×0.85×0.25, kinematic, Z-axis swing) — PHYSICS.md
// ========================================================================
const BAT_W = 0.2;
const BAT_L = 0.85;
const BAT_D = 0.25;
const BAT_PIVOT = new THREE.Vector3(0, 1.0, -0.5);

const batBody = new CANNON.Body({
  type: CANNON.Body.KINEMATIC,
  mass: 0,
  shape: new CANNON.Box(new CANNON.Vec3(BAT_W / 2, BAT_L / 2, BAT_D / 2)),
});
batBody.position.copy(BAT_PIVOT);
world.addBody(batBody);

// Invisible physics proxy (the real bat visual is the GLB below). Kept as
// a Three mesh only because syncMesh() writes to it each frame.
const batMesh = new THREE.Mesh(
  new THREE.BoxGeometry(BAT_W, BAT_L, BAT_D),
  new THREE.MeshBasicMaterial({ visible: false }),
);
scene.add(batMesh);

// First-person cricket bat GLB, parented to a pivot that tracks batBody
const batVisual = new THREE.Group();
scene.add(batVisual);

new GLTFLoader().load('/assets/models/Cricket bat.glb', (gltf) => {
  const model = gltf.scene;
  model.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = false;
      if (o.material) o.material.roughness = 0.55;
    }
  });

  // Normalize: scale longest axis to BAT_L, recenter at origin,
  // orient so the longest axis is +Y (matches Z-rotation swing plane).
  const bbox = new THREE.Box3().setFromObject(model);
  const size = bbox.getSize(new THREE.Vector3());
  const longest = Math.max(size.x, size.y, size.z);
  const scale = (BAT_L * 1.05) / longest; // slight upsize for visibility
  model.scale.setScalar(scale);

  bbox.setFromObject(model);
  const center = bbox.getCenter(new THREE.Vector3());
  model.position.sub(center);

  // If the model's long axis wasn't Y, rotate it so it is
  if (size.x >= size.y && size.x >= size.z) {
    model.rotation.z = Math.PI / 2;
  } else if (size.z >= size.y && size.z >= size.x) {
    model.rotation.x = Math.PI / 2;
  }

  batVisual.add(model);
});

// ========================================================================
// Gully shell — flanking apartments, end wall, breakable window
// ========================================================================
const wallTex = loadPBR('wall', 'broken_brick_wall');
for (const t of Object.values(wallTex)) t.repeat.set(4, 2);

const wallMat = new THREE.MeshStandardMaterial({
  map: wallTex.diff,
  normalMap: wallTex.nor,
  roughnessMap: wallTex.rough,
  aoMap: wallTex.ao,
  roughness: 1.0,
});

function makeBox(mat, w, h, d, x, y, z) {
  const geom = new THREE.BoxGeometry(w, h, d);
  geom.setAttribute('uv2', geom.attributes.uv);
  const m = new THREE.Mesh(geom, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  scene.add(m);
  return m;
}

// Gully corridor: 8m wide, with flanking apartment blocks running the
// length of the street. Inner faces at x=±4, outer at x=±10. Buildings
// are 8m tall (2–3 stories) and span from behind the batsman to z=-30.
makeBox(wallMat, 6, 8, 34, -7, 4, -13);   // left block
makeBox(wallMat, 6, 8, 34, 7, 4, -13);    // right block

// End-of-gully apartment closing the street — 4 stories, set far back
// so the sky reads above it and sense of distance is preserved.
const END_Z = -18;
makeBox(wallMat, 20, 12, 1.5, 0, 6, END_Z);

// Roof caps — darker slab on top of each building so the silhouettes
// read as distinct volumes rather than one continuous brick backdrop.
const roofMat = new THREE.MeshStandardMaterial({ color: 0x3a2b1f, roughness: 0.85 });
makeBox(roofMat, 6.2, 0.25, 34.2, -7, 8.12, -13);  // left roof
makeBox(roofMat, 6.2, 0.25, 34.2, 7, 8.12, -13);   // right roof
makeBox(roofMat, 20.2, 0.25, 1.7, 0, 12.12, END_Z); // end-wall roof

// Facade details — windows, floor divider, door — so the walls read as
// apartment buildings, not just brick. Windows are recessed dark panels
// with wooden frames. These are visual-only (no physics).
const paneMat = new THREE.MeshStandardMaterial({
  color: 0x1a2530, roughness: 0.25, metalness: 0.2,
});
const facadeFrameMat = new THREE.MeshStandardMaterial({ color: 0x2b1a10, roughness: 0.85 });
const trimMat = new THREE.MeshStandardMaterial({ color: 0xdbc7a3, roughness: 0.9 });

function addWindow(x, y, z, w, h, facingAxis) {
  // facingAxis: 'x+' | 'x-' | 'z+' — which direction the window faces
  // Window = glass pane + thin 4-piece frame set slightly outward.
  const thick = 0.08;
  let paneGeom, topGeom, sideGeom;
  if (facingAxis === 'z+') {
    paneGeom = new THREE.BoxGeometry(w, h, thick);
    topGeom = new THREE.BoxGeometry(w + 0.16, 0.08, thick * 1.3);
    sideGeom = new THREE.BoxGeometry(0.08, h + 0.16, thick * 1.3);
  } else {
    paneGeom = new THREE.BoxGeometry(thick, h, w);
    topGeom = new THREE.BoxGeometry(thick * 1.3, 0.08, w + 0.16);
    sideGeom = new THREE.BoxGeometry(thick * 1.3, h + 0.16, 0.08);
  }

  const pane = new THREE.Mesh(paneGeom, paneMat);
  pane.position.set(x, y, z);
  pane.receiveShadow = true;
  scene.add(pane);

  const fTop = new THREE.Mesh(topGeom, facadeFrameMat);
  const fBot = new THREE.Mesh(topGeom, facadeFrameMat);
  const fL = new THREE.Mesh(sideGeom, facadeFrameMat);
  const fR = new THREE.Mesh(sideGeom, facadeFrameMat);

  if (facingAxis === 'z+') {
    fTop.position.set(x, y + h / 2 + 0.04, z);
    fBot.position.set(x, y - h / 2 - 0.04, z);
    fL.position.set(x - w / 2 - 0.04, y, z);
    fR.position.set(x + w / 2 + 0.04, y, z);
  } else {
    fTop.position.set(x, y + h / 2 + 0.04, z);
    fBot.position.set(x, y - h / 2 - 0.04, z);
    fL.position.set(x, y, z - w / 2 - 0.04);
    fR.position.set(x, y, z + w / 2 + 0.04);
  }
  scene.add(fTop, fBot, fL, fR);
}

// Flanking buildings: grid of windows on inner faces, 2 floors
// Left building inner face at x=-4 (faces +x); nudge windows to x=-3.95
// Right building inner face at x=+4 (faces -x); nudge windows to x=3.95
const floorYs = [2.5, 5.8];              // first & second floor window heights
const flankWindowZs = [-2, -7, -12, -17, -22, -27];
for (const z of flankWindowZs) {
  for (const y of floorYs) {
    addWindow(-3.95, y, z, 1.4, 1.2, 'x+');  // left facade (window normal +x)
    addWindow(3.95, y, z, 1.4, 1.2, 'x-');   // right facade (window normal -x)
  }
}

// Light cream horizontal floor-divider stripe between stories (both walls)
makeBox(trimMat, 0.05, 0.25, 34.1, -3.97, 4.1, -13);
makeBox(trimMat, 0.05, 0.25, 34.1,  3.97, 4.1, -13);

// End-building windows (facing the batsman). 3 across × 3 floors, with a
// center column at x=0 replaced by the breakable target on the top floor.
// Lower floors at y=2.5, 5.8, 9.1; columns at x=-6, 0, +6.
const endFace = END_Z + 0.76;   // front face of end wall (z=-17.24)
for (const [xi, x] of [[0, -6], [1, 0], [2, 6]].entries()) {
  for (const [yi, y] of [[0, 2.5], [1, 5.8], [2, 9.1]].entries()) {
    // Top-center slot is the breakable window (added separately above)
    if (yi === 2 && xi === 1) continue;
    addWindow(x, y, endFace, 1.4, 1.2, 'z+');
  }
}

// Ground-floor entrance on the end building — a dark wooden door
const doorMat = new THREE.MeshStandardMaterial({ color: 0x2d1708, roughness: 0.9 });
makeBox(doorMat, 1.3, 2.2, 0.1, 0, 1.1, endFace + 0.02);
makeBox(trimMat, 1.5, 0.15, 0.18, 0, 2.3, endFace + 0.02); // lintel above door

// End-wall horizontal floor divider (matches flanking stripes)
makeBox(trimMat, 20.1, 0.2, 0.08, 0, 4.3, endFace + 0.02);
makeBox(trimMat, 20.1, 0.2, 0.08, 0, 7.6, endFace + 0.02);
makeBox(trimMat, 20.1, 0.2, 0.08, 0, 10.9, endFace + 0.02);

// Balcony slab high up on the end building (top-floor balcony).
// Slab sits well below the sixer arc so nothing grazes it.
const balconyMat = new THREE.MeshStandardMaterial({ color: 0xbfa98c, roughness: 0.9 });
const BALC_Z = END_Z + 1.5;      // protrudes 1.5m toward the batsman
makeBox(balconyMat, 4.6, 0.25, 1.5, 0, 11.3, BALC_Z);

// Balcony railing — two side posts only. The horizontal top rail was
// sitting exactly in the sixer's flight line (y≈12.1 at z=-15.8) and
// deflecting every shot. Side posts alone still read as "railing"
// without intercepting the ball.
makeBox(balconyMat, 0.08, 0.9, 0.08, -2.2, 11.85, BALC_Z + 0.7);
makeBox(balconyMat, 0.08, 0.9, 0.08, 2.2, 11.85, BALC_Z + 0.7);

// Two short rail segments at the balcony edges, with a gap in the middle
// wide enough for the ball (x=0 ± 0.12) to pass through cleanly.
makeBox(balconyMat, 1.3, 0.06, 0.06, -1.55, 12.05, BALC_Z + 0.7);
makeBox(balconyMat, 1.3, 0.06, 0.06,  1.55, 12.05, BALC_Z + 0.7);

// Breakable window on the top-floor balcony.
// A SIX is at ~y=13m when it crosses z=-17.5, so center window there.
const WINDOW_POS = new THREE.Vector3(0, 13.0, END_Z + 0.75);
const WINDOW_SIZE = new THREE.Vector3(2.4, 1.8, 0.08);

const windowMat = new THREE.MeshPhysicalMaterial({
  color: 0xbfe3f2,
  roughness: 0.05,
  metalness: 0.0,
  transmission: 0.85,
  thickness: 0.15,
  ior: 1.5,
  clearcoat: 1.0,
  clearcoatRoughness: 0.05,
  transparent: true,
  opacity: 0.55,
  side: THREE.DoubleSide,
});

const windowMesh = new THREE.Mesh(
  new THREE.BoxGeometry(WINDOW_SIZE.x, WINDOW_SIZE.y, WINDOW_SIZE.z),
  windowMat,
);
windowMesh.position.copy(WINDOW_POS);
windowMesh.castShadow = false;
windowMesh.receiveShadow = false;
scene.add(windowMesh);

// Window frame (dark wood)
const frameMat = new THREE.MeshStandardMaterial({ color: 0x2a1c12, roughness: 0.8 });
makeBox(frameMat, WINDOW_SIZE.x + 0.2, 0.12, 0.15, WINDOW_POS.x, WINDOW_POS.y + WINDOW_SIZE.y / 2 + 0.06, WINDOW_POS.z);
makeBox(frameMat, WINDOW_SIZE.x + 0.2, 0.12, 0.15, WINDOW_POS.x, WINDOW_POS.y - WINDOW_SIZE.y / 2 - 0.06, WINDOW_POS.z);
makeBox(frameMat, 0.12, WINDOW_SIZE.y + 0.3, 0.15, WINDOW_POS.x - WINDOW_SIZE.x / 2 - 0.06, WINDOW_POS.y, WINDOW_POS.z);
makeBox(frameMat, 0.12, WINDOW_SIZE.y + 0.3, 0.15, WINDOW_POS.x + WINDOW_SIZE.x / 2 + 0.06, WINDOW_POS.y, WINDOW_POS.z);

// Static physics body for the window — collider is deliberately larger
// than the visual mesh (4m × 3m × 1.5m) so a straight-line sixer cannot
// miss by alignment. Visual mesh stays its true size.
const windowBody = new CANNON.Body({
  mass: 0,
  type: CANNON.Body.STATIC,
  shape: new CANNON.Box(new CANNON.Vec3(2.0, 1.5, 0.75)),
});
windowBody.position.copy(WINDOW_POS);
world.addBody(windowBody);

const windowState = { broken: false };

// ========================================================================
// Phase 4 — Life in the gully (aunty, uncle, dog, scooter, kid, laundry)
// ========================================================================

// Sprites on disk are JPGs with a gray-checkerboard baked in (no alpha
// channel). Strip the background with a canvas-based flood fill: only
// gray/white pixels *connected to the image border* become transparent.
// Interior whites (newspaper pages, sari stripes) stay opaque.
function chromaKeyImageToTexture(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onerror = reject;
    img.onload = () => {
      const W = img.width, H = img.height;
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, W, H);
      const px = imgData.data;

      // Mark pixels that match the baked checkerboard (low saturation, bright)
      const isBg = new Uint8Array(W * H);
      for (let p = 0, j = 0; p < px.length; p += 4, j++) {
        const r = px[p], g = px[p + 1], b = px[p + 2];
        const hi = Math.max(r, g, b);
        const lo = Math.min(r, g, b);
        const avg = (r + g + b) / 3;
        if ((hi - lo) < 32 && avg > 150) isBg[j] = 1;
      }

      // Flood fill (iterative DFS) from every edge pixel
      const visited = new Uint8Array(W * H);
      const stack = [];
      const seed = (i) => {
        if (isBg[i] && !visited[i]) { visited[i] = 1; stack.push(i); }
      };
      for (let x = 0; x < W; x++) { seed(x); seed((H - 1) * W + x); }
      for (let y = 0; y < H; y++) { seed(y * W); seed(y * W + W - 1); }
      while (stack.length) {
        const i = stack.pop();
        const y = (i / W) | 0;
        const x = i - y * W;
        if (x > 0)     seed(i - 1);
        if (x < W - 1) seed(i + 1);
        if (y > 0)     seed(i - W);
        if (y < H - 1) seed(i + W);
      }

      // Dilate the transparent region by 3 pixels to chew off JPG-compression
      // edge halos — these blended fringe pixels sit just outside the bg
      // threshold but visually belong to the background.
      for (let iter = 0; iter < 3; iter++) {
        const toAdd = [];
        for (let i = 0; i < W * H; i++) {
          if (visited[i]) continue;
          const y = (i / W) | 0;
          const x = i - y * W;
          if (
            (x > 0 && visited[i - 1]) ||
            (x < W - 1 && visited[i + 1]) ||
            (y > 0 && visited[i - W]) ||
            (y < H - 1 && visited[i + W])
          ) toAdd.push(i);
        }
        for (let k = 0; k < toAdd.length; k++) visited[toAdd[k]] = 1;
      }

      // Write alpha = 0 for every bg-connected (and dilated) pixel
      for (let i = 0, p = 3; i < W * H; i++, p += 4) {
        if (visited[i]) px[p] = 0;
      }

      ctx.putImageData(imgData, 0, 0);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      tex.needsUpdate = true;
      resolve(tex);
    };
    img.src = url;
  });
}

function makeSpriteFromUrl(url, widthMeters, heightMeters, x, y, z) {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ transparent: true, opacity: 0 }),
  );
  sprite.scale.set(widthMeters, heightMeters, 1);
  sprite.position.set(x, y, z);
  scene.add(sprite);

  // PNGs already have a real alpha channel — load straight from disk.
  // JPGs need the canvas-based chroma key to fake transparency.
  if (url.endsWith('.png')) {
    const tex = texLoader.load(url);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    sprite.material = new THREE.SpriteMaterial({
      map: tex, transparent: true, alphaTest: 0.5,
    });
  } else {
    chromaKeyImageToTexture(url).then((tex) => {
      sprite.material = new THREE.SpriteMaterial({
        map: tex, transparent: true, alphaTest: 0.5,
      });
    });
  }
  return sprite;
}

// --- Aunty on the balcony (facing batsman). Sprite aspect 848/1264≈0.671.
// Placed to the left of center so the breakable window to her right
// stays clearly visible and a sixer still reaches the target.
const AUNTY_H = 2.2;
const auntySprite = makeSpriteFromUrl(
  '/assets/sprites/aunty_calm.jpg',
  AUNTY_H * (848 / 1264), AUNTY_H,
  -1.4, 11.425 + AUNTY_H / 2, BALC_Z - 0.2,
);

// Preload shocked texture (chroma-keyed) so phase 5 can swap instantly
const auntyState = { calm: null, shocked: null };
chromaKeyImageToTexture('/assets/sprites/aunty_calm.jpg').then((tex) => {
  auntyState.calm = tex;
});
chromaKeyImageToTexture('/assets/sprites/aunty_shocked.jpg').then((tex) => {
  auntyState.shocked = tex;
});

// --- Uncle reading newspaper, parked on a chair on the right side
// PNG sprite aspect 848/1264 ≈ 0.671.
const UNCLE_H = 1.7;
makeSpriteFromUrl(
  '/assets/sprites/uncle.png',
  UNCLE_H * (848 / 1264), UNCLE_H,
  3.0, UNCLE_H / 2, -4,
);

// --- Kid cycling across the gully in the background (animated path)
// PNG sprite aspect 1264/848 ≈ 1.49.
const KID_H = 1.5;
const kidSprite = makeSpriteFromUrl(
  '/assets/sprites/kid_cycle.png',
  KID_H * (1264 / 848), KID_H,
  -5, KID_H / 2, -14,
);
const kidAnim = { elapsed: Math.random() * 5, crossSeconds: 8, pauseSeconds: 3 };

function updateKid(dt) {
  kidAnim.elapsed += dt;
  const cycle = kidAnim.crossSeconds + kidAnim.pauseSeconds;
  const t = kidAnim.elapsed % cycle;
  if (t > kidAnim.crossSeconds) {
    kidSprite.visible = false;
  } else {
    kidSprite.visible = true;
    const p = t / kidAnim.crossSeconds;
    kidSprite.position.x = -5 + 10 * p;
  }
}

// --- Dog GLB, sleeping on the left side of the gully
new GLTFLoader().load('/assets/models/dog.glb', (gltf) => {
  const m = gltf.scene;
  m.traverse((o) => {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
  });
  const bbox = new THREE.Box3().setFromObject(m);
  const size = bbox.getSize(new THREE.Vector3());
  const longest = Math.max(size.x, size.y, size.z);
  m.scale.setScalar(0.9 / longest);
  bbox.setFromObject(m);
  const center = bbox.getCenter(new THREE.Vector3());
  m.position.set(-3.2 - center.x, -bbox.min.y, -7 - center.z);
  m.rotation.y = Math.PI / 2;
  scene.add(m);
});

// --- Scooter GLB, parked against the left wall further down
new GLTFLoader().load('/assets/models/scooter.glb', (gltf) => {
  const m = gltf.scene;
  m.traverse((o) => {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
  });
  const bbox = new THREE.Box3().setFromObject(m);
  const size = bbox.getSize(new THREE.Vector3());
  const longest = Math.max(size.x, size.y, size.z);
  m.scale.setScalar(1.8 / longest);
  bbox.setFromObject(m);
  const center = bbox.getCenter(new THREE.Vector3());
  m.position.set(-3.2 - center.x, -bbox.min.y, -11 - center.z);
  m.rotation.y = -Math.PI / 2;
  scene.add(m);
});

// --- Laundry: two clothes lines strung across the gully with shirts
const ropeMat = new THREE.MeshStandardMaterial({ color: 0x3a2f20, roughness: 0.9 });
const clothPalette = [0xe94560, 0x4ecdc4, 0xf7b32b, 0xff8b3d, 0xa8dadc, 0x6a4c93, 0xf1faee];
const laundryLines = [
  { z: -6.5, y: 6.2 },
  { z: -11.5, y: 6.4 },
];
for (const [li, line] of laundryLines.entries()) {
  // Rope
  makeBox(ropeMat, 8.1, 0.04, 0.04, 0, line.y, line.z);
  // 5 clothes hanging on each line
  for (let i = 0; i < 5; i++) {
    const x = -3.2 + i * 1.6;
    const color = clothPalette[(i + li * 3) % clothPalette.length];
    const clothMat = new THREE.MeshStandardMaterial({
      color, roughness: 0.9, side: THREE.DoubleSide,
    });
    const g = new THREE.PlaneGeometry(0.7, 0.95);
    const m = new THREE.Mesh(g, clothMat);
    m.position.set(x, line.y - 0.52, line.z);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
  }
}

// ========================================================================
// Phase 5 — Sixer payoff (shatter + aunty swap + audio hooks)
// ========================================================================

// Audio — HTML5 Audio with graceful failure for files not on disk yet.
// Only voice_preview_aunty.mp3 actually exists today; drop the others
// into /public/assets/audio/ and they'll start playing automatically.
function loadSfx(url, { volume = 1.0, loop = false } = {}) {
  const a = new Audio(url);
  a.volume = volume;
  a.loop = loop;
  a.preload = 'auto';
  a.addEventListener('error', () => {}); // silent on 404
  return a;
}
function playSfx(a, { fromSec = 0, stopAfter = null } = {}) {
  if (!a) return;
  try {
    a.currentTime = fromSec;
    const p = a.play();
    if (p && p.catch) p.catch(() => {});
    if (stopAfter != null) {
      clearTimeout(a._stopT);
      a._stopT = setTimeout(() => { try { a.pause(); } catch (e) {} }, stopAfter * 1000);
    }
  } catch (e) {}
}

const sfx = {
  bat:      loadSfx('/assets/audio/bat_thwack.mp3',    { volume: 0.7 }),
  glass:    loadSfx('/assets/audio/glass_shatter.mp3', { volume: 0.9 }),
  bark:     loadSfx('/assets/audio/dog_bark.mp3',      { volume: 0.85 }),
  six:      loadSfx('/assets/audio/six_call.mp3',      { volume: 0.9 }),
  ambience: loadSfx('/assets/audio/city_ambience.mp3', { volume: 0.25, loop: true }),
  aunty:    loadSfx('/assets/audio/voice_preview_aunty.mp3', { volume: 0.95 }),
};

// Browsers block autoplay until a user gesture — start ambience on first SPACE
let ambienceStarted = false;
function startAmbience() {
  if (ambienceStarted) return;
  ambienceStarted = true;
  playSfx(sfx.ambience);
}

// Glass shatter particle system — simple Newtonian shards with gravity
const glassShards = [];

function shatterWindow() {
  const count = 48;
  const shardMat = new THREE.MeshPhysicalMaterial({
    color: 0xcde6ed,
    roughness: 0.12,
    metalness: 0.0,
    transmission: 0.5,
    thickness: 0.05,
    clearcoat: 1.0,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
  });
  for (let i = 0; i < count; i++) {
    const sx = 0.04 + Math.random() * 0.07;
    const sy = 0.04 + Math.random() * 0.07;
    const shard = new THREE.Mesh(
      new THREE.BoxGeometry(sx, sy, 0.02),
      shardMat.clone(),
    );
    shard.position.set(
      WINDOW_POS.x + (Math.random() - 0.5) * WINDOW_SIZE.x * 0.95,
      WINDOW_POS.y + (Math.random() - 0.5) * WINDOW_SIZE.y * 0.95,
      WINDOW_POS.z + 0.05,
    );
    shard.userData = {
      vx: (Math.random() - 0.5) * 3,
      vy: 1.0 + Math.random() * 3.5,
      vz: 2.5 + Math.random() * 5,   // blown forward by the ball
      spinX: (Math.random() - 0.5) * 8,
      spinY: (Math.random() - 0.5) * 8,
      spinZ: (Math.random() - 0.5) * 8,
      life: 3.0,
    };
    shard.castShadow = true;
    scene.add(shard);
    glassShards.push(shard);
  }
}

// Bullet-time factor for shards only — motion runs slower so the
// moment reads, but life still uses real dt so they don't hang forever.
const SHARD_TIME_SCALE = 0.65;

function updateShards(dt) {
  const sdt = dt * SHARD_TIME_SCALE;
  for (let i = glassShards.length - 1; i >= 0; i--) {
    const s = glassShards[i];
    const u = s.userData;
    u.life -= dt;
    if (u.life <= 0) {
      scene.remove(s);
      s.geometry.dispose();
      s.material.dispose();
      glassShards.splice(i, 1);
      continue;
    }
    u.vy -= 9.82 * sdt;
    s.position.x += u.vx * sdt;
    s.position.y += u.vy * sdt;
    s.position.z += u.vz * sdt;
    if (s.position.y < 0.05) {
      s.position.y = 0.05;
      u.vy = -u.vy * 0.25;
      u.vx *= 0.55;
      u.vz *= 0.55;
    }
    s.rotation.x += u.spinX * sdt;
    s.rotation.y += u.spinY * sdt;
    s.rotation.z += u.spinZ * sdt;
    if (u.life < 1.0) s.material.opacity = 0.9 * u.life;
  }
}

// Payoff trigger — called from the window collision handler
function triggerWindowPayoff() {
  shatterWindow();
  playSfx(sfx.glass);
  playSfx(sfx.aunty, { fromSec: 5.0, stopAfter: 4.0 });
  // Short delay on the bark so it feels reactive, not simultaneous
  setTimeout(() => playSfx(sfx.bark), 350);
  if (auntyState.shocked) {
    auntySprite.material.map = auntyState.shocked;
    auntySprite.material.needsUpdate = true;
  }
}

// ========================================================================
// Phase 6 — Cameras (first-person / chase on hit / cinematic orbit)
// ========================================================================
let cameraMode = 'firstPerson'; // 'firstPerson' | 'chase' | 'orbit'

// Drone-cam: inside the gully x-corridor (|x| < 4) so it's not embedded
// in a flanking wall, and above the 8m roofline so the shot reads as a
// cinematic overhead follow, not "inside a building."
const chaseState = {
  elapsed: 0,
  duration: 3.0,
  start: new THREE.Vector3(2.2, 9.0, 2.5),
  end:   new THREE.Vector3(3.2, 10.5, -2.0),
};

const orbitState = {
  center: new THREE.Vector3(0, 7, -8),
  radius: 17,
  heightOffset: 5,
  angle: Math.PI * 0.25,
  speed: 0.18, // rad/s — slow establishing pan
};

function setFirstPerson() {
  cameraMode = 'firstPerson';
  camera.position.copy(fp.pos);
  camera.lookAt(fp.target);
}

function selectPreset(n) {
  const p = FP_PRESETS[n];
  if (!p) return;
  fp.pos.copy(p.pos);
  fp.target.copy(p.target);
  fp.active = n;
  setFirstPerson();
  showLabel(`VIEW: ${p.label}`, '#a8dadc');
}

function startChase() {
  if (cameraMode === 'orbit') return; // don't interrupt an orbit in progress
  cameraMode = 'chase';
  chaseState.elapsed = 0;
}

function toggleOrbit() {
  if (cameraMode === 'orbit') {
    setFirstPerson();
  } else {
    cameraMode = 'orbit';
  }
}

function updateCamera(dt) {
  if (cameraMode === 'chase') {
    chaseState.elapsed += dt;
    const t = Math.min(chaseState.elapsed / chaseState.duration, 1);
    camera.position.lerpVectors(chaseState.start, chaseState.end, t);
    camera.lookAt(
      ballBody.position.x,
      ballBody.position.y,
      ballBody.position.z,
    );
    if (chaseState.elapsed >= chaseState.duration) {
      setFirstPerson();
    }
  } else if (cameraMode === 'orbit') {
    orbitState.angle += orbitState.speed * dt;
    camera.position.set(
      orbitState.center.x + Math.cos(orbitState.angle) * orbitState.radius,
      orbitState.center.y + orbitState.heightOffset,
      orbitState.center.z + Math.sin(orbitState.angle) * orbitState.radius,
    );
    camera.lookAt(orbitState.center);
  }
  // firstPerson: camera held at FP_POS/FP_TARGET (set on entry)
}

// ========================================================================
// Swing + bowling state
// ========================================================================
const PARAMS = {
  swingImpulseForward: 6,
  swingImpulseUpward: 4.6,
  swingImpulseSideways: 0,
};

const bowl = {
  startPos: new CANNON.Vec3(0, 1.0, -10),
  velocity: new CANNON.Vec3(0, 6, 8),
  inFlight: false,
};

// Intent-based swing model: pressing S/F queues a shot. When the ball
// crosses the bat's z-line we apply the impulse directly and also start
// the swing animation so it reads as a real connect. The geometric
// collision path only fires for MISTIMED (no shot queued).
const BAT_TRIGGER_Z = -0.7;   // fire impulse just before bat volume (z=-0.625)
const QUEUE_CUTOFF_Z = -0.3;  // ball past this → too late to queue
const SWING_RATE = 6;         // rad/s → ~0.52s animation

const swing = {
  queuedShot: null,    // 'sixer' | 'four' | null
  animActive: false,
  animProgress: 0,
  justHit: false,
};

function launchBall() {
  ballBody.position.copy(bowl.startPos);
  ballBody.velocity.copy(bowl.velocity);
  ballBody.angularVelocity.setZero();
  ballBody.force.setZero();
  ballBody.torque.setZero();
  ballBody.wakeUp();
  bowl.inFlight = true;
  swing.justHit = false;
  swing.queuedShot = null;
  swing.animActive = false;
  swing.animProgress = 0;
  batBody.quaternion.setFromEuler(0, 0, 0);
}

function queueShot(shot) {
  if (!bowl.inFlight) return;
  if (swing.justHit) return;
  if (swing.queuedShot) return;
  if (ballBody.position.z > QUEUE_CUTOFF_Z) return; // ball already at/past bat
  swing.queuedShot = shot;
}

// ========================================================================
// Collision → outcome (PHYSICS.md tiering)
// ========================================================================
const hud = {
  runs: 0,
  runsEl: document.getElementById('runs'),
  labelEl: document.getElementById('shot-label'),
};

function showLabel(text, color = '#fcd34d') {
  hud.labelEl.textContent = text;
  hud.labelEl.style.color = color;
  hud.labelEl.style.opacity = '1';
  clearTimeout(hud._t);
  hud._t = setTimeout(() => (hud.labelEl.style.opacity = '0'), 1500);
}

function addRuns(n) {
  hud.runs += n;
  hud.runsEl.textContent = String(hud.runs);
}

function applyShot(shot) {
  let label, scale, runs, color;
  if (shot === 'four') {
    label = 'FOUR!'; scale = 0.55; runs = 4; color = '#fcd34d';
  } else {
    label = 'SIX!';  scale = 1.0;  runs = 6; color = '#fbbf24';
  }
  // Clean up incoming spin/velocity so the impulse defines the shot cleanly
  ballBody.angularVelocity.setZero();
  ballBody.applyImpulse(
    new CANNON.Vec3(
      PARAMS.swingImpulseSideways * scale,
      PARAMS.swingImpulseUpward * scale,
      -PARAMS.swingImpulseForward * scale,
    ),
    ballBody.position,
  );
  showLabel(label, color);
  addRuns(runs);
  playSfx(sfx.bat);
  if (shot === 'sixer') playSfx(sfx.six);
  startChase();
}

// Geometric collision handlers — MISTIMED (bat) and window (phase 5 payoff)
ballBody.addEventListener('collide', (event) => {
  if (event.body === batBody) {
    if (swing.justHit) return;
    if (swing.queuedShot) return; // scheduled hit will handle this ball
    swing.justHit = true;
    const scale = 0.15;
    ballBody.applyImpulse(
      new CANNON.Vec3(
        0,
        PARAMS.swingImpulseUpward * scale,
        -PARAMS.swingImpulseForward * scale,
      ),
      ballBody.position,
    );
    showLabel('MISTIMED', '#f87171');
    playSfx(sfx.bat);
    startChase();
    return;
  }

  if (event.body === windowBody) {
    if (windowState.broken) return;
    windowState.broken = true;
    windowMesh.visible = false;
    showLabel('WINDOW!!', '#ef4444');
    triggerWindowPayoff();
  }
});

// ========================================================================
// Input
// ========================================================================
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  switch (e.code) {
    case 'Space':  e.preventDefault(); startAmbience(); launchBall(); break;
    case 'KeyS':   queueShot('sixer'); break;
    case 'KeyF':   queueShot('four'); break;
    case 'KeyC':   toggleOrbit(); break;
    case 'Digit1': selectPreset(1); break;
    case 'Digit2': selectPreset(2); break;
    case 'Digit3': selectPreset(3); break;
    case 'Digit4': selectPreset(4); break;
  }
});

// ========================================================================
// Resize
// ========================================================================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  bloomPass.resolution.set(window.innerWidth, window.innerHeight);
});

// ========================================================================
// Loop — fixedStep + swing update + mesh sync
// ========================================================================
const timer = new THREE.Timer();

function updateBatting(dt) {
  // Start the swing animation when the ball is close (~0.3s from bat).
  // This keeps the visual timed to impact even if the player pressed early.
  if (swing.queuedShot && !swing.animActive && !swing.justHit) {
    const dz = BAT_PIVOT.z - ballBody.position.z; // positive while approaching
    const vz = Math.max(ballBody.velocity.z, 0.1);
    const tToBat = dz / vz;
    if (tToBat < 0.3 || dz < 0) {
      swing.animActive = true;
      swing.animProgress = 0;
    }
  }

  // Drive bat rotation
  if (swing.animActive) {
    swing.animProgress += dt * SWING_RATE;
    const angle = Math.sin(swing.animProgress) * (Math.PI / 2);
    batBody.quaternion.setFromEuler(0, 0, angle);
    if (swing.animProgress >= Math.PI) {
      swing.animActive = false;
      swing.animProgress = 0;
      batBody.quaternion.setFromEuler(0, 0, 0);
    }
  } else {
    batBody.quaternion.setFromEuler(0, 0, 0);
  }

  // Apply the scheduled impulse just before the ball enters the bat volume
  if (swing.queuedShot && !swing.justHit && ballBody.position.z >= BAT_TRIGGER_Z) {
    applyShot(swing.queuedShot);
    swing.justHit = true;
    swing.queuedShot = null;
    // Make sure the swing animation is playing for visual feedback
    if (!swing.animActive) {
      swing.animActive = true;
      swing.animProgress = 0;
    }
  }
}

function syncMesh(mesh, body) {
  mesh.position.copy(body.position);
  mesh.quaternion.copy(body.quaternion);
}

function animate() {
  requestAnimationFrame(animate);
  timer.update();
  const dt = timer.getDelta();

  updateBatting(dt);
  updateKid(dt);
  updateShards(dt);
  world.fixedStep(1 / 60);

  updateCamera(dt);

  syncMesh(ballMesh, ballBody);
  syncMesh(batMesh, batBody);
  syncMesh(batVisual, batBody);

  composer.render();
}

animate();
