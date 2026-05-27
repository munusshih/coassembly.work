// 3D shape rendered into #asterisk via three.js.
// Reads `data-shape` from <body> to pick which builder to run.
// THREE is loaded via CDN <script> in src/components/Background.astro.

// ---------------------------------------------------------------------------
// EDIT HERE — Per-shape display size (fraction of the smaller viewport
// dimension). Tweak to make a shape larger (closer to 1) or smaller.
// ---------------------------------------------------------------------------
const SHAPE_SIZES = {
  asterisk: 0.65,
  knot: 0.45,
  cube: 0.65,
  rings: 0.65,
  pen: 0.6,
  axe: 0.6,
};

// ---------------------------------------------------------------------------
// EDIT HERE — Flat icon outlines, each an array of [x, y] points forming a
// closed polygon. The renderer extrudes them into 3D with a bevel.
// To add a new shape: add a key here, add it to SHAPE_SIZES above, register
// it in `builders` below, and set `shape: <key>` in page frontmatter.
// ---------------------------------------------------------------------------
const SHAPE_PATHS = {
  // Pen — long body with a triangular tip on the right
  pen: [
    [-3.0, 0.3],
    [2.0, 0.3],
    [2.9, 0],
    [2.0, -0.3],
    [-3.0, -0.3],
  ],
  // Axe — long handle on the left, blade widens on the right
  axe: [
    [-3.0, 0.18],
    [1.6, 0.18],
    [1.8, 0.95],
    [3.2, 0.55],
    [3.2, -0.55],
    [1.8, -0.95],
    [1.6, -0.18],
    [-3.0, -0.18],
  ],
};

