/* Fig. 4: the closing piece. As you scroll, glass shards fly in, swirl into a vortex, line up as the
   four strings of a cello (C G D A), then settle into the name. The cursor scatters them.
   One InstancedMesh, one draw call; every position is worked out in the vertex shader. */
import { Sound, CHORDS, reduce, $, clamp } from './site.js';

const host = $('#finale');
if (host) boot();

async function boot() {
  const THREE = await import('three');
  const stage = $('.stage', host), canvas = $('canvas', host), cap = $('#finale-cap');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -2000, 2000); camera.position.z = 1000;

  const small = matchMedia('(max-width: 760px)').matches;
  const N = small ? 2600 : 5200;
  let W = 0, H = 0;

  // one small irregular triangle, scaled per instance
  const tri = new THREE.BufferGeometry();
  tri.setAttribute('position', new THREE.Float32BufferAttribute([-.55, -.4, 0, .6, -.25, 0, -.05, .7, 0], 3));
  const geo = new THREE.InstancedBufferGeometry(); geo.index = tri.index; geo.attributes.position = tri.attributes.position; geo.instanceCount = N;
  const aS = new Float32Array(N * 3), aV = new Float32Array(N * 3), aStr = new Float32Array(N * 3), aTxt = new Float32Array(N * 3), aR = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) { aR[i * 4] = Math.random(); aR[i * 4 + 1] = Math.random(); aR[i * 4 + 2] = Math.random(); aR[i * 4 + 3] = Math.random(); }
  const attr = (n, a, s) => geo.setAttribute(n, new THREE.InstancedBufferAttribute(a, s));
  attr('aS', aS, 3); attr('aV', aV, 3); attr('aStr', aStr, 3); attr('aTxt', aTxt, 3); attr('aR', aR, 4);

  const css = getComputedStyle(document.documentElement);
  const col = v => new THREE.Color(css.getPropertyValue(v).trim() || '#121212');
  const U = {
    uP: { value: 0 }, uTime: { value: 0 }, uMouse: { value: new THREE.Vector2(-1e4, -1e4) }, uPush: { value: 0 },
    uSize: { value: small ? 6.5 : 8 }, uInk: { value: new THREE.Color('#D4A23A') }, uAccent: { value: new THREE.Color('#F5D27A') }, uPaper: { value: col('--paper') }, uDark: { value: 0 }
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, side: THREE.DoubleSide, extensions: { derivatives: true },
    vertexShader: /* glsl */`
      attribute vec3 aS, aV, aStr, aTxt; attribute vec4 aR;
      uniform float uP, uTime, uPush, uSize; uniform vec2 uMouse;
      varying vec3 vPos; varying float vAcc, vGlint;
      mat3 rot(vec3 a, float t) { a = normalize(a); float s = sin(t), c = cos(t), o = 1.0 - c;
        return mat3(o*a.x*a.x + c, o*a.x*a.y + a.z*s, o*a.z*a.x - a.y*s, o*a.x*a.y - a.z*s, o*a.y*a.y + c, o*a.y*a.z + a.x*s, o*a.z*a.x + a.y*s, o*a.y*a.z - a.x*s, o*a.z*a.z + c); }
      float ease(float t) { t = clamp(t, 0.0, 1.0); return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }
      void main() {
        // each shard leaves a little late or early, so the shapes form like a flock, not a slide
        float s = clamp(uP * 1.25 - aR.x * .75, 0.0, 3.0);
        float w0 = ease(s), w1 = ease(s - 1.0), w2 = ease(s - 2.0);
        // vortex: a spinning, slightly tilted spiral disc
        float ang = aV.y + uTime * (.9 / (.35 + aV.x)) ;
        vec3 V = vec3(cos(ang) * aV.x, sin(ang) * aV.x * .42, aV.z) * uSize * 52.0;
        V.y += sin(ang * 2.0 + aR.y * 6.28) * 9.0;
        // strings: a gentle standing wave while they are strings
        vec3 S = aStr; S.y += sin(S.z * 3.14159) * sin(uTime * 7.0 + aStr.y) * 2.4 * (w1 * (1.0 - w2));
        S.z = 0.0;
        vec3 p = mix(mix(mix(aS, V, w0), S, w1), aTxt, w2);
        float transit = w0 * (1.0 - w0) + w1 * (1.0 - w1) + w2 * (1.0 - w2);
        p.z += transit * 260.0 * (aR.w - .5);
        p.xy += transit * 90.0 * vec2(sin(aR.y * 6.28 + uTime), cos(aR.z * 6.28 + uTime));
        // the cursor parts the glass
        vec2 d = p.xy - uMouse; float f = exp(-dot(d, d) / (110.0 * 110.0)) * uPush;
        p.xy += normalize(d + 1e-4) * f * 70.0; p.z += f * 80.0;
        float settle = w2 * (1.0 - transit * 2.0);
        float spin = aR.y * 6.283 + uTime * (2.0 + 3.0 * aR.z) * (1.0 - settle * .96) + f * 5.0;
        vec3 lp = rot(vec3(aR.z - .5, aR.w - .5, .6), spin) * position * uSize * (.55 + aR.y * .9) * (1.0 + (1.0 - w0) * .6);
        vec3 wp = p + lp;
        vPos = wp; vAcc = step(.7, aR.z); vGlint = aR.w;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(wp, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uInk, uAccent, uPaper; uniform float uDark;
      varying vec3 vPos; varying float vAcc, vGlint;
      void main() {
        vec3 n = normalize(cross(dFdx(vPos), dFdy(vPos)));
        vec3 L = normalize(vec3(-.45, .7, .55));
        float diff = abs(dot(n, L)), spec = pow(max(0.0, dot(reflect(-L, n), vec3(0, 0, 1))), 22.0);
        float rim = pow(1.0 - abs(n.z), 2.0);
        // gold leaf: warm base, a pale-gold glint where a facet faces the light, deeper amber at grazing angles
        vec3 base = mix(uInk, uAccent, vAcc * .8 + vGlint * .25);
        vec3 c = base * (.82 + diff * .45) + vec3(1.0, .95, .78) * spec * 1.4;
        c = mix(c, base * .62, rim * .35);
        float a = .78 + diff * .15 + spec * .2;
        gl_FragColor = vec4(c, clamp(a, 0.0, 1.0));
      }`
  });
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; scene.add(mesh);

  /* ---------- targets, rebuilt whenever the stage changes size ---------- */
  function nameTargets() {
    const cw = Math.min(W * .86, 1200), fs = Math.round(cw / 4.6);
    const c = document.createElement('canvas'); c.width = Math.ceil(cw); c.height = Math.ceil(fs * 1.35);
    const x = c.getContext('2d'); x.fillStyle = '#000'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = `700 ${fs}px Geist, "Helvetica Neue", Arial, sans-serif`;
    if ('letterSpacing' in x) x.letterSpacing = `${-fs * .04}px`;
    const mw = x.measureText('Shunkai Xu').width;
    if (mw > cw * .96) { const k = cw * .96 / mw; x.font = `700 ${Math.floor(fs * k)}px Geist, "Helvetica Neue", Arial, sans-serif`; if ('letterSpacing' in x) x.letterSpacing = `${-fs * k * .04}px`; }
    x.fillText('Shunkai Xu', c.width / 2, c.height * .53);
    const d = x.getImageData(0, 0, c.width, c.height).data, pts = [];
    const step = Math.max(2, Math.round(fs / 70));
    for (let y = 0; y < c.height; y += step) for (let xx = 0; xx < c.width; xx += step) if (d[(y * c.width + xx) * 4 + 3] > 128) pts.push([xx - c.width / 2, c.height / 2 - y]);
    return pts;
  }
  function layout() {
    W = stage.clientWidth; H = stage.clientHeight;
    renderer.setSize(W, H, false);
    Object.assign(camera, { left: -W / 2, right: W / 2, top: H / 2, bottom: -H / 2 }); camera.updateProjectionMatrix();
    const pts = nameTargets(); for (let k = pts.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [pts[k], pts[j]] = [pts[j], pts[k]]; }
    const strW = Math.min(W * .8, 1100), gap = small ? 26 : 38;
    for (let i = 0; i < N; i++) {
      const r = aR.subarray(i * 4, i * 4 + 4);
      // start: thrown in from all round the edges
      const a = r[1] * Math.PI * 2, rad = Math.max(W, H) * (.75 + r[2] * .5);
      aS.set([Math.cos(a) * rad, Math.sin(a) * rad, (r[3] - .5) * 600], i * 3);
      aV.set([.12 + Math.pow(r[2], .7) * 1.3, r[3] * Math.PI * 2, (r[1] - .5) * 40], i * 3);
      const sI = i % 4, u = (i / N * 4 % 1 + r[3] * .002);
      aStr.set([(u - .5) * strW, (1.5 - sI) * gap + (r[2] - .5) * 2.2, u], i * 3);   // z carries position along the string
      const q = pts[i % pts.length] || [0, 0], jit = (pts.length < N ? 2.4 : .8);
      aTxt.set([q[0] + (r[1] - .5) * jit, q[1] + (r[2] - .5) * jit, (r[3] - .5) * 6], i * 3);
    }
    ['aS', 'aV', 'aStr', 'aTxt'].forEach(n => { geo.attributes[n].needsUpdate = true; });
  }
  await (document.fonts ? document.fonts.ready : Promise.resolve());
  layout();
  let rz; new ResizeObserver(() => { clearTimeout(rz); rz = setTimeout(layout, 120); }).observe(stage);
  const retheme = () => { const c2 = getComputedStyle(document.documentElement); U.uPaper.value.set(c2.getPropertyValue('--paper').trim()); U.uDark.value = document.documentElement.dataset.siteTheme === 'dark' ? 1 : 0; };
  retheme(); addEventListener('themechange', () => requestAnimationFrame(retheme));

  /* ---------- input ---------- */
  const m = { x: -1e4, y: -1e4, sx: -1e4, sy: -1e4, on: 0 };
  const move = e => { const b = canvas.getBoundingClientRect(); m.x = e.clientX - b.left - W / 2; m.y = H / 2 - (e.clientY - b.top); if (m.sx < -5e3) { m.sx = m.x; m.sy = m.y; } m.on = 1; };
  canvas.addEventListener('pointermove', move, { passive: true });
  canvas.addEventListener('pointerdown', move, { passive: true });
  canvas.addEventListener('pointerleave', () => { m.on = 0; });

  /* ---------- scroll drives the story ---------- */
  let visible = false; new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { rootMargin: '200px' }).observe(host);
  let shown = reduce ? 3 : 0, lastStage = 0;
  const words = ['Glass', 'A vortex', 'Four strings, C G D A', 'Shunkai Xu'];
  function progress() { const r = host.getBoundingClientRect(), span = r.height - innerHeight; return clamp(-r.top / Math.max(1, span), 0, 1); }
  let last = performance.now();
  (function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!visible) return;
    const target = reduce ? 3 : clamp(progress() / .82, 0, 1) * 3;
    shown += (target - shown) * Math.min(1, dt * 4.5);            // a little lag, so a flick of the wheel still looks smooth
    U.uP.value = shown; U.uTime.value = now / 1000;
    m.sx += (m.x - m.sx) * Math.min(1, dt * 10); m.sy += (m.y - m.sy) * Math.min(1, dt * 10);
    U.uMouse.value.set(m.sx, m.sy); U.uPush.value += ((m.on && !reduce ? 1 : 0) - U.uPush.value) * Math.min(1, dt * 5);
    const st = Math.min(3, Math.floor(shown + .3));
    if (st !== lastStage) {
      if (st > lastStage && st === 2) Sound.chord([36, 43, 50, 57], .2, .07);          // the open strings, low to high
      if (st > lastStage && st === 3) Sound.chord(CHORDS[1].notes, .22, .06);         // Elgar's E minor as the name lands
      lastStage = st; if (cap) cap.textContent = words[st];
    }
    renderer.render(scene, camera);
  })(last);
}
