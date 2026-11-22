/* Shared by every page: header, sound engine, chord dividers. */
export const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

/* ------------------------------------------------------------------ sound
   Quiet by design: soft plucks through a low-pass filter, strummed lowest note first, at a level
   that sits under whatever else the visitor is listening to. Off until switched on; the choice is
   remembered. iPhone: playback session before the context exists, plus a silent looping <audio>. */
export const Sound = (() => {
  let ac, bus, master, keep, on = false;   // sound always starts off; it is never remembered between visits
  const bufs = new Map();
  function silence() {
    const n = 4000, b = new DataView(new ArrayBuffer(44 + n)), w = (o, s) => [...s].forEach((c, i) => b.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); b.setUint32(4, 36 + n, true); w(8, 'WAVEfmt '); b.setUint32(16, 16, true); b.setUint16(20, 1, true); b.setUint16(22, 1, true);
    b.setUint32(24, 8000, true); b.setUint32(28, 8000, true); b.setUint16(32, 1, true); b.setUint16(34, 8, true); w(36, 'data'); b.setUint32(40, n, true);
    for (let i = 0; i < n; i++) b.setUint8(44 + i, 128);
    return URL.createObjectURL(new Blob([b.buffer], { type: 'audio/wav' }));
  }
  function ctx() {
    if (!ac) {
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      ac = new AC();
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400; lp.Q.value = .5;
      const comp = ac.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 6; comp.attack.value = .005; comp.release.value = .3;
      const verb = ac.createConvolver(), wet = ac.createGain(); wet.gain.value = .22;
      const len = Math.floor(ac.sampleRate * 2.2), ir = ac.createBuffer(2, len, ac.sampleRate);
      for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); let l = 0; for (let i = 0; i < len; i++) { const t = i / ac.sampleRate; l += (.2 + .7 * Math.exp(-t * 3)) * ((Math.random() * 2 - 1) - l); d[i] = l * Math.exp(-t * 3.2); } }
      verb.buffer = ir;
      bus = ac.createGain(); bus.gain.value = .5;
      master = ac.createGain(); master.gain.value = on ? 1 : 0;
      // cello-body resonances so plucks sound like wood, not a synth
      const b1 = ac.createBiquadFilter(); b1.type = 'peaking'; b1.frequency.value = 110; b1.Q.value = 1.4; b1.gain.value = 4;
      const b2 = ac.createBiquadFilter(); b2.type = 'peaking'; b2.frequency.value = 205; b2.Q.value = 1.6; b2.gain.value = 3;
      const b3 = ac.createBiquadFilter(); b3.type = 'peaking'; b3.frequency.value = 2800; b3.Q.value = .8; b3.gain.value = -5;
      bus.__comp = comp; bus.connect(b1); b1.connect(b2); b2.connect(b3); b3.connect(lp); lp.connect(comp); lp.connect(verb); verb.connect(wet); wet.connect(comp); comp.connect(master); master.connect(ac.destination);
    }
    if (ac.state !== 'running') { try { const p = ac.resume(); if (p && p.catch) p.catch(() => {}); } catch (e) {} }
    return ac;
  }
  function hold(v) {
    try {
      if (v) { keep = keep || Object.assign(new Audio(silence()), { loop: true }); keep.setAttribute('playsinline', ''); const p = keep.play(); if (p && p.catch) p.catch(() => {}); if (navigator.audioSession) navigator.audioSession.type = 'playback'; }
      else { if (keep) keep.pause(); if (navigator.audioSession) navigator.audioSession.type = 'auto'; }
    } catch (e) {}
  }
  // pizzicato cello string: Karplus-Strong excited at a fifth of the string length (removes every 5th
  // harmonic like a real finger pluck), two strings 1.5 cents apart for life, and a loop filter that
  // starts bright and darkens, so the attack has a thumb and the tail is round
  function buf(c, midi) {
    let b = bufs.get(midi); if (b) return b;
    const sr = c.sampleRate, f = 440 * Math.pow(2, (midi - 69) / 12), len = Math.floor(sr * 2.6);
    b = c.createBuffer(1, len, sr); const d = b.getChannelData(0);
    for (const det of [1, 1.0009]) {
      const N = Math.max(2, Math.round(sr / (f * det))), ring = new Float32Array(N), P = Math.max(1, Math.round(N / 5));
      for (let k = 0; k < N; k++) { const x = k / N; ring[k] = (x < .2 ? x / .2 : (1 - x) / .8) + (Math.random() - .5) * .25; }
      for (let k = N - 1; k >= P; k--) ring[k] -= ring[k - P] * .9;          // pluck position
      const damp = Math.exp(Math.log(.001) / (2.1 * f) * (midi < 48 ? 1 : 1.25));
      for (let k = 0, j = 0; k < len; k++) {
        const a = ring[j], bb = ring[(j + 1) % N], bright = .5 + .18 * Math.exp(-k / (sr * .08));
        ring[j] = (a * bright + bb * (1 - bright)) * damp;
        d[k] += a * .5;
        j = (j + 1) % N;
      }
    }
    let peak = 0, lp = 0, dc = 0;
    for (let k = 0; k < len; k++) { dc += .0015 * (d[k] - dc); lp += .55 * ((d[k] - dc) - lp); d[k] = lp * Math.min(1, k / (sr * .002)) * Math.min(1, (len - k) / (sr * .4)); if (Math.abs(d[k]) > peak) peak = Math.abs(d[k]); }
    if (peak) for (let k = 0; k < len; k++) d[k] *= .8 / peak;
    bufs.set(midi, b); return b;
  }
  function note(midi, gain = .3, delay = 0, pan = 0) {
    if (!on) return; const c = ctx(); if (!c) return;
    try {
      const s = c.createBufferSource(), g = c.createGain(); s.buffer = buf(c, midi); g.gain.value = gain;
      let out = g; if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); g.connect(p); out = p; }
      s.connect(g); out.connect(bus); s.start(c.currentTime + delay + .01);
    } catch (e) {}
  }
  function chord(midis, gain = .22, spread = .028) { midis.forEach((m, i) => note(m, gain * (1 - i * .08), i * spread, (i / (midis.length - 1 || 1) - .5) * .5)); }
  // a bowed tone for the Music page: filtered saw with slow attack and a little vibrato
  function bow(midi) {
    if (!on) return null; const c = ctx(); if (!c) return null;
    const f = 440 * Math.pow(2, (midi - 69) / 12), o = c.createOscillator(), o2 = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain(), vib = c.createOscillator(), vg = c.createGain();
    o.type = 'sawtooth'; o2.type = 'sawtooth'; o.frequency.value = f; o2.frequency.value = f * 1.003;
    vib.frequency.value = 5.2; vg.gain.value = f * .004; vib.connect(vg); vg.connect(o.frequency); vg.connect(o2.frequency);
    lp.type = 'lowpass'; lp.frequency.value = f * 4; lp.Q.value = .7;
    g.gain.value = 0; g.gain.setTargetAtTime(.09, c.currentTime, .12);
    o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(bus); o.start(); o2.start(); vib.start();
    return { set(p) { g.gain.setTargetAtTime(.04 + .08 * p, c.currentTime, .08); lp.frequency.setTargetAtTime(f * (3 + 4 * p), c.currentTime, .08); }, stop() { g.gain.setTargetAtTime(0, c.currentTime, .18); setTimeout(() => { try { o.stop(); o2.stop(); vib.stop(); } catch (e) {} }, 900); } };
  }
  function tick(gain = .05) {
    if (!on) return; const c = ctx(); if (!c) return;
    try { const at = c.currentTime + .004, o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(1800, at); o.frequency.exponentialRampToValueAtTime(500, at + .025); g.gain.setValueAtTime(gain, at); g.gain.exponentialRampToValueAtTime(.0001, at + .04); o.connect(g).connect(bus); o.start(at); o.stop(at + .05); } catch (e) {}
  }
  return {
    raw() { const c = ctx(); return c ? { ac: c, dest: bus.__comp, master } : null; },
    get on() { return on; },
    set(v) {
      on = v; if (v) ctx(); hold(v);
      if (ac && master) master.gain.setTargetAtTime(v ? 1 : 0, ac.currentTime, .04);
      dispatchEvent(new CustomEvent('soundchange', { detail: v }));
    },
    wake() { if (on) { ctx(); hold(true); } },
    note, chord, bow, tick
  };
})();

