/* Home: a UR5e writes the name on a drafting sheet. Drag on the sheet and it draws with you. */
import { Sound, CHORDS, NAME_MOTIF, reduce, $, $$, clamp, lerp, theme } from './site.js';
import { buildUR5e, makeIK } from './robot.js';

const minjerk = t => { t = clamp(t, 0, 1); return t * t * t * (10 + t * (-15 + 6 * t)); };

/* single-line drafting letters, in units of cap height (x right, y up) */
const arc = (cx, cy, rx, ry, a0, a1, n = 18) => Array.from({ length: n + 1 }, (_, i) => { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
const GLYPHS = {
  S: { w: .56, s: [[...arc(.28, .745, .27, .245, 12, 270, 16), ...arc(.28, .255, .27, .255, 90, -192, 18)]] },
  H: { w: .6, s: [[[0, 1], [0, 0]], [[.6, 1], [.6, 0]], [[0, .52], [.6, .52]]] },
  U: { w: .6, s: [[[0, 1], [0, .3], ...arc(.3, .3, .3, .3, 180, 360, 14).slice(1), [.6, 1]]] },
  N: { w: .6, s: [[[0, 0], [0, 1], [.6, 0], [.6, 1]]] },
  K: { w: .58, s: [[[0, 1], [0, 0]], [[.58, 1], [0, .38]], [[.17, .55], [.6, 0]]] },
  A: { w: .64, s: [[[0, 0], [.32, 1], [.64, 0]], [[.11, .34], [.53, .34]]] },
  I: { w: 0, s: [[[0, 1], [0, 0]]] },
  X: { w: .6, s: [[[0, 1], [.6, 0]], [[0, 0], [.6, 1]]] },
  ' ': { w: .34, s: [] }
};

async function boot() {
  const [THREE, { RoomEnvironment }, { GLTFLoader }, BGU] = await Promise.all([
    import('three'), import('three/addons/environments/RoomEnvironment.js'), import('three/addons/loaders/GLTFLoader.js'), import('three/addons/utils/BufferGeometryUtils.js')
  ]);
  const hero = $('#hero'), canvas = $('#plot'), status = $('#status');
  const say = s => { if (status.textContent !== s) status.textContent = s; };
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .55;
  const camera = new THREE.PerspectiveCamera(26, 1, .01, 30);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8dbe0, .9));
  const key = new THREE.DirectionalLight(0xffffff, 2.3); key.position.set(-1.2, 2.6, 1.1); key.target.position.set(0, 0, .1); scene.add(key, key.target);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 4; key.shadow.blurSamples = 12;
  Object.assign(key.shadow.camera, { left: -1, right: 1, top: 1, bottom: -1, near: .5, far: 5 }); key.shadow.bias = -.0002; key.shadow.normalBias = .004;
  /* ---------------- the page itself: an invisible floor that hides everything under it, so the real
     page background shows through. The arm breaks out of it; the broken pieces are real 3D shards. ---------------- */
  const BASE_X = 0, BASE_Z = -.27, SLAB = .028;
  renderer.setClearColor(0x000000, 0);
  const depthOnly = new THREE.MeshBasicMaterial({ colorWrite: false });
  // the outline of the break, and Voronoi cells inside it
  const NB = 26, outline = [];
  for (let i = 0; i < NB; i++) { const a = i / NB * Math.PI * 2, r = .15 + Math.sin(a * 3 + 1) * .012 + (Math.random() - .5) * .016; outline.push([BASE_X + Math.cos(a) * r, BASE_Z + Math.sin(a) * r]); }
  const seeds = []; while (seeds.length < 64) { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * .15; seeds.push([BASE_X + Math.cos(a) * r, BASE_Z + Math.sin(a) * r]); }
  function clip(poly, n, c) {      // keep the side where (p - c) . n <= 0
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const A = poly[i], B = poly[(i + 1) % poly.length], da = (A[0] - c[0]) * n[0] + (A[1] - c[1]) * n[1], db = (B[0] - c[0]) * n[0] + (B[1] - c[1]) * n[1];
      if (da <= 0) out.push(A);
      if ((da < 0) !== (db < 0)) { const t = da / (da - db); out.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]); }
    }
    return out;
  }
  const cells = seeds.map((si, i) => { let poly = outline.slice(); seeds.forEach((sj, j) => { if (i === j || poly.length < 3) return; poly = clip(poly, [sj[0] - si[0], sj[1] - si[1]], [(si[0] + sj[0]) / 2, (si[1] + sj[1]) / 2]); }); return poly; }).filter(c => c.length >= 3);
  const SH = { light: { top: 0xEDEDE8, side: 0xFF5A1F, line: 0xFF5A1F }, dark: { top: 0x24262A, side: 0xFF6A33, line: 0xFF6A33 } };
  const capMat = new THREE.MeshPhysicalMaterial({ color: SH[theme()].top, roughness: .38, clearcoat: .8, clearcoatRoughness: .2 }), sideMat = new THREE.MeshStandardMaterial({ color: SH[theme()].side, roughness: .55, emissive: SH[theme()].side, emissiveIntensity: .18 });
  // solid floor until the break, then the same floor with a hole
  const floorSolid = new THREE.Mesh(new THREE.PlaneGeometry(12, 12).rotateX(-Math.PI / 2), depthOnly); floorSolid.renderOrder = -1; scene.add(floorSolid);
  const holeShape = new THREE.Shape([new THREE.Vector2(-6, 6), new THREE.Vector2(6, 6), new THREE.Vector2(6, -6), new THREE.Vector2(-6, -6)]);
  holeShape.holes.push(new THREE.Path(outline.map(([x, z]) => new THREE.Vector2(x, -z))));
  const holeGeo = new THREE.ShapeGeometry(holeShape); holeGeo.rotateX(-Math.PI / 2);
  const floorHoled = new THREE.Mesh(holeGeo, depthOnly); floorHoled.renderOrder = -1; floorHoled.visible = false; scene.add(floorHoled);
  const ground = new THREE.Mesh(holeGeo, new THREE.ShadowMaterial({ color: 0x20242c, opacity: .16 })); ground.position.y = .0002; ground.receiveShadow = true; scene.add(ground);
  // the cut edge of the page and the dark shaft below it
  const rimPts = []; outline.forEach((A, i) => { const B = outline[(i + 1) % NB]; rimPts.push(A[0], 0, A[1], B[0], 0, B[1], B[0], -SLAB, B[1], A[0], 0, A[1], B[0], -SLAB, B[1], A[0], -SLAB, A[1]); });
  const rimGeo = new THREE.BufferGeometry(); rimGeo.setAttribute('position', new THREE.Float32BufferAttribute(rimPts, 3)); rimGeo.computeVertexNormals();
  const rim = new THREE.Mesh(rimGeo, new THREE.MeshStandardMaterial({ color: SH[theme()].side, roughness: 1, side: THREE.DoubleSide })); rim.visible = false; scene.add(rim);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, 1.8, 40, 1, true), new THREE.MeshBasicMaterial({ color: 0x0b0b0c, side: THREE.BackSide }));
  shaft.position.set(BASE_X, -.9 - SLAB, BASE_Z); scene.add(shaft);
  const shaftBottom = new THREE.Mesh(new THREE.CircleGeometry(.2, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x050506 })); shaftBottom.position.set(BASE_X, -1.8, BASE_Z); scene.add(shaftBottom);
  // crack lines that spread out from the middle before it breaks
  const edges = []; cells.forEach(c => c.forEach((A, i) => { const B = c[(i + 1) % c.length]; edges.push({ A, B, d: Math.hypot((A[0] + B[0]) / 2 - BASE_X, (A[1] + B[1]) / 2 - BASE_Z) }); }));
  edges.sort((a, b) => a.d - b.d);
  const crackGeo = new THREE.BufferGeometry(); crackGeo.setAttribute('position', new THREE.Float32BufferAttribute(edges.flatMap(e => [e.A[0], .0008, e.A[1], e.B[0], .0008, e.B[1]]), 3)); crackGeo.setDrawRange(0, 0);
  const lineMat = new THREE.LineBasicMaterial({ color: SH[theme()].line, transparent: true, opacity: 1 });
  const crackLines = new THREE.LineSegments(crackGeo, lineMat); scene.add(crackLines);
  // the shards themselves
  const shards = cells.map(c => {
    const cx = c.reduce((s, p) => s + p[0], 0) / c.length, cz = c.reduce((s, p) => s + p[1], 0) / c.length;
    const shape = new THREE.Shape(c.map(([x, z]) => new THREE.Vector2(x - cx, -(z - cz))));
    const g = new THREE.ExtrudeGeometry(shape, { depth: SLAB - .003, bevelEnabled: true, bevelThickness: .0015, bevelSize: .0012, bevelSegments: 2 }); g.rotateX(-Math.PI / 2); g.translate(0, -SLAB + .0015, 0); g.computeVertexNormals();
    const m = new THREE.Mesh(g, [capMat, sideMat]); m.castShadow = true; m.visible = false; m.position.set(cx, 0, cz); scene.add(m);
    return { m, x0: cx, z0: cz, v: new THREE.Vector3(), w: new THREE.Vector3(), life: 0, rest: false };
  });
  // fine dust
  const DUST = 150, dust = new THREE.InstancedMesh(new THREE.TetrahedronGeometry(.0055), sideMat, DUST); dust.visible = false; dust.castShadow = true; scene.add(dust);
  const dp = Array.from({ length: DUST }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(Math.random() * 6, Math.random() * 6, 0), s: .6 + Math.random() * 1.4 }));
  const holeR = (x, z) => Math.hypot(x - BASE_X, z - BASE_Z) < .15;
  let shake = 0;
  function burst() {
    floorSolid.visible = false; floorHoled.visible = true; rim.visible = true; crackLines.visible = false;
    for (const s of shards) {
      const dx = s.x0 - BASE_X, dz = s.z0 - BASE_Z, d = Math.hypot(dx, dz) || 1, out = .5 + Math.random() * 1.1;
      s.m.visible = true; s.v.set(dx / d * out, 1.6 + Math.random() * 1.8 + (1 - d / .16) * 1.1, dz / d * out);
      s.w.set((Math.random() - .5) * 30, (Math.random() - .5) * 14, (Math.random() - .5) * 30);
    }
    dust.visible = true;
    dp.forEach(d => { const a = Math.random() * Math.PI * 2, r = Math.random() * .12; d.p.set(BASE_X + Math.cos(a) * r, .005, BASE_Z + Math.sin(a) * r); d.v.set(Math.cos(a) * (.25 + Math.random() * .8), .8 + Math.random() * 2.6, Math.sin(a) * (.25 + Math.random() * .8)); });
    shake = 1.6;
    Sound.chord([40, 47, 52], .3, .01);   // E2 B2 E3: Elgar's key, low and open
  }
  const G = -7.5, _q = new THREE.Quaternion(), _e = new THREE.Euler(), _m4 = new THREE.Matrix4(), _s3 = new THREE.Vector3();
  function stepShards(dt) {
    for (const s of shards) {
      if (!s.m.visible) continue;
      s.life += dt;
      if (!s.rest) {
        s.v.y += G * dt; s.m.position.addScaledVector(s.v, dt);
        _q.setFromEuler(_e.set(s.w.x * dt, s.w.y * dt, s.w.z * dt)); s.m.quaternion.premultiply(_q);
        const p = s.m.position;
        if (p.y < .006 && !holeR(p.x, p.z) && s.v.y < 0) { p.y = .006; s.v.y *= -.28; s.v.x *= .55; s.v.z *= .55; s.w.multiplyScalar(.5); if (Math.abs(s.v.y) < .25) { s.rest = true; s.m.quaternion.slerp(new THREE.Quaternion(), .7); } }
      }
      if (s.life > 3.6) { const k = clamp(1 - (s.life - 3.6) / .7, 0, 1); s.m.scale.setScalar(k); if (k === 0) s.m.visible = false; }
    }
    if (dust.visible) {
      let any = false;
      dp.forEach((d, i) => { d.v.y += G * dt; d.p.addScaledVector(d.v, dt); if (d.p.y < .002 && d.v.y < 0) { d.p.y = .002; d.v.multiplyScalar(.3); } d.r.x += dt * 9; d.r.y += dt * 7; const age = shards[0].life, k = clamp(1 - (age - 1.1) / .6, 0, 1); if (k > 0) any = true; _m4.compose(d.p, _q.setFromEuler(d.r), _s3.setScalar(d.s * k)); dust.setMatrixAt(i, _m4); });
      dust.instanceMatrix.needsUpdate = true; if (!any) dust.visible = false;
    }
  }
  addEventListener('themechange', () => { const c = SH[theme()]; capMat.color.set(c.top); sideMat.color.set(c.side); rim.material.color.set(c.side); lineMat.color.set(c.line); });

  /* ---------------- the drafting sheet ---------------- */
  const SW = .92, SD = .5, SZ = .17, PXM = 1600 / SW, CW = 1600, CH = Math.round(SD * PXM);
  const mk = () => { const c = document.createElement('canvas'); c.width = CW; c.height = CH; return c; };
  const base = mk(), inkName = mk(), inkYou = mk(), out = mk();
  const toPx = (x, z) => [(x + SW / 2) * PXM, (z - (SZ - SD / 2)) * PXM];
  try { await document.fonts.load('500 30px "Geist Mono"'); } catch (e) {}
  // letter layout
  const H = .088, GAP = .3 * H, word = 'SHUNKAI XU';
  let width = 0; for (const ch of word) width += GLYPHS[ch].w * H + GAP; width -= GAP;
  const X0 = -width / 2, ZB = .2;
  const letters = []; let cx = X0;
  for (const [idx, ch] of [...word].entries()) {
    const g = GLYPHS[ch];
    if (ch !== ' ') letters.push({ ch, idx, strokes: g.s.map(st => st.map(([u, v]) => new THREE.Vector3(cx + u * H, 0, ZB - v * H))), x0: cx, w: g.w * H });
    cx += g.w * H + GAP;
  }
  /* the name is written straight onto the page: a transparent layer holding the ink, a dimension line and a small title block */
  const INK = { light: { ink: '#121212', blue: '#1F4FD8', muted: '#76787B' }, dark: { ink: '#ECECE8', blue: '#7C9BFF', muted: '#80838A' } };
  function drawBase() {
    const c = INK[theme()], x = base.getContext('2d'); x.clearRect(0, 0, CW, CH);
    const [ax, ay] = toPx(X0, ZB - H - .03), [bx] = toPx(X0 + width, 0);
    x.strokeStyle = c.blue; x.fillStyle = c.blue; x.lineWidth = 2;
    x.beginPath(); x.moveTo(ax, ay); x.lineTo(bx, ay); x.stroke();
    for (const [px, d] of [[ax, 1], [bx, -1]]) { x.beginPath(); x.moveTo(px, ay); x.lineTo(px + d * 24, ay - 7); x.lineTo(px + d * 24, ay + 7); x.closePath(); x.fill(); x.beginPath(); x.moveTo(px, ay - 26); x.lineTo(px, toPx(0, ZB - H)[1] - 10); x.stroke(); }
    x.font = '500 28px "Geist Mono", monospace'; x.textAlign = 'center'; x.textBaseline = 'bottom';
    x.fillText(`${Math.round(width * 1000)} mm`, (ax + bx) / 2, ay - 10);
    const [, by] = toPx(0, ZB); x.setLineDash([12, 10]); x.globalAlpha = .55; x.beginPath(); x.moveTo(ax - 40, by); x.lineTo(bx + 40, by); x.stroke(); x.setLineDash([]); x.globalAlpha = 1;
    x.fillStyle = c.muted; x.textAlign = 'left'; x.textBaseline = 'top'; x.font = '500 24px "Geist Mono", monospace';
    x.fillText('FIG. 1   SHUNKAI XU, WRITTEN BY A UR5e   1:1', ax, by + 34);
  }
  drawBase();
  const outX = out.getContext('2d'), tint = mk(), tX = tint.getContext('2d');
  const paperTex = new THREE.CanvasTexture(out); paperTex.colorSpace = THREE.SRGBColorSpace; paperTex.anisotropy = 8;
  let dirty = true;
  const compose = () => {
    outX.clearRect(0, 0, CW, CH); outX.drawImage(base, 0, 0);
    tX.globalCompositeOperation = 'source-over'; tX.clearRect(0, 0, CW, CH); tX.drawImage(inkName, 0, 0);
    tX.globalCompositeOperation = 'source-in'; tX.fillStyle = INK[theme()].ink; tX.fillRect(0, 0, CW, CH);
    outX.drawImage(tint, 0, 0); outX.drawImage(inkYou, 0, 0); paperTex.needsUpdate = true; dirty = false;
  };
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(SW, SD).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: paperTex, transparent: true, toneMapped: false, depthWrite: false }));
  sheet.position.set(0, .0008, SZ); sheet.renderOrder = 2; scene.add(sheet);
  addEventListener('themechange', () => { drawBase(); dirty = true; });

  /* ---------------- the robot ---------------- */
  const robot = buildUR5e(THREE), world = new THREE.Group(); world.rotation.x = -Math.PI / 2; world.position.set(BASE_X, 0, BASE_Z); world.add(robot.root); scene.add(world);
  const M = {
    blue: new THREE.MeshPhysicalMaterial({ color: 0xEEEEEB, roughness: .38, clearcoat: .6, clearcoatRoughness: .3 }),
    grey: new THREE.MeshPhysicalMaterial({ color: 0xC3C6CA, metalness: .45, roughness: .42 }),
    black: new THREE.MeshPhysicalMaterial({ color: 0x1B1C1E, roughness: .62 }),
    alu: new THREE.MeshPhysicalMaterial({ color: 0xCDD0D5, metalness: .9, roughness: .28 })
  };
  const b64 = (await import('./ur5e-data.js')).default, bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const gltf = await new GLTFLoader().parseAsync(bin.buffer, '');
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse(o => {
    if (!o.isMesh) return;
    const [link, col] = (o.name || o.parent.name).split('__');
    const key2 = { upperarm: 'upperarm', forearm: 'forearm', shoulder: 'shoulder', base: 'base', wrist1: 'wrist1', wrist2: 'wrist2', wrist3: 'wrist3' }[link];
    if (!robot.visuals[key2]) return;
    let geo = o.geometry.clone(); geo.applyMatrix4(o.matrixWorld); geo.deleteAttribute('normal'); geo.deleteAttribute('color');
    geo = BGU.toCreasedNormals(geo, Math.PI / 6);
    const mesh = new THREE.Mesh(geo, M[col] || M.grey); mesh.castShadow = mesh.receiveShadow = true;
    robot.visuals[key2].add(mesh);
  });
  // a technical pen on a small adapter
  const pen = new THREE.Group(); robot.tool0.add(pen);
  const along = (geo, z) => { geo.rotateX(Math.PI / 2); geo.translate(0, 0, z); return geo; };
  const pm2 = (c, o = {}) => new THREE.MeshPhysicalMaterial({ color: c, roughness: .4, ...o });
  [[new THREE.CylinderGeometry(.034, .034, .022, 48), .011, pm2(0x1B1C1E)], [new THREE.CylinderGeometry(.0085, .0085, .1, 32), .072, pm2(0x121212, { clearcoat: .8 })],
   [new THREE.CylinderGeometry(.0092, .0092, .012, 32), .03, pm2(0xFF5A1F, { clearcoat: .7 })], [new THREE.CylinderGeometry(.0028, .0085, .016, 32), .13, pm2(0xC9CCD1, { metalness: .9, roughness: .25 })],
   [new THREE.CylinderGeometry(.0007, .0007, .008, 8), .142, pm2(0x222222)]]
    .forEach(([g, z, m]) => { const mesh = new THREE.Mesh(along(g, z), m); mesh.castShadow = true; pen.add(mesh); });
  const TIP = .146;
  robot.set([-1.85, -1.75, 1.85, -1.67, -1.5708, 0]);
  const ik = makeIK(THREE, robot, TIP);

  /* ---------------- motion: a queue of moves and strokes ---------------- */
  const goal = new THREE.Vector3(), REST = new THREE.Vector3(.26, .19, -.08), UP = .014, V_DRAW = 1.6;
  goal.copy(REST); for (let i = 0; i < 40; i++) ik.solve(goal, 6);
  let plan = [], cur = null, mode = 'name', resumeAt = 0, nameDone = false, li = 0, si = 0;
  const travel = (to, speed = 4.2) => ({ type: 'move', from: null, to: to.clone(), speed });
  function queueName(fromLetter = 0, fromStroke = 0) {
    plan = [];
    for (let l = fromLetter; l < letters.length; l++) {
      letters[l].strokes.forEach((st, s) => {
        if (l === fromLetter && s < fromStroke) return;
        const a = st[0];
        plan.push(travel(new THREE.Vector3(a.x, UP, a.z)), { type: 'move', to: a.clone(), speed: 1.6 }, { type: 'line', pts: st, l, s }, { type: 'move', to: new THREE.Vector3(st[st.length - 1].x, UP, st[st.length - 1].z), speed: 1.6, endLetter: s === letters[l].strokes.length - 1 ? l : -1 });
      });
    }
    plan.push(travel(REST, 1.4), { type: 'done' });
  }
  function startTask(t) {
    cur = t; t.t = 0;
    if (t.type === 'move') { t.from = goal.clone(); const d = t.from.distanceTo(t.to); t.T = Math.max(.03, Math.sqrt(d / t.speed) * .16 + d / t.speed * .5); }
    if (t.type === 'line') { t.len = []; let L = 0; for (let i = 1; i < t.pts.length; i++) { L += t.pts[i].distanceTo(t.pts[i - 1]); t.len.push(L); } t.L = L; t.T = L / V_DRAW + .015; }
  }
  const at = (t, s) => { const d = s * t.L; let i = 0; while (i < t.len.length - 1 && t.len[i] < d) i++; const d0 = i ? t.len[i - 1] : 0, seg = t.len[i] - d0 || 1; return t.pts[i].clone().lerp(t.pts[i + 1], (d - d0) / seg); };
  const TONES = [40, 47, 52, 55, 59, 64, 59, 55, 52];   // the name climbs and settles through E minor, the key of the Elgar concerto
  function stepPlan(dt) {
    if (!cur) { const n = plan.shift(); if (!n) return; startTask(n); }
    const t = cur; t.t += dt;
    if (t.type === 'move') { goal.lerpVectors(t.from, t.to, minjerk(t.t / t.T)); if (t.t >= t.T) { if (t.endLetter >= 0) letterDone(t.endLetter); cur = null; } }
    else if (t.type === 'line') { li = t.l; si = t.s; const s = clamp(t.t / t.T, 0, 1); const e = s < .5 ? 2 * s * s : 1 - Math.pow(-2 * s + 2, 2) / 2; goal.copy(at(t, lerp(s, e, .35))); if (t.t >= t.T) { si = t.s + 1; cur = null; } }
    else if (t.type === 'done') { cur = null; nameDone = true; lift(); }
  }
  function letterDone(l) { li = l + 1; si = 0; Sound.note(TONES[l % TONES.length], .2); say(`Writing ${word.slice(0, letters[l].idx + 1)}`); }

  /* ---------------- ink: wherever the real pen tip touches the paper ---------------- */
  let lastInk = null, inkMode = 'name';
  const ctxName = inkName.getContext('2d'), ctxYou = inkYou.getContext('2d');
  for (const c of [ctxName, ctxYou]) { c.lineCap = 'round'; c.lineJoin = 'round'; }
  ctxName.strokeStyle = '#121212'; ctxName.lineWidth = 4.2; ctxYou.strokeStyle = '#FF5A1F'; ctxYou.lineWidth = 4.2;
  function ink(tip) {
    const down = tip.y < .0022;
    if (!down) { lastInk = null; return; }
    const p = toPx(tip.x, tip.z);
    if (lastInk && lastInk.mode === inkMode) { const c = inkMode === 'you' ? ctxYou : ctxName; c.beginPath(); c.moveTo(lastInk.p[0], lastInk.p[1]); c.lineTo(p[0], p[1]); c.stroke(); dirty = true; }
    lastInk = { p, mode: inkMode };
  }

  /* ---------------- when the name is done it lifts off the paper and becomes playable ---------------- */
  const inkMat = new THREE.MeshPhysicalMaterial({ color: theme() === 'dark' ? 0xECECE8 : 0x121212, roughness: .35, clearcoat: .6 });
  addEventListener('themechange', () => inkMat.color.set(theme() === 'dark' ? 0xECECE8 : 0x121212));
  const lifted = [];
  function lift() {
    say('Done. Tap a letter, or drag on the page to draw.');
    letters.forEach((L, i) => {
      const g = new THREE.Group(); g.userData = { i, y: 0, target: .012, delay: i * .06, hop: 0, at: 0 };
      for (const st of L.strokes) {
        const path = new THREE.CurvePath(); for (let k = 1; k < st.length; k++) path.add(new THREE.LineCurve3(st[k - 1], st[k]));
        const m = new THREE.Mesh(new THREE.TubeGeometry(path, Math.max(8, st.length * 3), .0021, 10, false), inkMat); m.castShadow = true; g.add(m);
        for (const end of [st[0], st[st.length - 1]]) { const cap = new THREE.Mesh(new THREE.SphereGeometry(.0021, 10, 8), inkMat); cap.position.copy(end); cap.castShadow = true; g.add(cap); }
      }
      const hit = new THREE.Mesh(new THREE.BoxGeometry(Math.max(L.w, .02) + .012, .02, H + .012), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.set(L.x0 + L.w / 2, .01, ZB - H / 2); hit.userData.letter = g; g.add(hit);
      scene.add(g); lifted.push(g);
    });
    ctxName.clearRect(0, 0, CW, CH); dirty = true;
    Sound.chord(CHORDS[1].notes, .22, .06);   // Elgar's E minor chord when the name is done
  }
  function unlift() { lifted.forEach(g => { scene.remove(g); g.traverse(o => o.geometry && o.geometry.dispose()); }); lifted.length = 0; }
  const hits = () => lifted.map(g => g.children[g.children.length - 1]);

  /* ---------------- pointer ---------------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hp = new THREE.Vector3();
  let rect = canvas.getBoundingClientRect(), drawing = false, target = new THREE.Vector3(), hoverL = null;
  const aim = e => { ndc.set((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1); ray.setFromCamera(ndc, camera); };
  const onSheet = p => Math.abs(p.x) < SW / 2 - .02 && Math.abs(p.z - SZ) < SD / 2 - .02;
  const reachable = p => { const dx = p.x - world.position.x, dz = p.z - world.position.z, r = Math.hypot(dx, dz); return r > .2 && r < .72; };
  function play(g) { const d = g.userData; if (performance.now() - d.at < 260) return; d.at = performance.now(); d.hop = 1; Sound.note(TONES[d.i % TONES.length], .26); }
  canvas.addEventListener('pointerdown', e => {
    rect = canvas.getBoundingClientRect(); aim(e);
    const h = ray.intersectObjects(hits(), false)[0];
    if (h) { play(h.object.userData.letter); return; }
    if (!ray.ray.intersectPlane(plane, hp) || !onSheet(hp) || !reachable(hp)) return;
    e.preventDefault(); try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    drawing = true; mode = 'you'; target.copy(hp); target.y = 0;
    if (cur && cur.type === 'line') { /* resume this stroke from its start later */ }
    plan = []; cur = null; inkMode = 'you'; say('You are drawing');
  });
  canvas.addEventListener('pointermove', e => {
    rect = canvas.getBoundingClientRect(); aim(e);
    if (drawing) { if (ray.ray.intersectPlane(plane, hp)) { hp.x = clamp(hp.x, -SW / 2 + .02, SW / 2 - .02); hp.z = clamp(hp.z, SZ - SD / 2 + .02, SZ + SD / 2 - .02); if (reachable(hp)) target.set(hp.x, 0, hp.z); } return; }
    if (e.pointerType === 'mouse') {
      const h = ray.intersectObjects(hits(), false)[0], g = h ? h.object.userData.letter : null;
      if (g && g !== hoverL) play(g); hoverL = g;
      canvas.style.cursor = g ? 'pointer' : (ray.ray.intersectPlane(plane, hp) && onSheet(hp) ? 'crosshair' : '');
    }
  });
  const up = () => { if (!drawing) return; drawing = false; resumeAt = performance.now() + 1300; target.y = UP; say(nameDone ? 'Your lines stay. Clear them to start again.' : 'Back to my name in a moment'); };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('pointerleave', () => { hoverL = null; });
  $('#redraw').addEventListener('click', () => { unlift(); ctxName.clearRect(0, 0, CW, CH); dirty = true; nameDone = false; inkMode = 'name'; mode = 'name'; queueName(0, 0); cur = null; say('Writing my name'); });
  $('#clear').addEventListener('click', () => { ctxYou.clearRect(0, 0, CW, CH); dirty = true; });

  /* ---------------- frame ---------------- */
  function size() {
    rect = canvas.getBoundingClientRect();
    const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const need = (width + .2) / (2 * Math.tan(camera.fov * Math.PI / 360) * camera.aspect);
    camera.userData.dist = Math.max(2.2, need * 1.3);
    camera.updateProjectionMatrix();
  }
  size(); new ResizeObserver(size).observe(canvas);
  const LOOK = new THREE.Vector3(0, .1, -.05), DIR = new THREE.Vector3(0, .95, .52).normalize(), par = { x: 0, y: 0 }, mouse = { x: 0, y: 0 };
  hero.addEventListener('pointermove', e => { const r = hero.getBoundingClientRect(); mouse.x = (e.clientX - r.left) / r.width - .5; mouse.y = (e.clientY - r.top) / r.height - .5; });
  if (reduce) { // draw the name instantly
    letters.forEach(L => L.strokes.forEach(st => { ctxName.beginPath(); st.forEach((p, i) => { const q = toPx(p.x, p.z); i ? ctxName.lineTo(...q) : ctxName.moveTo(...q); }); ctxName.stroke(); }));
    nameDone = true; lift(); goal.copy(REST);
  } else { queueName(); say('Opening the page'); }
  const qRest = Array.from(robot.q), qUp = [qRest[0], -Math.PI / 2, 0, -Math.PI / 2, -Math.PI / 2, 0];
  let intro = reduce ? -1 : 0;
  if (!reduce) { robot.set(qUp); world.position.y = -1.45; } else { floorSolid.visible = false; floorHoled.visible = true; rim.visible = true; crackLines.visible = false; }
  let burstDone = false;
  let visible = true; new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(hero);
  const smoothTarget = new THREE.Vector3().copy(goal);
  let last = performance.now();
  hero.classList.add('live');
  window.__home = { goal, robot, letters, world: () => world, intro: () => intro, shards: () => shards.filter(x => x.m.visible).length, setIntro: t => { intro = t; }, wy: () => world.position.y, plan: () => plan.length, done: () => nameDone };
  function frame(now) {
    requestAnimationFrame(frame);
    const reps = window.__speed || 1, dt0 = clamp((now - last) / 1000, 0, .05); last = now;
    if (!visible || document.hidden) return;
    for (let r = 0; r < reps; r++) {
      const dt = dt0;
      stepShards(dt);
      if (intro >= 0) {
        if (!window.__freeze) intro += dt;
        const CR = .85;                                     // cracks spread, then it breaks
        crackGeo.setDrawRange(0, Math.floor(clamp(intro / CR, 0, 1) ** .7 * edges.length) * 2);
        crackLines.position.y = intro < CR ? (Math.random() - .5) * .003 * (intro / CR) : 0; if (intro < CR) shake = Math.max(shake, .25 * (intro / CR));
        if (!burstDone && intro >= CR) { burstDone = true; burst(); }
        const k1 = clamp((intro - CR) / .42, 0, 1), back = 1 + 2.2 * Math.pow(k1 - 1, 3) + 1.2 * Math.pow(k1 - 1, 2);
        world.position.y = lerp(-1.45, 0, k1 < 1 ? back : 1);
        const k2 = minjerk((intro - CR - .5) / .55);
        robot.set(qUp.map((u, i) => lerp(u, qRest[i], k2)));
        if (intro > CR + 1.08) { intro = -1; world.position.y = 0; robot.set(qRest); say('Writing my name'); }
        continue;
      }
      if (mode === 'you') {
        // follow the visitor, limited to a plausible tool speed
        const step = 1.6 * dt, d = smoothTarget.distanceTo(target);
        smoothTarget.lerp(target, d > step ? step / d : 1);
        goal.copy(smoothTarget);
        if (!drawing && performance.now() > resumeAt) { mode = 'name'; inkMode = 'name'; if (!nameDone) queueName(li, si); else plan = [travel(REST, 1.2)]; }
        ik.solve(goal, 3); ink(ik.tip());
      } else {
        const n = Math.max(1, Math.ceil(dt / .004)), h = dt / n;
        for (let k = 0; k < n; k++) { stepPlan(h); ik.solve(goal, 2); ink(ik.tip()); }
        smoothTarget.copy(goal);
      }
    }
    if (dirty) compose();
    for (const g of lifted) {
      const d = g.userData; if (d.delay > 0) { d.delay -= dt0; continue; }
      d.hop = Math.max(0, d.hop - dt0 * 3.2);
      const want = d.target + Math.sin(Math.PI * d.hop) * .012 + (g === hoverL ? .004 : 0);
      d.y += (want - d.y) * Math.min(1, dt0 * 9); g.position.y = d.y;
    }
    par.x += (mouse.x - par.x) * Math.min(1, dt0 * 2); par.y += (mouse.y - par.y) * Math.min(1, dt0 * 2);
    camera.position.copy(DIR).multiplyScalar(camera.userData.dist).add(LOOK);
    camera.position.x += par.x * .08 + (Math.random() - .5) * .014 * shake; camera.position.y -= par.y * .04 - (Math.random() - .5) * .01 * shake; shake = Math.max(0, shake - dt0 * 3);
    camera.lookAt(LOOK);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
}

