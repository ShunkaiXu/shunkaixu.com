/* Fig. 4: the closing piece. The page broke open at the top of Home; here it mends.
   The name is cracked into large pieces (Voronoi cells, like the wall at the top). As you scroll,
   the pieces fly in from the edges, tumbling, and lock together left to right; thin orange cracks
   stay visible between them. Then a quote appears underneath. */
import { Sound, CHORDS, reduce, $, clamp } from './site.js';

const host = $('#finale');
if (host) boot();

const easeOut = t => { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); };
const smooth = (a, b, t) => { t = clamp((t - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// keep the side of a convex polygon where (p - c) . n <= 0
function clip(poly, n, c) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const A = poly[i], B = poly[(i + 1) % poly.length], da = (A[0] - c[0]) * n[0] + (A[1] - c[1]) * n[1], db = (B[0] - c[0]) * n[0] + (B[1] - c[1]) * n[1];
    if (da <= 0) out.push(A);
    if ((da < 0) !== (db < 0)) { const t = da / (da - db); out.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]); }
  }
  return out;
}

async function boot() {
  const THREE = await import('three');
  const stage = $('.stage', host), canvas = $('canvas', host), cap = $('#finale-cap'), quote = $('#finale-quote');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 10, 8000);
  const small = matchMedia('(max-width: 760px)').matches;
  const css = () => getComputedStyle(document.documentElement);
  const inkMat = new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide, depthWrite: false });
  const crackMat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 0 });
  let W = 0, H = 0, pieces = [], crack = null, tex = null, shown = reduce ? 1 : 0;

  /* the name as a white-on-transparent mask; the materials colour it (ink for the pieces, orange for the cracks) */
  function nameMask() {
    const cw = Math.min(W * (small ? .9 : .84), 1200), fs = Math.round(cw / 4.6), ch = Math.ceil(fs * 1.3), sc = Math.min(2, devicePixelRatio || 1);
    const c = document.createElement('canvas'); c.width = Math.ceil(cw * sc); c.height = Math.ceil(ch * sc);
    const x = c.getContext('2d'); x.scale(sc, sc); x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
    const font = s => `700 ${s}px Geist, "Helvetica Neue", Arial, sans-serif`;
    let f = fs; x.font = font(f); if ('letterSpacing' in x) x.letterSpacing = `${-f * .04}px`;
    const mw = x.measureText('Shunkai Xu').width;
    if (mw > cw * .96) { f = Math.floor(fs * cw * .96 / mw); x.font = font(f); if ('letterSpacing' in x) x.letterSpacing = `${-f * .04}px`; }
    x.fillText('Shunkai Xu', cw / 2, ch * .53);
    return { c, cw, ch, sc, data: x.getImageData(0, 0, c.width, c.height).data };
  }

  function layout() {
    W = stage.clientWidth; H = stage.clientHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.position.set(0, 0, (H / 2) / Math.tan(camera.fov * Math.PI / 360)); camera.lookAt(0, 0, 0); camera.updateProjectionMatrix();
    pieces.forEach(p => { scene.remove(p.m); p.m.geometry.dispose(); }); pieces = [];
    if (crack) { scene.remove(crack); crack.geometry.dispose(); }
    if (tex) tex.dispose();
    const { c, cw, ch, sc, data } = nameMask();
    tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    inkMat.map = tex; crackMat.map = tex; inkMat.needsUpdate = crackMat.needsUpdate = true;
    const Y = H * (small ? .1 : .12);                     // the name sits a little above centre, the quote goes below
    // seeds on the letters, so every cell holds some of the name
    const ink = []; for (let y = 0; y < c.height; y += 3) for (let x = 0; x < c.width; x += 3) if (data[(y * c.width + x) * 4 + 3] > 140) ink.push([x / sc - cw / 2, ch / 2 - y / sc]);
    const S = small ? 70 : 130, seeds = [];
    for (let k = 0; k < S && ink.length; k++) seeds.push(ink[Math.floor(Math.random() * ink.length)]);
    const box = [[-cw / 2, -ch / 2], [cw / 2, -ch / 2], [cw / 2, ch / 2], [-cw / 2, ch / 2]], GAP = small ? 1.1 : 1.5;
    seeds.forEach((si, i) => {
      let poly = box.slice();
      seeds.forEach((sj, j) => { if (i !== j && poly.length >= 3) poly = clip(poly, [sj[0] - si[0], sj[1] - si[1]], [(si[0] + sj[0]) / 2, (si[1] + sj[1]) / 2]); });
      if (poly.length < 3) return;
      const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length, cy = poly.reduce((s, p) => s + p[1], 0) / poly.length;
      // pull each corner in a little so a hairline crack shows between neighbours
      const shape = new THREE.Shape(poly.map(([x, y]) => { const dx = cx - x, dy = cy - y, d = Math.hypot(dx, dy) || 1, k = Math.min(GAP, d * .3) / d; return new THREE.Vector2(x + dx * k - cx, y + dy * k - cy); }));
      const g = new THREE.ShapeGeometry(shape), pos = g.attributes.position, uv = g.attributes.uv;
      for (let v = 0; v < pos.count; v++) uv.setXY(v, (pos.getX(v) + cx + cw / 2) / cw, (pos.getY(v) + cy + ch / 2) / ch);
      const m = new THREE.Mesh(g, inkMat); scene.add(m);
      // where it comes from: off screen all round the edges, nearer the camera, turned every which way
      const a = Math.random() * Math.PI * 2, rad = .65 + Math.random() * .4;
      pieces.push({
        m, to: new THREE.Vector3(cx, cy + Y, 0),
        from: new THREE.Vector3(Math.cos(a) * W * rad, Math.sin(a) * H * rad + Y, 250 + Math.random() * 600),
        q0: new THREE.Quaternion().setFromEuler(new THREE.Euler((Math.random() - .5) * 5, (Math.random() - .5) * 5, (Math.random() - .5) * 6)),
        at: clamp(cx / cw + .5, 0, 1) * .55 + Math.random() * .15,                  // left to right, a little uneven
        lift: 80 + Math.random() * 260
      });
    });
    crack = new THREE.Mesh(new THREE.PlaneGeometry(cw, ch), crackMat); crack.position.set(0, Y, -1); crack.renderOrder = -1; scene.add(crack);
    retheme(); place(shown);
  }
  const retheme = () => { const c2 = css(); inkMat.color.set(c2.getPropertyValue('--ink').trim() || '#121212'); crackMat.color.set(c2.getPropertyValue('--orange').trim() || '#FF5A1F'); };
  addEventListener('themechange', () => requestAnimationFrame(retheme));

  const _q = new THREE.Quaternion(), ID = new THREE.Quaternion();
  function place(p) {
    for (const s of pieces) {
      const e = easeOut((p - s.at) / .3);
      s.m.position.lerpVectors(s.from, s.to, e); s.m.position.z += Math.sin(e * Math.PI) * s.lift;
      s.m.quaternion.copy(_q.copy(s.q0).slerp(ID, e));
      s.m.visible = e > 0;
    }
    crackMat.opacity = smooth(.86, 1, p);                 // the orange shows through the cracks once it is whole
  }

  /* ---------- scroll drives the story ---------- */
  let lastStage = reduce ? 2 : 0;
  await (document.fonts ? document.fonts.ready : Promise.resolve());
  layout();
  let rz; new ResizeObserver(() => { clearTimeout(rz); rz = setTimeout(layout, 120); }).observe(stage);
  let visible = false; new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { rootMargin: '200px' }).observe(host);
  const words = ['Pieces of the page', 'Coming back together', 'Shunkai Xu'];
  if (cap && reduce) cap.textContent = words[2];
  function progress() { const r = host.getBoundingClientRect(), span = r.height - innerHeight; return clamp(-r.top / Math.max(1, span), 0, 1); }
  let last = performance.now();
  (function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!visible) return;
    const pr = progress(), target = reduce ? 1 : clamp((pr - .05) / .65, 0, 1);
    shown += (target - shown) * Math.min(1, dt * 4);      // a little lag, so a flick of the wheel still looks smooth
    if (Math.abs(target - shown) < 1e-4) shown = target;
    place(shown);
    if (quote) { const k = reduce ? 1 : smooth(.74, .88, pr); quote.style.opacity = k; quote.style.transform = `translateY(${(1 - k) * 14}px)`; }
    const st = shown < .04 ? 0 : shown < .99 ? 1 : 2;
    if (st !== lastStage) {
      if (st > lastStage && st === 2) Sound.chord(CHORDS[1].notes, .22, .06);   // Elgar's E minor as the name lands
      lastStage = st; if (cap) cap.textContent = words[st];
    }
    renderer.render(scene, camera);
  })(last);
}