// One chord per piece Shunkai plays, voiced like a cello would spread it (no close clashes)
export const CHORDS = [
  { name: 'G major, Bach Prelude', notes: [43, 50, 59, 62] },        // G2 D3 B3 D4, the Prelude's opening chord
  { name: 'E minor, Elgar Op. 85', notes: [40, 47, 55, 64] },        // E2 B2 G3 E4, the concerto's first chord
  { name: 'A major, Tchaikovsky Rococo Variations', notes: [45, 52, 61, 69] },   // A2 E3 C#4 A4, the theme's key
  { name: 'C minor, Fauré', notes: [36, 43, 51, 60] },               // Après un rêve
  { name: 'D major, Dvořák', notes: [38, 45, 54, 62] }               // Songs My Mother Taught Me
];
export const NAME_MOTIF = [52, 55, 59];      // E G B, Elgar's E minor

/* ------------------------------------------------------------------ header */
const btn = $('#sound'), label = $('#sound-label');
function show() { btn.setAttribute('aria-pressed', Sound.on); label.textContent = Sound.on ? 'Sound on' : 'Sound off'; }
show();
btn.addEventListener('click', () => { Sound.set(!Sound.on); show(); if (Sound.on) NAME_MOTIF.forEach((m, i) => Sound.note(m, .26, i * .16)); });
['pointerdown', 'keydown'].forEach(t => addEventListener(t, () => Sound.wake(), { once: true, capture: true }));
/* First visit only: a small note under the Sound button says the site can play. It never blocks
   anything: it fades out by itself after 10 s, on scroll, or on either button, and is never shown again. */
