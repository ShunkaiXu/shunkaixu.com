/* A pixel-dithered orange field that bleeds in from the left edge of a section and drifts slowly.
   Value noise -> organic edge -> 8x8 Bayer ordered dither into five colours. */
import { reduce, $$ } from './site.js';
const BAYER = [0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21].map(v => (v + .5) / 64);
const PAL = {
  light: [null, [250, 222, 210], [245, 166, 134], [238, 106, 64], [226, 76, 36]],
  dark: [null, [52, 28, 22], [112, 44, 24], [196, 68, 30], [236, 88, 42]]
};
const hash = (x, y) => { let h = x * 374761393 + y * 668265263; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967295; };
const sm = t => t * t * (3 - 2 * t);
function noise(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = sm(x - xi), yf = sm(y - yi); const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1); return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf; }
const fbm = (x, y) => noise(x, y) * .55 + noise(x * 2.1, y * 2.1) * .3 + noise(x * 4.3, y * 4.3) * .15;

/* The cursor plays with it: outside the field the edge reaches toward you, inside it the pointer
   stirs a hole that leaves a fading wake, and a click or tap sends out a ripple. */
for (const host of $$('[data-dither]')) {
  const cv = document.createElement('canvas'); cv.className = 'dither'; cv.setAttribute('aria-hidden', 'true'); host.prepend(cv);
  const x = cv.getContext('2d'); let W = 0, H = 0, cols = 0, rows = 0, img = null, vis = false;
  const CELL = 6;
  const size = () => { W = cv.clientWidth; H = cv.clientHeight; cols = Math.ceil(W / CELL); rows = Math.ceil(H / CELL); cv.width = cols; cv.height = rows; img = x.createImageData(cols, rows); };
  size(); new ResizeObserver(size).observe(cv);
  new IntersectionObserver(es => { vis = es[0].isIntersecting; }).observe(host);
  const seed = Math.random() * 100;
  // pointer, in cells; s is a softly sprung copy so the field lags a little behind the hand
  const P = { x: -99, y: -99, sx: -99, sy: -99, vx: 0, vy: 0, near: 0, act: 0 }, trail = [], rings = [];
  let lastT = 0, lastDrop = 0;
  const toCells = e => { const b = cv.getBoundingClientRect(); return [(e.clientX - b.left) / CELL, (e.clientY - b.top) / CELL, b]; };
  if (!reduce) {
    addEventListener('pointermove', e => {
      const [cx, cy, b] = toCells(e);
      P.near = e.clientY > b.top && e.clientY < b.bottom && e.clientX < b.right + 140 ? 1 : 0;
      if (P.sx < -50) { P.sx = cx; P.sy = cy; }
      P.x = cx; P.y = cy;
    }, { passive: true });
    document.addEventListener('pointerleave', () => { P.near = 0; });
    
  }
  function step(t) {
    const dt = Math.min(.05, Math.max(0, t - lastT)); lastT = t;
    // critically damped spring toward the pointer
    const k = 14, c = 2 * Math.sqrt(k);
    P.vx += (k * (P.x - P.sx) - c * P.vx) * dt; P.vy += (k * (P.y - P.sy) - c * P.vy) * dt;
    P.sx += P.vx * dt; P.sy += P.vy * dt;
    P.act += (P.near - P.act) * Math.min(1, dt * (P.near ? 1.5 : 1));
    const sp = Math.hypot(P.vx, P.vy);
    if (P.act > .1 && sp > 6 && t - lastDrop > .03) { trail.push({ x: P.sx, y: P.sy, t }); lastDrop = t; if (trail.length > 28) trail.shift(); }
    while (trail.length && t - trail[0].t > 1.4) trail.shift();
    while (rings.length && t - rings[0].t > 1.6) rings.shift();
  }
  function render(t) {
    const pal = PAL[document.documentElement.dataset.siteTheme === 'dark' ? 'dark' : 'light'], d = img.data;
    const sc = scrollY * .0012, act = P.act, px = P.sx, py = P.sy;
    for (let j = 0; j < rows; j++) {
      const yy = j / rows;
      let edge = (.5 + .26 * (fbm(yy * 2.4 + seed, t * .05 + sc) - .5) * 2 + .08 * Math.sin(yy * 5 + t * .25 + sc * 2)) * cols;
      if (act > .01) {   // reach for the cursor: a soft bulge centred on its row, weaker the further away it is
        const reach = Math.max(0, Math.min(px, cols * 1.02) - edge), gy = Math.exp(-((j - py) ** 2) / (2 * 16 * 16));
        edge += act * gy * reach * .14 / (1 + (reach / 40) ** 2);
      }
      // fade in and out at the section's top and bottom so the field is a soft shape, never a cut-off block
      const ev = Math.min(1, yy / .3, (1 - yy) / .3), env = ev <= 0 ? 0 : ev * ev * (3 - 2 * ev);
      edge *= .15 + .85 * env;
      for (let i = 0; i < cols; i++) {
        let v = (edge - i) / (.32 * cols) + .5 - (1 - env) * .95;
        v -= .32 * (fbm(i * .045 + seed, j * .03 + t * .08) - .45);
        v = Math.max(0, Math.min(1, v));
        let lv = Math.floor(v * 4 + BAYER[(j & 7) * 8 + (i & 7)]); lv = lv < 0 ? 0 : lv > 4 ? 4 : lv;
        const o = (j * cols + i) * 4, c = pal[lv];
        if (c) { d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255; } else d[o + 3] = 0;
      }
    }
    x.putImageData(img, 0, 0);
  }
  let last = 0;
  render(0);
  if (!reduce) (function frame(now) {
    requestAnimationFrame(frame); if (!vis) return;
    const busy = P.act > .02 || trail.length || rings.length;
    if (now - last < (busy ? 16 : 60)) return; last = now;
    const t = now / 1000; step(t); render(t);
  })(0);
  addEventListener('themechange', () => render(performance.now() / 1000));
}
