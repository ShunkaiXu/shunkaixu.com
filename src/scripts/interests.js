import { Sound, $, clamp } from './site.js';
const svg = $('#sd'), NS = 'http://www.w3.org/2000/svg';
const L = 56, R = 620, T = 20, B = 360, QMAX = 100, PMAX = 100;
const X = q => L + (R - L) * q / QMAX, Y = p => B - (B - T) * p / PMAX;
const el = (n, a) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); svg.appendChild(e); return e; };
for (let i = 0; i <= 10; i++) { el('line', { class: 'grid', x1: X(i * 10), x2: X(i * 10), y1: T, y2: B }); el('line', { class: 'grid', x1: L, x2: R, y1: Y(i * 10), y2: Y(i * 10) }); }
el('line', { class: 'ax', x1: L, x2: R, y1: B, y2: B }); el('line', { class: 'ax', x1: L, x2: L, y1: T, y2: B });
el('text', { x: R, y: B + 22, 'text-anchor': 'end' }).textContent = 'Quantity';
el('text', { x: L - 8, y: T + 4, 'text-anchor': 'end' }).textContent = 'P';
const cs = el('path', { fill: 'rgba(31,79,216,.14)' }), ps = el('path', { fill: 'rgba(255,90,31,.16)' });
const gp = el('line', { stroke: 'currentColor', 'stroke-dasharray': '4 4' }), gq = el('line', { stroke: 'currentColor', 'stroke-dasharray': '4 4' });
const dl = el('line', { stroke: 'var(--blue)', 'stroke-width': 2.5 }), sl = el('line', { stroke: 'var(--orange)', 'stroke-width': 2.5 });
const dHit = el('line', { stroke: 'transparent', 'stroke-width': 26, class: 'grab' }), sHit = el('line', { stroke: 'transparent', 'stroke-width': 26, class: 'grab' });
const dot = el('circle', { r: 6, fill: 'currentColor' });
const dLab = el('text', { fill: 'var(--blue)' }), sLab = el('text', {});
dLab.textContent = 'Demand'; sLab.textContent = 'Supply';
let a = 90, c = 10;                      // demand P = a - 0.8Q, supply P = c + 0.7Q
const bd = .8, bs = .7;
function draw() {
  const q = clamp((a - c) / (bd + bs), 0, QMAX), p = a - bd * q;
  dl.setAttribute('x1', X(0)); dl.setAttribute('y1', Y(a)); dl.setAttribute('x2', X(Math.min(QMAX, a / bd))); dl.setAttribute('y2', Y(Math.max(0, a - bd * QMAX)));
  sl.setAttribute('x1', X(0)); sl.setAttribute('y1', Y(c)); sl.setAttribute('x2', X(Math.min(QMAX, (PMAX - c) / bs))); sl.setAttribute('y2', Y(Math.min(PMAX, c + bs * QMAX)));
  for (const [h, s] of [[dHit, dl], [sHit, sl]]) for (const k of ['x1', 'y1', 'x2', 'y2']) h.setAttribute(k, s.getAttribute(k));
  cs.setAttribute('d', `M${X(0)} ${Y(a)}L${X(q)} ${Y(p)}L${X(0)} ${Y(p)}Z`);
  ps.setAttribute('d', `M${X(0)} ${Y(c)}L${X(q)} ${Y(p)}L${X(0)} ${Y(p)}Z`);
  gp.setAttribute('x1', L); gp.setAttribute('x2', X(q)); gp.setAttribute('y1', Y(p)); gp.setAttribute('y2', Y(p));
  gq.setAttribute('x1', X(q)); gq.setAttribute('x2', X(q)); gq.setAttribute('y1', Y(p)); gq.setAttribute('y2', B);
  dot.setAttribute('cx', X(q)); dot.setAttribute('cy', Y(p));
  dLab.setAttribute('x', X(Math.min(QMAX, a / bd)) - 6); dLab.setAttribute('y', Y(Math.max(0, a - bd * QMAX)) - 8); dLab.setAttribute('text-anchor', 'end');
  sLab.setAttribute('x', X(Math.min(QMAX, (PMAX - c) / bs)) - 6); sLab.setAttribute('y', Y(Math.min(PMAX, c + bs * QMAX)) + 18); sLab.setAttribute('text-anchor', 'end'); sLab.setAttribute('fill', 'var(--orange)');
  $('#pp').textContent = p.toFixed(1); $('#qq').textContent = q.toFixed(1);
  $('#cs').textContent = (.5 * q * (a - p)).toFixed(0); $('#ps').textContent = (.5 * q * (p - c)).toFixed(0);
  return p;
}
draw();
let drag = null, lastNote = 0;
const toP = e => { const r = svg.getBoundingClientRect(); const y = (e.clientY - r.top) * 400 / r.height; return (B - y) / (B - T) * PMAX; };
for (const [h, which] of [[dHit, 'd'], [sHit, 's']]) h.addEventListener('pointerdown', e => { e.preventDefault(); try { svg.setPointerCapture(e.pointerId); } catch (_) {} drag = { which, p0: toP(e), a0: a, c0: c }; });
svg.addEventListener('pointermove', e => {
  if (!drag) return; const d = toP(e) - drag.p0;
  if (drag.which === 'd') a = clamp(drag.a0 + d, 30, 120); else c = clamp(drag.c0 + d, -20, 60);
  const p = draw(), now = performance.now();
  if (now - lastNote > 110) { lastNote = now; Sound.note(47 + Math.round(clamp(p, 0, 100) / 100 * 24 / 2) * 2, .1); }
});
const up = () => { if (drag) { drag = null; Sound.chord([47, 54, 59, 62], .16); } };
svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