(function soundHint() {
  if (!btn || store.get('sound-hint') === 'seen') return;
  const LIFE = 10000;
  const el = document.createElement('div'); el.className = 'shint'; el.setAttribute('role', 'status');
  el.innerHTML = '<b>This site can play music</b><p>Recordings of my cello and a few small sounds. It stays quiet unless you turn it on.</p>'
    + '<div class="row"><button type="button" class="go">Turn sound on</button><button type="button" class="no">Not now</button></div>';
  const place = () => {
    const r = btn.getBoundingClientRect(), right = Math.max(12, innerWidth - r.right);
    el.style.top = `${Math.round(r.bottom + 10)}px`; el.style.right = `${Math.round(right)}px`;
    el.style.setProperty('--nib', `${Math.round(r.width / 2 - 5)}px`);
  };
  let timer = 0;
  const dismiss = () => {
    clearTimeout(timer); btn.classList.remove('hinted'); el.classList.remove('on');
    removeEventListener('resize', place); removeEventListener('scroll', onScroll); setTimeout(() => el.remove(), 450);
  };
  const y0 = { v: 0 }, onScroll = () => { if (Math.abs(scrollY - y0.v) > 240) dismiss(); };
  btn.addEventListener('click', dismiss, { once: true });
  el.querySelector('.go').addEventListener('click', () => { dismiss(); if (!Sound.on) btn.click(); });
  el.querySelector('.no').addEventListener('click', dismiss);
  const showHint = () => {
    if (!btn.isConnected || Sound.on) return;
    store.set('sound-hint', 'seen');   // shown once, ever
    document.body.appendChild(el); place(); addEventListener('resize', place);
    y0.v = scrollY; addEventListener('scroll', onScroll, { passive: true });
    btn.classList.add('hinted');
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('on')));
    let left = LIFE, since = performance.now();
    const arm = () => { timer = setTimeout(dismiss, left); };
    // pause the countdown while the pointer is on the note, so it never vanishes mid-read
    el.addEventListener('pointerenter', () => { clearTimeout(timer); left = Math.max(2500, left - (performance.now() - since)); });
    el.addEventListener('pointerleave', () => { since = performance.now(); arm(); });
    arm();
  };
  const ld = window.__loader;
  if (ld && ld.whenGone) ld.whenGone().then(() => setTimeout(showHint, 700)); else setTimeout(showHint, 900);
})();
const themeBtn = $('#theme');
export const theme = () => document.documentElement.dataset.siteTheme === 'dark' ? 'dark' : 'light';
if (themeBtn) themeBtn.addEventListener('click', () => {
  const t = theme() === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.siteTheme = t; store.set('site-theme', t);
  dispatchEvent(new CustomEvent('themechange', { detail: t })); Sound.note(t === 'dark' ? 52 : 59, .14);
});
const here = (document.body.dataset.page || 'home');
$$('.nav a').forEach(a => { if (a.dataset.p === here) a.setAttribute('aria-current', 'page'); });
const menu = $('#menu'), nav = $('.nav');
if (menu) menu.addEventListener('click', () => { const o = nav.classList.toggle('open'); menu.setAttribute('aria-expanded', o); });