/* ---------------- split-flap "now" board ---------------- */
function flaps() {
  const CH = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,:/-+';
  $$('.board .cells').forEach((row, ri) => {
    const text = row.dataset.text.toUpperCase(), n = +row.dataset.n || 26;
    row.innerHTML = '';
    const cells = Array.from({ length: n }, (_, i) => { const s = document.createElement('span'); s.className = 'cell'; s.textContent = ' '; row.appendChild(s); return { s, want: text[i] || ' ', cur: ' ' }; });
    const run = (delay = 0) => {
      cells.forEach((c, i) => {
        if (c.want === ' ' && c.cur === ' ') return;
        let k = 0, steps = 4 + Math.floor(Math.random() * 6);
        setTimeout(function flip() {
          c.s.classList.remove('f'); void c.s.offsetWidth; c.s.classList.add('f');
          if (k++ < steps && !reduce) { c.s.textContent = CH[1 + Math.floor(Math.random() * (CH.length - 1))]; if (k % 3 === 0) Sound.tick(.03); setTimeout(flip, 55); }
          else { c.s.textContent = c.want; c.cur = c.want; }
        }, delay + i * 28);
      });
    };
    row.closest('li').addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { cells.forEach(c => { c.cur = '_'; }); run(); } });
    new IntersectionObserver((es, ob) => { if (es[0].isIntersecting) { run(ri * 160); ob.disconnect(); } }, { threshold: .6 }).observe(row);
  });
}
flaps();
boot().catch(e => { console.error(e); $('#status').textContent = 'The 3D drawing could not load here.'; });
