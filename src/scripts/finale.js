/* Fig. 4: the closing piece, after Le Corbusier's Modulor (1948).
   When it comes into view, a golden rectangle draws itself square by square (each labelled with its red-series
   measure in mm), the golden spiral sweeps through it, and the red and blue series grow as two rulers.
   Then the name and a quote settle in beside it. Plain SVG, drawn from the numbers. */
import { Sound, CHORDS, reduce, $, clamp } from './site.js';

const host = $('#finale'), art = $('#modulor');

const NS = 'http://www.w3.org/2000/svg';
const smooth = (a, b, t) => { t = clamp((t - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// the Modulor's two series (mm). Each is about 1.618 times the next; blue is double red.
const RED = [1130, 698, 432, 267, 165, 102, 63, 39, 24];
const RED_STACK = [1130, 432, 165, 63, 24];          // 1130 + 698 = 1829, and 698 = 432 + 165 + 63 + 24 + ...
const BLUE_STACK = [1397, 534, 204, 78, 30];          // stacks up to 2260, the raised hand

function build() {
  const el = (n, a = {}, p = svg) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); p.appendChild(e); return e; };
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '-190 -110 2390 1300'); art.appendChild(svg);
  const RX = 330, BASE = 1130, K = .5;                // rectangle origin; rulers drawn at half size beside it
  const line = (d, cls = 'ln') => el('path', { d, class: cls, 'vector-effect': 'non-scaling-stroke', pathLength: 1, 'stroke-dasharray': '1 1', 'stroke-dashoffset': 1 });

  /* the golden rectangle, 1829 x 1130, divided into squares: left, top, right, bottom, ... */
  let r = { x: RX, y: 0, w: 1829, h: 1130 }, spiral = '';
  const squares = [];
  RED.forEach((_, k) => {
    let sq, a0, a1;
    if (k % 4 === 0) { const s = r.h; sq = [r.x, r.y, s]; a0 = [r.x, r.y + s]; a1 = [r.x + s, r.y]; r = { x: r.x + s, y: r.y, w: r.w - s, h: r.h }; }
    else if (k % 4 === 1) { const s = r.w; sq = [r.x, r.y, s]; a0 = [r.x, r.y]; a1 = [r.x + s, r.y + s]; r = { x: r.x, y: r.y + s, w: r.w, h: r.h - s }; }
    else if (k % 4 === 2) { const s = r.h; sq = [r.x + r.w - s, r.y, s]; a0 = [r.x + r.w, r.y]; a1 = [r.x + r.w - s, r.y + s]; r = { x: r.x, y: r.y, w: r.w - s, h: r.h }; }
    else { const s = r.w; sq = [r.x, r.y + r.h - s, s]; a0 = [r.x + r.w, r.y + r.h]; a1 = [r.x, r.y + r.h - s]; r = { x: r.x, y: r.y, w: r.w, h: r.h - s }; }
    const [x, y, s] = sq;
    squares.push({ p: line(`M${x} ${y}h${s}v${s}h${-s}Z`), x, y, s, k });
    spiral += (k ? '' : `M${a0[0]} ${a0[1]}`) + `A${sq[2]} ${sq[2]} 0 0 1 ${a1[0]} ${a1[1]}`;
  });
  // the measure of each of the larger squares, tucked in its corner
  const labels = squares.slice(0, 5).map(q => el('text', { x: q.x + 18, y: q.y + 44, opacity: 0, 'font-size': q.s > 400 ? 32 : 26 }, svg));
  labels.forEach((t, i) => { t.textContent = RED[i]; });
  const sp = line(spiral, 'sp');

  // dimension lines in blue: the whole width above, the height on the left
  const dims = el('g', { opacity: 0 });
  el('path', { d: `M${RX} -48H${RX + 1829}M${RX} -70v44M${RX + 1829} -70v44`, class: 'dim', 'vector-effect': 'non-scaling-stroke' }, dims);
  el('text', { x: RX + 1829 / 2, y: -64, 'text-anchor': 'middle', class: 'tb' }, dims).textContent = '1829';
  el('path', { d: `M${RX - 44} 0V${BASE}M${RX - 66} 0h44M${RX - 66} ${BASE}h44`, class: 'dim', 'vector-effect': 'non-scaling-stroke' }, dims);
  el('text', { x: RX - 58, y: BASE / 2, 'text-anchor': 'middle', class: 'tb', transform: `rotate(-90 ${RX - 58} ${BASE / 2})` }, dims).textContent = '1130';

  /* the two rulers: red (in the site's orange) and blue, stacked from the floor, growing upward */
  const rulers = [[RED_STACK, -60, 'rr'], [BLUE_STACK, 60, 'rb']].map(([stack, x, cls]) => {
    const g = el('g'), clip = el('clipPath', { id: `mc-${cls}` }, el('defs')), cr = el('rect', { x: x - 220, y: BASE, width: 440, height: 0 }, clip);
    g.setAttribute('clip-path', `url(#mc-${cls})`);
    let y = BASE;
    stack.forEach((v, i) => {
      const h = v * K;
      el('rect', { x: x - 20, y: y - h, width: 40, height: h, class: i % 2 ? 'ro' : cls, 'vector-effect': 'non-scaling-stroke' }, g);
      const t = el('text', { x: x < 0 ? x - 34 : x + 34, y: y - h / 2 + 10, 'text-anchor': x < 0 ? 'end' : 'start', 'font-size': 24 }, g); t.textContent = v;
      y -= h;
    });
    return { cr, top: BASE - y };
  });

  /* ---------- scroll drives the drawing ---------- */
  const name = $('#mod-name'), quote = $('#finale-quote');
  const setDash = (p, k) => p.setAttribute('stroke-dashoffset', 1 - k);
  const rise = (node, k, d = 18) => { if (!node) return; node.style.opacity = k; node.style.transform = `translateY(${(1 - k) * d}px)`; };
  let shown = reduce ? 1 : 0, sang = reduce;
  function place(p) {
    squares.forEach((q, i) => setDash(q.p, smooth(.02 + i * .045, .14 + i * .045, p)));
    labels.forEach((t, i) => t.setAttribute('opacity', smooth(.1 + i * .05, .2 + i * .05, p)));
    setDash(sp, smooth(.26, .6, p));
    dims.setAttribute('opacity', smooth(.3, .42, p));
    rulers.forEach((R, i) => { const k = smooth(.05 + i * .06, .5 + i * .06, p), h = R.top * k + 2; R.cr.setAttribute('y', BASE - h); R.cr.setAttribute('height', h + 4); });
    rise(name, smooth(.56, .7, p)); rise(quote, smooth(.68, .84, p), 14);
    if (!sang && p > .62) { sang = true; Sound.chord(CHORDS[1].notes, .2, .06); }   // Elgar's E minor as the name arrives
    if (p < .5) sang = reduce;
  }
  place(shown);
  if (reduce) return;
  // draw it once, over about three seconds, when the section comes into view
  const DUR = 3200;
  const run = () => {
    const t0 = performance.now();
    (function frame(now) {
      const k = clamp((now - t0) / DUR, 0, 1);
      place(k < 1 ? k * k * (3 - 2 * k) * .35 + k * .65 : 1);   // gentle start and finish
      if (k < 1) requestAnimationFrame(frame);
    })(t0);
  };
  new IntersectionObserver((es, io) => { if (es[0].isIntersecting) { io.disconnect(); run(); } }, { threshold: .35 }).observe(host);
}

if (host && art) build();