window.addEventListener("load", () => {
  const THREE = window.THREE;
  if (typeof THREE === "undefined") {
    console.error("three.js failed to load");
    return;
  }
  const container = document.getElementById("asterisk");
  if (!container) return;

  const isMobile = window.matchMedia(
    "(max-width: 799px), (pointer: coarse)",
  ).matches;
  const dprCap = isMobile ? 1.25 : 2;
  const cubeSize = isMobile ? 256 : 1024;
  const sphereSegW = isMobile ? 32 : 64;
  const sphereSegH = isMobile ? 16 : 32;
  const bevelSegs = isMobile ? 4 : 16;
  const curveSegs = isMobile ? 12 : 32;

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: !isMobile,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, dprCap));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.LinearToneMapping;
  renderer.toneMappingExposure = 1.0;

  const canvas = renderer.domElement;
  canvas.style.position = "fixed";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.pointerEvents = "none";
  canvas.setAttribute("aria-hidden", "true");
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    35,
    window.innerWidth / window.innerHeight,
    0.1,
    100,
  );
  camera.position.set(0, 0, 12);

  const envScene = new THREE.Scene();
  const envSphere = new THREE.Mesh(
    new THREE.SphereGeometry(50, sphereSegW, sphereSegH),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader:
        "varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader:
        "varying vec3 vDir; void main(){ vec3 d = normalize(vDir); vec3 col = vec3(0.0); float hot = pow(max(dot(d, normalize(vec3(0.3, 0.78, 0.45))), 0.0), 32.0); col += vec3(11.0) * hot; float side = pow(max(dot(d, normalize(vec3(-0.9, 0.32, 0.12))), 0.0), 24.0); col += vec3(6.5) * side; float low = pow(max(dot(d, normalize(vec3(0.15, -0.5, 0.55))), 0.0), 26.0); col += vec3(4.5) * low; gl_FragColor = vec4(col, 1.0); }",
    }),
  );
  envScene.add(envSphere);

  const cubeRT = new THREE.WebGLCubeRenderTarget(cubeSize, {
    type: THREE.HalfFloatType,
  });
  const cubeCam = new THREE.CubeCamera(0.1, 100, cubeRT);
  envScene.add(cubeCam);
  cubeCam.update(renderer, envScene);

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileCubemapShader();
  const envTexture = pmrem.fromCubemap(cubeRT.texture).texture;
  pmrem.dispose();
  cubeRT.dispose();
  scene.environment = envTexture;

  const material = new THREE.MeshStandardMaterial({
    color: 0x000000,
    metalness: 1.0,
    roughness: 0.04,
    envMapIntensity: 0.85,
  });

  const extrudeFromPoints = (points) => {
    const s = new THREE.Shape();
    s.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      s.lineTo(points[i][0], points[i][1]);
    }
    s.closePath();
    const depth = 0.42;
    const geom = new THREE.ExtrudeGeometry(s, {
      steps: 1,
      depth,
      bevelEnabled: true,
      bevelThickness: 0.16,
      bevelSize: 0.16,
      bevelOffset: 0,
      bevelSegments: bevelSegs,
      curveSegments: curveSegs,
    });
    geom.translate(0, 0, -depth / 2);
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (const [x, y] of points) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const diameter = Math.max(maxX - minX, maxY - minY) + 0.32;
    const g = new THREE.Group();
    g.add(new THREE.Mesh(geom, material));
    return { group: g, baseDiameter: diameter };
  };

  const builders = {
    asterisk() {
      const len = 5.4;
      const thick = 0.42;
      const depth = 0.42;
      const cornerR = 0.208;
      const s = new THREE.Shape();
      const hl = len / 2;
      const ht = thick / 2;
      const r = Math.min(cornerR, ht - 0.001);
      s.moveTo(-hl + r, -ht);
      s.lineTo(hl - r, -ht);
      s.quadraticCurveTo(hl, -ht, hl, -ht + r);
      s.lineTo(hl, ht - r);
      s.quadraticCurveTo(hl, ht, hl - r, ht);
      s.lineTo(-hl + r, ht);
      s.quadraticCurveTo(-hl, ht, -hl, ht - r);
      s.lineTo(-hl, -ht + r);
      s.quadraticCurveTo(-hl, -ht, -hl + r, -ht);
      s.closePath();
      const geom = new THREE.ExtrudeGeometry(s, {
        steps: 1,
        depth,
        bevelEnabled: true,
        bevelThickness: 0.205,
        bevelSize: 0.205,
        bevelOffset: 0,
        bevelSegments: bevelSegs,
        curveSegments: curveSegs,
      });
      geom.translate(0, 0, -depth / 2);
      const g = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const mesh = new THREE.Mesh(geom, material);
        mesh.rotation.z = (Math.PI / 3) * i;
        g.add(mesh);
      }
      return { group: g, baseDiameter: len + 2 * 0.205 };
    },
    knot() {
      const R = 1.7;
      const t = 0.42;
      const tubular = isMobile ? 96 : 200;
      const radial = isMobile ? 10 : 18;
      const geom = new THREE.TorusKnotGeometry(R, t, tubular, radial, 2, 3);
      const g = new THREE.Group();
      g.add(new THREE.Mesh(geom, material));
      return { group: g, baseDiameter: 2 * (R + t) };
    },
    cube() {
      const size = 3.0;
      const geom = new THREE.BoxGeometry(size, size, size);
      const g = new THREE.Group();
      g.add(new THREE.Mesh(geom, material));
      return { group: g, baseDiameter: size * Math.sqrt(3) };
    },
    rings() {
      const R = 0.95;
      const t = 0.2;
      const ringGeom = new THREE.TorusGeometry(
        R,
        t,
        isMobile ? 14 : 24,
        isMobile ? 48 : 96,
      );
      const g = new THREE.Group();
      const r1 = new THREE.Mesh(ringGeom, material);
      r1.rotation.set(Math.PI / 2, 0, 0);
      g.add(r1);
      const r2 = new THREE.Mesh(ringGeom, material);
      r2.rotation.set(0, Math.PI / 2, Math.PI / 4);
      g.add(r2);
      const r3 = new THREE.Mesh(ringGeom, material);
      r3.rotation.set(Math.PI / 4, Math.PI / 4, 0);
      g.add(r3);
      return { group: g, baseDiameter: 2 * (R + t) };
    },
    pen() {
      return extrudeFromPoints(SHAPE_PATHS.pen);
    },
    axe() {
      return extrudeFromPoints(SHAPE_PATHS.axe);
    },
  };

  const shapeKey = document.body.dataset.shape || "asterisk";
  const built = (builders[shapeKey] || builders.asterisk)();
  const group = built.group;
  const baseDiameter = built.baseDiameter;
  scene.add(group);

  const key = new THREE.DirectionalLight(0xffffff, 0.7);
  key.position.set(-4, 5, 6);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x99bbff, 0.35);
  fill.position.set(4, -2, 3);
  scene.add(fill);

  let rotX = -0.18,
    rotY = 0.22,
    rotZ = 0;
  let velX = 0,
    velY = 0,
    velZ = 0;
  let targetVelX = 0,
    targetVelY = 0,
    targetVelZ = 0;
  let lastScroll = window.scrollY;
  let lastScrollTime = performance.now();
  const idleX = -0.022;
  const idleY = 0.035;
  const idleZ = 0.06;
  const damping = 0.975;
  const lerpRate = 3.0;
  const maxVel = 8.0;

  const clamp = (v) => Math.max(-maxVel, Math.min(maxVel, v));
  window.addEventListener(
    "scroll",
    () => {
      const now = performance.now();
      const dt = Math.max(8, now - lastScrollTime);
      const mag = Math.abs(window.scrollY - lastScroll);
      const speed = mag / dt;
      const impulse = Math.min(speed, 12) * mag * 0.0015 + speed * 0.4;
      targetVelX = clamp(
        targetVelX + impulse * 0.5 * (Math.random() * 2 - 1),
      );
      targetVelY = clamp(
        targetVelY + impulse * 0.75 * (Math.random() * 2 - 1),
      );
      targetVelZ = clamp(
        targetVelZ + impulse * 1.0 * (Math.random() * 2 - 1),
      );
      lastScroll = window.scrollY;
      lastScrollTime = now;
    },
    { passive: true },
  );

  const sizeFactor = SHAPE_SIZES[shapeKey] ?? 0.65;
  function fitAsterisk() {
    const aspect = window.innerWidth / window.innerHeight;
    const fovRad = (35 * Math.PI) / 180;
    const visH = 2 * 12 * Math.tan(fovRad / 2);
    const visW = visH * aspect;
    const minVis = Math.min(visH, visW);
    const targetSize = minVis * sizeFactor;
    group.scale.setScalar(targetSize / baseDiameter);
  }
  fitAsterisk();

  let lastTime = performance.now();
  let running = true;

  let lastW = window.innerWidth;
  let lastH = window.innerHeight;
  let resizeRaf = 0;
  const urlBarSlop = isMobile ? 120 : 0;
  window.addEventListener("resize", () => {
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = 0;
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (w === lastW && Math.abs(h - lastH) <= urlBarSlop) return;
      lastW = w;
      lastH = h;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      fitAsterisk();
      renderer.render(scene, camera);
    });
  });

  canvas.addEventListener(
    "webglcontextlost",
    (e) => {
      e.preventDefault();
      running = false;
    },
    false,
  );
  canvas.addEventListener(
    "webglcontextrestored",
    () => {
      running = true;
      lastTime = performance.now();
      requestAnimationFrame(animate);
    },
    false,
  );

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      running = false;
    } else if (!running) {
      running = true;
      lastTime = performance.now();
      requestAnimationFrame(animate);
    }
  });

  function animate(now) {
    if (!running) return;
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    const decay = Math.pow(damping, dt * 60);
    targetVelX *= decay;
    targetVelY *= decay;
    targetVelZ *= decay;

    const lerp = 1 - Math.exp(-lerpRate * dt);
    velX += (targetVelX - velX) * lerp;
    velY += (targetVelY - velY) * lerp;
    velZ += (targetVelZ - velZ) * lerp;

    rotX += (idleX + velX) * dt;
    rotY += (idleY + velY) * dt;
    rotZ += (idleZ + velZ) * dt;

    group.rotation.x = rotX;
    group.rotation.y = rotY;
    group.rotation.z = rotZ;

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  requestAnimationFrame((t) => {
    lastTime = t;
    animate(t);
  });
});