/* ------------------------------------------------------------------ dividers
   A hairline that holds one chord. It only sounds when you deliberately cross it with the mouse
   (fast enough, and not again for 400 ms), or tap it. Scrolling never triggers it. */
const NS = 'http://www.w3.org/2000/svg';
export function initRules() {
  const rules = $$('.rule'); if (!rules.length) return;
  const items = rules.map(host => {
    // tick | string pinned at a nut and a bridge | chord name
    const str = document.createElement('span'); str.className = 'str'; str.innerHTML = '<i class="pin"></i><i class="pin"></i>';
    const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('viewBox', '0 0 1000 23');
    const p = document.createElementNS(NS, 'path'); p.setAttribute('d', 'M0 11.5H1000'); p.setAttribute('vector-effect', 'non-scaling-stroke'); svg.appendChild(p); str.prepend(svg);
    host.appendChild(str);
    const ch = CHORDS[(+host.dataset.chord || 0) % CHORDS.length];
    const tag = document.createElement('span'); tag.className = 'chord'; tag.textContent = ch.name; host.appendChild(tag);
    host.setAttribute('role', 'button'); host.tabIndex = 0; host.setAttribute('aria-label', `Pluck the line: ${ch.name}`);
    return { host, str, p, ch, amp: 0, at: .5, t: 0, last: 0 };
  });
  let raf = 0;
  function pluck(it, x, strength = 1) {
    const now = performance.now(); if (now - it.last < 380) return; it.last = now;
    it.at = clamp(x, .04, .96); it.amp = (reduce ? 3 : 8) * strength; it.t = 0;
    it.host.classList.add('rang'); clearTimeout(it.off); it.off = setTimeout(() => it.host.classList.remove('rang'), 1600);
    Sound.chord(it.ch.notes, .2 * strength, .035);
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(step); }
  }
  let last = 0;
  function step(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now; let live = false;
    for (const it of items) {
      if (it.amp < .05) { if (it.amp) { it.amp = 0; it.p.setAttribute('d', 'M0 11.5H1000'); } continue; }
      live = true; it.t += dt; it.amp *= Math.exp(-dt * 3.2);
      // fundamental plus a little second mode, pinned at both ends, pulled from where it was plucked
      const ax = it.at * 1000, y = 11.5 + it.amp * Math.cos(it.t * 2 * Math.PI * 9) + it.amp * .25 * Math.sin(it.t * 2 * Math.PI * 17) * Math.sin(it.at * Math.PI);
      it.p.setAttribute('d', `M0 11.5Q${(ax / 2).toFixed(1)} ${(11.5 + (y - 11.5) * 1.0).toFixed(2)} ${ax.toFixed(1)} ${y.toFixed(2)}Q${((ax + 1000) / 2).toFixed(1)} ${(11.5 + (y - 11.5)).toFixed(2)} 1000 11.5`);
    }
    raf = live ? requestAnimationFrame(step) : 0;
  }
  // crossing the line with the pointer plucks it; scrolling under a still pointer does not
  let py = null, px = 0, pt = 0;
  addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    const now = performance.now();
    if (py !== null && now - pt < 80) {
      for (const it of items) {
        const r = it.str.getBoundingClientRect(), ly = r.top + r.height / 2;
        if (e.clientX < r.left || e.clientX > r.right) continue;
        if ((py - ly) * (e.clientY - ly) < 0) { const v = Math.abs(e.clientY - py) / Math.max(1, now - pt); pluck(it, (e.clientX - r.left) / r.width, clamp(.55 + v * .5, .55, 1)); }
      }
    }
    py = e.clientY; px = e.clientX; pt = now;
  }, { passive: true });
  addEventListener('scroll', () => { py = null; }, { passive: true });
  items.forEach(it => {
    it.host.addEventListener('pointerdown', e => { const r = it.str.getBoundingClientRect(); pluck(it, (e.clientX - r.left) / r.width, .9); });
    it.host.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pluck(it, .5, .9); } });
  });
}
initRules();
