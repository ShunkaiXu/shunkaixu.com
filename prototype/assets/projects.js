/* Tempo, the web version: a 60-minute dial you drag to set, a countdown that survives reloads,
   and a small log of what you finished today. State lives in localStorage. */
import { Sound, $, $$, clamp } from './site.js';
const NS = 'http://www.w3.org/2000/svg', R = 150, dial = $('#dial'), svg = $('#dsvg');
const readEl = $('#tread'), modeEl = $('#tmode'), go = $('#tgo'), logEl = $('#tlog'), pres = $$('[data-pre]');
const el = (n, a, p = svg) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); p.appendChild(e); return e; };
const KEY = 'tempo', LOG = 'tempo-log', today = () => new Date().toISOString().slice(0, 10);
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

// state: dur (s), end (ms timestamp while running), left (s while paused/idle)
let S = load(KEY, { dur: 1500, left: 1500, end: 0, name: 'Focus' });
const title0 = document.title;

el('circle', { class: 'face', r: R + 30 });
for (let m = 0; m < 60; m++) {
  const a = m / 60 * Math.PI * 2, s = Math.sin(a), c = -Math.cos(a), big = m % 5 === 0;
  el('line', { class: 'tk' + (big ? '' : ' mn'), x1: s * (R + (big ? 12 : 18)), y1: c * (R + (big ? 12 : 18)), x2: s * (R + 26), y2: c * (R + 26) });
}
for (let m = 0; m < 60; m += 5) { const a = m / 60 * Math.PI * 2; el('text', { class: 'lb', x: Math.sin(a) * (R - 14), y: -Math.cos(a) * (R - 14) }).textContent = m; }
const wedge = el('path', { class: 'wedge' }), knob = el('circle', { class: 'knob', r: 9 });
el('circle', { class: 'hub', r: 4 });

const left = () => S.end ? Math.max(0, (S.end - Date.now()) / 1000) : S.left;
const fmt = s => { s = Math.ceil(s); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
function paint() {
  const l = left(), f = clamp(l / 3600, 0, 1), a = f * Math.PI * 2, r = R - 30;
  const x = Math.sin(a) * r, y = -Math.cos(a) * r;
  wedge.setAttribute('d', f >= .9999 ? `M0 ${-r}A${r} ${r} 0 1 1 0 ${r}A${r} ${r} 0 1 1 0 ${-r}Z` : f <= 0 ? '' : `M0 0L0 ${-r}A${r} ${r} 0 ${a > Math.PI ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)}Z`);
  knob.setAttribute('cx', x.toFixed(2)); knob.setAttribute('cy', y.toFixed(2));
  readEl.textContent = fmt(l); modeEl.textContent = S.name;
  dial.setAttribute('aria-valuenow', Math.round(S.dur / 60)); dial.setAttribute('aria-valuetext', fmt(l) + ' left');
  go.textContent = S.end ? 'Pause' : l < S.dur && l > 0 ? 'Resume' : 'Start';
  document.title = S.end ? fmt(l) + ' · ' + S.name : title0;
  pres.forEach(b => { const on = +b.dataset.pre * 60 === S.dur && b.dataset.name === S.name; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
}
function log() {
  const L = load(LOG, {}), t = L[today()] || { n: 0, min: 0 };
  logEl.innerHTML = t.n ? `Today: <b>${t.n}</b> ${t.n === 1 ? 'session' : 'sessions'}, <b>${t.min}</b> min.` : 'Nothing finished yet today.';
}
function set(sec, name = 'Custom') { S = { dur: sec, left: sec, end: 0, name }; save(KEY, S); paint(); }
function finish() {
  const L = load(LOG, {}), t = L[today()] || { n: 0, min: 0 };
  t.n++; t.min += Math.round(S.dur / 60); L[today()] = t; save(LOG, L);
  Sound.chord([62, 66, 69, 74], .2, .12);   // only heard if sound is switched on
  S = { ...S, left: S.dur, end: 0 }; save(KEY, S); log(); paint();
  modeEl.textContent = 'Done. ' + S.name + ' finished';
}

// dragging the dial: angle from 12 o'clock sets whole minutes, 1 to 60
let drag = false, lastMin = -1;
function fromPointer(e) {
  if (S.end) return;   // locked while running
  const b = svg.getBoundingClientRect(), x = e.clientX - b.left - b.width / 2, y = e.clientY - b.top - b.height / 2;
  let a = Math.atan2(x, -y); if (a < 0) a += Math.PI * 2;
  let m = Math.round(a / (Math.PI * 2) * 60); if (m === 0) m = lastMin > 30 ? 60 : 1; m = clamp(m, 1, 60);
  if (m !== lastMin) { lastMin = m; set(m * 60); }
}
dial.addEventListener('pointerdown', e => { if (S.end) return; drag = true; dial.setPointerCapture(e.pointerId); fromPointer(e); });
dial.addEventListener('pointermove', e => { if (drag) fromPointer(e); });
dial.addEventListener('pointerup', () => { drag = false; });
dial.addEventListener('pointercancel', () => { drag = false; });
dial.addEventListener('keydown', e => {
  if (S.end) return; const m = Math.round(S.dur / 60), d = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 5, PageDown: -5 }[e.key];
  if (d) { e.preventDefault(); set(clamp(m + d, 1, 60) * 60); }
});
pres.forEach(b => b.addEventListener('click', () => set(+b.dataset.pre * 60, b.dataset.name)));
go.addEventListener('click', () => {
  Sound.wake();
  if (S.end) S = { ...S, left: left(), end: 0 };
  else { const l = S.left > 0 ? S.left : S.dur; S = { ...S, end: Date.now() + l * 1000 }; }
  save(KEY, S); paint();
});
$('#treset').addEventListener('click', () => set(S.dur, S.name));

log(); paint();
setInterval(() => { if (!S.end) return; if (left() <= 0) finish(); else paint(); }, 250);
addEventListener('storage', e => { if (e.key === KEY) { S = load(KEY, S); paint(); } if (e.key === LOG) log(); });
