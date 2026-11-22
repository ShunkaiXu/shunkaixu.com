/* Fig. 2: a cello that plays itself. Full-size proportions (mm), front view, standing slightly tilted.
   Sound: solo cello samples by flcellogrl (Freesound, CC BY 3.0, via tonejs-instruments).
   Scores: Mutopia Project (public domain). Two SVG layers: a static, cached instrument and a light
   dynamic layer (strings, bow, left hand), so nothing heavy is repainted each frame. */
import { Sound, reduce, $, clamp, lerp } from './site.js';

const NS = 'http://www.w3.org/2000/svg';
const box = $('#cello'), list = $('#pieces');
const ANG = 13;
if (box) init();

function init() {
  const VB = '-470 -830 940 1660';
  const wrap = document.createElement('div'); wrap.className = 'cello-sway'; box.appendChild(wrap);
  const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', VB); svg.setAttribute('aria-hidden', 'true'); wrap.appendChild(svg);
  const dyn = document.createElementNS(NS, 'svg'); dyn.setAttribute('viewBox', VB); dyn.setAttribute('role', 'img');
  dyn.setAttribute('aria-label', 'A cello standing slightly tilted, with its bow. It plays the piece you choose.'); wrap.appendChild(dyn);
  const el = (n, a = {}, p = svg) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); p.appendChild(e); return e; };
  const f = v => (+v).toFixed(1);
  const cr = pts => { let d = ''; for (let i = 0; i < pts.length - 1; i++) { const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)]; d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`; } return d; };
  const M = p => `M${f(p[0])} ${f(p[1])}`;
  const mir = pts => pts.map(([x, y]) => [-x, y]);
  const rev = a => [...a].reverse();

  /* ---------- paints ---------- */
  const defs = el('defs');
  defs.innerHTML = `
    <radialGradient id="varnish" cx="0" cy="420" r="520" gradientUnits="userSpaceOnUse" fx="-60" fy="300">
      <stop offset="0" stop-color="#D08A3E"/><stop offset=".35" stop-color="#A8561F"/><stop offset=".7" stop-color="#7A3313"/><stop offset="1" stop-color="#4A1D0B"/></radialGradient>
    <linearGradient id="maple" x1="-40" x2="40" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#6A2C12"/><stop offset=".5" stop-color="#B06A32"/><stop offset="1" stop-color="#5E260F"/></linearGradient>
    <pattern id="grain" width="9" height="40" patternUnits="userSpaceOnUse"><rect width="9" height="40" fill="none"/><path d="M2 0V40" stroke="#3A1606" stroke-width=".9" opacity=".22"/><path d="M6.5 0V40" stroke="#3A1606" stroke-width=".5" opacity=".14"/></pattern>
    <linearGradient id="ebony" x1="-25" x2="25" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#0E0E0F"/><stop offset=".45" stop-color="#2D2D30"/><stop offset="1" stop-color="#0E0E0F"/></linearGradient>
    <linearGradient id="bridge" x1="0" x2="0" y1="398" y2="412" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#F6E6C1"/><stop offset="1" stop-color="#CDAF78"/></linearGradient>
    <linearGradient id="steel" x1="-6" x2="6" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#8E949C"/><stop offset=".5" stop-color="#F1F3F6"/><stop offset="1" stop-color="#7D838B"/></linearGradient>
    <linearGradient id="stick" x1="0" x2="0" y1="-6" y2="6" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#A65A2E"/><stop offset=".5" stop-color="#6E2F14"/><stop offset="1" stop-color="#3E170A"/></linearGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14"/></filter>`;

  // the cello, built upright (scroll up, y down from the top of the body, x across, viewer's left negative)
  const root = el('g', { transform: `rotate(${ANG}) translate(0 -330)` });
  const U = [[0, 0], [52, 3], [100, 17], [140, 46], [164, 92], [172, 145], [167, 195], [153, 234], [146, 254], [157, 272]];
  const C = [[157, 272], [140, 281], [125, 305], [117, 350], [119, 395], [131, 425], [149, 440], [162, 447]];
  const L = [[162, 447], [160, 459], [184, 493], [207, 540], [219, 600], [214, 655], [194, 702], [156, 736], [100, 753], [0, 757]];
  const body = M([0, 0]) + cr(U) + cr(C) + cr(L) + cr(mir(rev(L))) + cr(mir(rev(C))) + cr(mir(rev(U))) + 'Z';
  // shadow on the page
  el('path', { d: body, fill: '#2a1608', opacity: .22, filter: 'url(#soft)', transform: 'translate(34 26)' }, root);
  el('path', { d: `M-4 757L-4 1150L4 1150L4 757Z`, fill: '#2a1608', opacity: .16, filter: 'url(#soft)', transform: 'translate(30 24)' }, root);
  // endpin: long, out at the bottom
  el('path', { d: 'M-3.2 772L3.2 772L3.2 1128L0 1146L-3.2 1128Z', fill: 'url(#steel)' }, root);
  el('path', { d: 'M-10 757L10 757L9 778L-9 778Z', fill: '#121212' }, root);
  el('circle', { cx: 0, cy: 790, r: 7.5, fill: '#1a1a1a' }, root);
  // ribs, then the top
  el('path', { d: body, fill: '#3E160A', transform: 'translate(0 3) scale(1.012 1.004)' }, root);
  el('path', { d: body, fill: 'url(#varnish)' }, root);
  el('path', { d: body, fill: 'url(#grain)' }, root);   // spruce grain, faint
  const clip = el('clipPath', { id: 'cb' }, defs); el('path', { d: body }, clip);
  const pg = el('g', { 'clip-path': 'url(#cb)' }, root);
  el('path', { d: body, fill: 'none', stroke: '#2a1206', 'stroke-width': 13.5 }, pg);
  el('path', { d: body, fill: 'none', stroke: '#C99A62', 'stroke-width': 11.2 }, pg);
  el('path', { d: body, fill: 'none', stroke: '#2a1206', 'stroke-width': 9.8 }, pg);
  el('path', { d: body, fill: 'none', stroke: 'url(#varnish)', 'stroke-width': 8.4 }, pg);
  // a soft highlight on the lower bout
  el('ellipse', { cx: -70, cy: 560, rx: 80, ry: 150, fill: '#FFE1B0', opacity: .16, filter: 'url(#soft)' }, pg);
  el('ellipse', { cx: -55, cy: 150, rx: 55, ry: 80, fill: '#FFE1B0', opacity: .1, filter: 'url(#soft)' }, pg);
  el('path', { d: body, fill: 'none', stroke: '#2a0e04', 'stroke-width': 40, opacity: .22, filter: 'url(#soft)' }, pg);   // darker toward the edges, like real varnish wear
  el('path', { d: body, fill: 'none', stroke: '#4A1A08', 'stroke-width': 1.6 }, root);
  // f-holes: a tapered S-shaped stem with a small upper eye (inner) and a larger lower eye (outer),
  // pointed wings at both ends and the two nicks level with the bridge feet
  // The stem is one shape: narrowest at the nicks, widening at each end into a pointed wing
  // (upper wing beside the upper eye on the outside, lower wing beside the lower eye on the inside).
  for (const sd of [1, -1]) {
    const X = x => sd * x, P = pts => pts.map(([x, y]) => [X(x), y]), FH = '#160803';
    const IN = P([[37.6, 339], [39.8, 354], [43, 370], [48.4, 388], [53.6, 404.5], [58.6, 421], [61.6, 436], [62, 450], [59.5, 466], [53.5, 489]]);   // inner edge, down to the lower wing tip
    const LW = P([[53.5, 489], [60, 481], [66, 475]]);                                                                     // back up the wing into the lower eye
    const OUT = P([[73, 464], [71.6, 450], [69.4, 436], [65.8, 421], [60.2, 404.5], [54.6, 388], [50.4, 372], [49.4, 358], [51, 344], [57.5, 322]]);       // outer edge, up to the upper wing tip
    const UW = P([[57.5, 322], [49, 331], [44, 331.5]]);                                                                   // back down the wing into the upper eye
    el('path', { d: M(IN[0]) + cr(IN) + cr(LW) + 'L' + f(OUT[0][0]) + ' ' + f(OUT[0][1]) + cr(OUT) + cr(UW) + 'Z', fill: FH }, root);
    el('circle', { cx: X(40.5), cy: 335, r: 5.3, fill: FH }, root);    // upper eye, smaller
    el('circle', { cx: X(70), cy: 469.5, r: 6.9, fill: FH }, root);    // lower eye, larger
    el('path', { d: `M${X(53.8)} 402.2L${X(49.6)} 405L${X(54.2)} 407.4Z M${X(60)} 402.2L${X(64)} 404.6L${X(60.4)} 407.4Z`, fill: FH }, root);   // nicks, level with the bridge feet
    el('path', { d: M(OUT[1]) + cr(OUT.slice(1, -3)), fill: 'none', stroke: '#E7B57A', 'stroke-width': .9, opacity: .35, transform: `translate(${sd * 1.1} 0)` }, root);   // light catching the cut edge
  }
  // tailpiece with four fine tuners, saddle
  el('path', { d: M([-32, 523]) + cr([[-32, 523], [0, 517], [32, 523]]) + `L17 738` + cr([[17, 738], [0, 743], [-17, 738]]) + 'Z', fill: 'url(#ebony)' }, root);
  [-21, -7, 7, 21].forEach(x => { el('rect', { x: x - 4.5, y: 528, width: 9, height: 22, rx: 2.5, fill: 'url(#steel)' }, root); el('circle', { cx: x, cy: 556, r: 4, fill: '#C7CCD2' }, root); });
  el('path', { d: 'M-8 740L-6 757M8 740L6 757', stroke: '#222', 'stroke-width': 2.2 }, root);
  el('rect', { x: -20, y: 750, width: 40, height: 7, rx: 1.5, fill: '#121212' }, root);
  // neck and fingerboard
  el('path', { d: 'M-23 -285L23 -285L24 0L-24 0Z', fill: 'url(#maple)' }, root);
  el('path', { d: `M-15.5 -285L-22 295Q0 301 22 295L15.5 -285Z`, fill: 'url(#ebony)' }, root);
  el('path', { d: `M-2 -280L-3 290`, stroke: '#ffffff', 'stroke-width': 1.2, opacity: .12 }, root);
  el('rect', { x: -17, y: -290, width: 34, height: 6, rx: 1.5, fill: '#F1E9D8' }, root);           // nut
  // pegbox, pegs, scroll
  el('path', { d: 'M-21 -289L-23 -398L23 -398L21 -289Z', fill: 'url(#maple)' }, root);
  el('path', { d: 'M-13 -292L-14 -392L14 -392L13 -292Z', fill: '#4A1A08' }, root);
  const SILK = ['#E8B53A', '#B33A3A', '#3F6FD8', '#2E8B57'];
  [[1, -312, 0], [-1, -336, 1], [1, -360, 2], [-1, -384, 3]].forEach(([s, y, i]) => {
    el('rect', { x: s > 0 ? 21 : -33, y: y - 4, width: 12, height: 8, fill: '#151515' }, root);
    el('ellipse', { cx: s * 34, cy: y, rx: 2.6, ry: 6, fill: '#D9B45A' }, root);
    el('path', { d: M([s * 37, y - 5]) + cr([[s * 37, y - 5], [s * 52, y - 14], [s * 72, y - 12], [s * 79, y], [s * 72, y + 12], [s * 52, y + 14], [s * 37, y + 5]]) + 'Z', fill: 'url(#ebony)', stroke: '#4a4a4e', 'stroke-width': 1 }, root);
    el('circle', { cx: s * 63, cy: y, r: 3.2, fill: '#D9B45A' }, root);
    el('path', { d: `M${[-10.5, -3.5, 3.5, 10.5][i] * .9} -292L${(i % 2 ? -1 : 1) * 6} ${y}`, stroke: SILK[i], 'stroke-width': 2.4 }, root);
  });
  const scr = [[22, -398], [29, -416], [33, -440], [31, -465], [22, -479], [0, -483]];
  el('path', { d: M(scr[0]) + cr(scr) + cr(mir(rev(scr))) + 'Z', fill: 'url(#maple)' }, root);
  for (const s of [1, -1]) el('path', { d: M([s * 12, -402]) + cr([[s * 12, -402], [s * 18, -430], [s * 19, -455], [s * 9, -474]]), fill: 'none', stroke: '#5A220B', 'stroke-width': 3 }, root);
  el('path', { d: 'M0 -404V-474', stroke: '#E8A35C', 'stroke-width': 2, opacity: .6 }, root);
  // bridge, seen from the front as a thin band
  el('path', { d: 'M-47 400Q0 396 47 400L47 410Q0 407 -47 410Z', fill: 'url(#bridge)' }, root);
  el('rect', { x: -44, y: 409, width: 14, height: 4, fill: '#B89462' }, root); el('rect', { x: 30, y: 409, width: 14, height: 4, fill: '#B89462' }, root);

  /* ---------- dynamic layer: strings, bow, left hand ---------- */
  const droot = el('g', { transform: `rotate(${ANG}) translate(0 -330)` }, dyn);
  const NUT = -285, BR = 405, LEN = BR - NUT;
  const STR = [
    { open: 57, nut: -10.5, br: -30, tp: -21, w: 1.3, col: '#E6E9ED', hz: 9.1 },
    { open: 50, nut: -3.5, br: -10, tp: -7, w: 1.6, col: '#D7DBE0', hz: 7.9 },
    { open: 43, nut: 3.5, br: 10, tp: 7, w: 2.0, col: '#BCC1C8', hz: 6.6 },
    { open: 36, nut: 10.5, br: 30, tp: 21, w: 2.5, col: '#A9AFB7', hz: 5.4 }
  ];
  const xAt = (s, y) => lerp(s.nut, s.br, (y - NUT) / LEN);
  STR.forEach(s => {
    el('path', { d: `M${s.br} ${BR}L${s.tp} 523`, stroke: s.col, 'stroke-width': s.w }, droot);
    s.shade = el('path', { stroke: '#000', 'stroke-width': s.w, opacity: .18, transform: 'translate(2.5 2)', d: `M${s.nut} ${NUT}L${s.br} ${BR}` }, droot);
    s.lens = el('path', { fill: s.col, opacity: 0 }, droot);
    s.path = el('path', { stroke: s.col, 'stroke-width': s.w, fill: 'none', 'stroke-linecap': 'round' }, droot);
    s.amp = 0; s.ph = Math.random() * 6; s.stop = NUT;
  });
  const hand = el('g', { opacity: 0 }, droot);
  el('ellipse', { rx: 9, ry: 15, fill: '#FF5A1F', opacity: .2 }, hand); el('ellipse', { rx: 4.6, ry: 7.5, fill: '#FF5A1F' }, hand);

  // bow, drawn along +x from the frog; the contact point slides along it
  const HAIR = 650, CONTACT = 350;
  const bowShadow = el('g', { opacity: .14 }, droot), bow = el('g', {}, droot);
  const bowShIn = el('g', {}, bowShadow), bowIn = el('g', {}, bow);
  el('path', { d: `M-36 -14L${HAIR + 10} -16`, stroke: '#000', 'stroke-width': 12, 'stroke-linecap': 'round' }, bowShIn);
  el('rect', { x: 0, y: -4.5, width: HAIR, height: 9, rx: 3, fill: '#F4EEDF', stroke: '#D7CDB5', 'stroke-width': .8 }, bowIn);
  el('path', { d: `M-36 -16L${HAIR * .5} -12.5Q${HAIR * .85} -14 ${HAIR + 8} -20`, fill: 'none', stroke: 'url(#stick)', 'stroke-width': 7.5, 'stroke-linecap': 'round' }, bowIn);
  el('path', { d: `M${HAIR - 2} -21L${HAIR + 16} -21Q${HAIR + 22} -9 ${HAIR + 6} 5.5L${HAIR - 2} 5.5Z`, fill: '#F7F2E6', stroke: '#BDB29B', 'stroke-width': .8 }, bowIn);
  el('path', { d: 'M-34 -17L6 -17L6 7.5L-26 7.5Q-38 -2 -34 -17Z', fill: '#121212' }, bowIn);
  el('rect', { x: 2, y: -5.5, width: 6, height: 12, fill: '#D7DCE2' }, bowIn);
  el('circle', { cx: -14, cy: -6, r: 4, fill: '#F1EAFF', opacity: .9 }, bowIn);
  el('rect', { x: -58, y: -20, width: 22, height: 8, rx: 3, fill: '#C9CED6' }, bowIn); el('rect', { x: -50, y: -20, width: 6, height: 8, fill: '#121212' }, bowIn);
  const TILT = [-9, -3, 3, 9];
  const B = { s: .5, tilt: 0, lift: 14 };
  const midX = lerp(xAt(STR[1], CONTACT), xAt(STR[2], CONTACT), .5);
  function placeBow() {
    const tr = `translate(${f(midX)} ${CONTACT}) rotate(${B.tilt.toFixed(2)})`, inner = `translate(${f(-B.s * HAIR)} ${f(-5 - B.lift)})`;
    bow.setAttribute('transform', tr); bowIn.setAttribute('transform', inner);
    bowShadow.setAttribute('transform', `translate(${f(midX + 10 + B.lift * .5)} ${f(CONTACT + 12 + B.lift * .4)}) rotate(${B.tilt.toFixed(2)})`); bowShIn.setAttribute('transform', `translate(${f(-B.s * HAIR)} 0)`);
  }
  placeBow();

  /* ---------- pieces ---------- */
  let PIECES = null, SAMPLES = null, playing = null;
  const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  (async () => {
    PIECES = (await import('./pieces.js')).default;
    PIECES.forEach((p, i) => {
      const li = document.createElement('li'), b = document.createElement('button'); b.type = 'button'; li.appendChild(b); list.appendChild(li);
      b.innerHTML = `<span class="n">${String(i + 1).padStart(2, '0')}</span><span class="t">${p.composer}<small>${p.title}, ${p.opus}</small></span><span class="m"></span>`;
      if (p.soon) { b.disabled = true; b.querySelector('.m').textContent = 'Soon'; }
      else { b.setAttribute('aria-pressed', 'false'); b.addEventListener('click', () => toggle(p, b)); p.btn = b; b.querySelector('.m').textContent = (p.synth ? 'Synth · ' : '') + fmt(p.live ? p.total : plan(p).total); }
      if (p.synth) b.title = 'Played by the site, from cello samples';
    });
  })();
  // Download the sample bytes ahead of time (when the player scrolls near), decode them on the first play.
  let sampleBytes = null;
  const fetchSamples = () => sampleBytes || (sampleBytes = (async () => {
    const raw = await (await fetch('/assets/cello-samples.json')).json();
    return Promise.all(raw.map(async r => ({ ...r, bin: await (await fetch('/assets/' + r.file)).arrayBuffer() })));
  })());
  new IntersectionObserver((es, io) => { if (es[0].isIntersecting) { io.disconnect(); fetchSamples(); } }, { rootMargin: '300px 0px' }).observe(box);
  async function loadSamples(ac) {
    if (SAMPLES) return SAMPLES;
    const raw = await fetchSamples();
    SAMPLES = await Promise.all(raw.map(async r => ({ midi: r.midi, tune: r.tune, buf: await ac.decodeAudioData(r.bin.slice(0)) })));
    return SAMPLES;
  }

  /* plan: phrasing, rubato, dynamics, strings, bowing */
  function plan(p) {
    const spb = 60 / p.bpm, src = p.notes, out = [];
    const bar = { '3/4': 3, '4/4': 4, '6/8': 3, '2/4': 2 }[p.beat] || 4;
    // phrase ends: a rest follows, or a note of a bar or longer, or a long note after shorter ones
    const isEnd = i => { const n = src[i], nx = src[i + 1]; return !nx || nx[0] === null || n[1] >= bar - .01 || (n[1] >= 1.5 && src[i - 1] && src[i - 1][1] < n[1] * .6); };
    let t = 0, prev = 1, rnd = 1;
    const rand = () => { rnd = (rnd * 16807) % 2147483647; return rnd / 2147483647 - .5; };
    let phrase = [];
    const flush = () => {   // dynamic arch across the phrase, peaking around the highest note
      if (!phrase.length) return;
      const hi = Math.max(...phrase.map(n => n.m)), lo = Math.min(...phrase.map(n => n.m)), pk = phrase.findIndex(n => n.m === hi);
      phrase.forEach((n, j) => { const d = Math.abs(j - pk) / Math.max(1, phrase.length - 1); n.vel = .78 + .22 * (1 - d) + .1 * ((n.m - lo) / Math.max(1, hi - lo)) - (j === phrase.length - 1 ? .06 : 0); });
      phrase = [];
    };
    for (let i = 0; i < src.length; i++) {
      const [m, beats] = src[i];
      let k = 1 + rand() * .03;                         // small, human unevenness
      if (isEnd(i)) k *= 1.1; else if (src[i + 1] && isEnd(i + 1)) k *= 1.05;   // breathe into the end of a phrase
      if (beats >= 1.5) k *= 1.02;
      let dur = beats * spb * k;
      if (p.times) { t = p.times[i]; dur = (p.times[i + 1] ?? Math.min(p.total, t + 2.5)) - t; }
      if (m === null) { flush(); out.push({ rest: true, t0: t, t1: t + dur }); t += dur; continue; }
      let best = 3, bk = 99;
      STR.forEach((st, j) => { const kk = m - st.open; if (kk >= 0 && (kk < bk || (kk === bk && j === prev))) { bk = kk; best = j; } });
      // stay on the same string for small steps if the hand is already up it (fewer string crossings)
      const ps = out.length && !out[out.length - 1].rest ? out[out.length - 1] : null;
      if (ps && ps.string !== best) { const kk = m - STR[ps.string].open; if (kk >= 0 && kk <= 7 && ps.k >= 5) { best = ps.string; bk = kk; } }
      prev = best;
      const n = { m, t0: t, t1: t + dur, string: best, k: m - STR[best].open, beats, vel: 1 };
      out.push(n); phrase.push(n); if (isEnd(i)) flush();
      t += dur;
    }
    flush();
    // bowing: short notes slur in fours (in twos when slow), long notes take a whole bow each
    // fullBow (Bach): eight sixteenths to a bow, every stroke frog to tip
    const FB = !!p.fullBow, strokes = []; let cur = null, dir = 1, s = FB ? .06 : .45;
    for (const n of out) {
      if (n.rest) { cur = null; continue; }
      const short = n.beats <= .5, max = FB ? 8 : p.bpm < 80 ? 2 : 4;
      if (cur && p.times && n.t0 - cur.t1 > .02) cur = null;
      if (cur && p.times && n.t1 - n.t0 > .7) cur = null;
      if (cur && ((short && cur.short && cur.notes.length < max) || (!short && !cur.short && cur.notes.length < 2 && n.beats + cur.beats <= bar && Math.abs(n.m - cur.notes[cur.notes.length - 1].m) <= 2))) { cur.notes.push(n); cur.t1 = n.t1; cur.beats += n.beats; }
      else { cur = { notes: [n], t0: n.t0, t1: n.t1, short, beats: n.beats }; strokes.push(cur); }
    }
    for (const st of strokes) {
      if (FB) { st.s0 = dir > 0 ? .06 : .94; st.s1 = dir > 0 ? .94 : .06; s = st.s1; dir = -dir; }
      else {
        const len = clamp((st.t1 - st.t0) * .2, .12, .82);
        if (dir > 0 && s + len > .94) dir = -1; else if (dir < 0 && s - len < .06) dir = 1;
        st.s0 = s; st.s1 = s + dir * len; s = st.s1; dir = -dir;
      }
      st.notes.forEach((n, j) => { n.stroke = st; n.slurred = j > 0; });
    }
    return { notes: out, strokes, total: p.total || t };
  }

  /* audio: legato joins inside a slur, a fresh attack on each new bow, slides on big slurred shifts,
     long notes extended by cross-fading copies of the sustain */
  function schedule(ac, dest, P, t0, p) {
    const nodes = [], slow = p.bpm <= 90;
    let prev = null;
    for (const n of P.notes) {
      if (n.rest) { prev = null; continue; }
      let smp = SAMPLES[0]; for (const x of SAMPLES) if (Math.abs(x.midi - n.m) < Math.abs(smp.midi - n.m)) smp = x;
      const rate = Math.pow(2, (n.m - smp.midi - smp.tune) / 12);
      const legato = n.slurred && prev, start = t0 + n.t0, end = t0 + n.t1, dur = end - start;
      const lvl = .5 * n.vel * (1 + (57 - n.m) * .006);
      const g = ac.createGain(); g.connect(dest);
      const fadeIn = legato ? .06 : .012;
      const at = start - (legato ? .035 : 0);
      g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(lvl, at + fadeIn);
      if (dur > 1.1) { g.gain.linearRampToValueAtTime(lvl * 1.14, start + dur * .5); g.gain.linearRampToValueAtTime(lvl * .92, end); }
      const rel = n.stroke.notes[n.stroke.notes.length - 1] === n ? .14 : .07;
      g.gain.setTargetAtTime(0, end, rel / 3);
      // play the sample, chaining sustain copies if the note is longer than the recording
      const L = smp.buf.duration, segs = [];
      let off = legato ? .11 : 0, t = at, left = end + rel - at;
      while (left > 0) {
        const avail = L - off - .15, use = Math.min(left, avail);
        segs.push({ t, off, use }); left -= use - .25; t += use - .25; off = .55;
        if (segs.length > 8) break;
      }
      segs.forEach((sg, i) => {
        const src = ac.createBufferSource(), sgG = ac.createGain();
        src.buffer = smp.buf; src.playbackRate.value = rate;
        if (i === 0 && legato && slow && Math.abs(n.m - prev.m) >= 4 && dur > .35) {   // expressive slide on a shift
          const from = rate * Math.pow(2, (prev.m - n.m) * .55 / 12);
          src.playbackRate.setValueAtTime(from, sg.t); src.playbackRate.exponentialRampToValueAtTime(rate, sg.t + .09);
        }
        sgG.gain.setValueAtTime(i ? 0 : 1, sg.t); if (i) sgG.gain.linearRampToValueAtTime(1, sg.t + .25);
        if (i < segs.length - 1) { sgG.gain.setValueAtTime(1, sg.t + sg.use - .25); sgG.gain.linearRampToValueAtTime(0, sg.t + sg.use); }
        src.connect(sgG); sgG.connect(g); src.start(sg.t, sg.off); src.stop(sg.t + sg.use + .05); nodes.push(src);
      });
      prev = n;
    }
    return nodes;
  }

  function hall(ac) {   // a darker, more natural tail: early reflections, then a decay that loses its highs
    const sr = ac.sampleRate, len = Math.floor(sr * 2.6), ir = ac.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c); let lp = 0;
      for (let i = 0; i < len; i++) { const tt = i / sr, a = Math.exp(-tt * 2.7), k = .25 + .7 * Math.exp(-tt * 3); lp += k * ((Math.random() * 2 - 1) - lp); d[i] = lp * a * (i < 220 ? i / 220 : 1); }
      [.011, .019, .027, .041, .053].forEach((e, j) => { const i = Math.floor((e + c * .003) * sr); d[i] += .5 / (j + 1); });
    }
    const v = ac.createConvolver(); v.buffer = ir; return v;
  }

  async function toggle(p, btn) {
    if (playing) { const same = playing.p === p; stop(); if (same) return; }
    if (!Sound.on) { Sound.set(true); $('#sound').setAttribute('aria-pressed', 'true'); $('#sound-label').textContent = 'Sound on'; }
    if (playing) return;
    const r = Sound.raw(); if (!r) return;
    $('#np-title').textContent = 'Tuning up';
    if (p.audio) {   // a real recording: stream it, so it starts as soon as the first second has arrived
      if (!p.el) { p.el = new Audio(p.audio); p.el.preload = 'auto'; p.node = r.ac.createMediaElementSource(p.el); }
      if (r.ac.state !== 'running') { try { await r.ac.resume(); } catch (e) {} }
      const out = r.ac.createGain(); out.gain.value = 1; out.connect(r.master); p.node.connect(out);
      let live = null;
      if (p.live) { const an = r.ac.createAnalyser(); an.fftSize = 2048; out.connect(an); live = { an, buf: new Float32Array(2048), sr: r.ac.sampleRate, rms: 0, slow: 0, dir: 1, flipAt: 0, m: 0, string: 1, k: 0, held: 0, stable: 0 }; }
      p.el.currentTime = 0;
      try { await p.el.play(); } catch (e) { p.node.disconnect(out); out.disconnect(); $('#np-title').textContent = 'Nothing playing'; return; }
      if (playing || !Sound.on) { p.el.pause(); p.node.disconnect(out); out.disconnect(); return; }
      playing = { p, P: p.live ? { notes: [], strokes: [], total: p.total } : plan(p), t0: 0, ac: r.ac, out, nodes: [], el: p.el, btn, idx: 0, live };
      btn.setAttribute('aria-pressed', 'true'); $('#np-title').textContent = `${p.composer}, ${p.title}`;
      return;
    }
    await loadSamples(r.ac);
    if (r.ac.state !== 'running') { try { await r.ac.resume(); } catch (e) {} }
    const out = r.ac.createGain(); out.gain.value = .95;
    const body = r.ac.createBiquadFilter(); body.type = 'peaking'; body.frequency.value = 230; body.Q.value = .9; body.gain.value = 2.5;
    const air = r.ac.createBiquadFilter(); air.type = 'highshelf'; air.frequency.value = 6500; air.gain.value = -4;
    const verb = hall(r.ac), wet = r.ac.createGain(); wet.gain.value = .3;
    out.connect(body); body.connect(air); air.connect(r.dest); air.connect(verb); verb.connect(wet); wet.connect(r.dest);
    const P = plan(p), t0 = r.ac.currentTime + .2;
    playing = { p, P, t0, ac: r.ac, out, nodes: schedule(r.ac, out, P, t0, p), btn, idx: 0 };
    btn.setAttribute('aria-pressed', 'true');
    $('#np-title').textContent = `${p.composer}, ${p.title}`;
  }
  addEventListener('soundchange', e => { if (!e.detail) stop(); });
  function stop() {
    if (!playing) return;
    const { out, ac, btn, nodes, el, p } = playing;
    out.gain.setTargetAtTime(0, ac.currentTime, .09);
    setTimeout(() => { nodes.forEach(n => { try { n.stop(); } catch (e) {} }); if (el) { try { p.node.disconnect(out); } catch (e) {} if (!(playing && playing.el === el)) el.pause(); } out.disconnect(); }, 500);
    btn.setAttribute('aria-pressed', 'false'); playing = null;
    $('#np-title').textContent = 'Nothing playing'; $('#np-bar').style.width = '0'; $('#np-time').textContent = '0:00';
  }

  /* ---------- listening to a recording ----------
     Pitch by the YIN method on a 2048-sample window (downsampled by 2), loudness by RMS.
     The pitch picks the string and finger position (like a cellist would: the highest string that
     reaches the note, staying on the current string for small moves); loudness drives the bow, and a
     sudden rise in loudness (a new bow stroke) turns it around. In pieces with piano the strongest pitch
     is sometimes the piano's, so the hand only moves for steady, confident pitches. */
  function yin(x, sr) {   // x: 2048 samples; read every other one, so sr is half the context rate
    const W = 512, minLag = Math.max(2, Math.floor(sr / 1100)), maxLag = Math.min(W - 2, Math.ceil(sr / 62));
    const d = new Float32Array(maxLag + 2), c = new Float32Array(maxLag + 2);
    for (let tau = 1; tau <= maxLag + 1; tau++) { let s = 0; for (let i = 0; i < W; i++) { const v = x[2 * i] - x[2 * (i + tau)]; s += v * v; } d[tau] = s; }
    let run = 0; c[0] = 1;
    for (let tau = 1; tau <= maxLag + 1; tau++) { run += d[tau]; c[tau] = run > 0 ? d[tau] * tau / run : 1; }   // cumulative mean normalised difference
    let tau = minLag; while (tau <= maxLag && c[tau] >= .15) tau++;
    if (tau > maxLag) return null;
    while (tau + 1 <= maxLag && c[tau + 1] < c[tau]) tau++;                                                    // settle into the dip
    const a = c[tau - 1], b = c[tau], e = c[tau + 1], den = a - 2 * b + e, frac = den ? clamp((a - e) / (2 * den), -1, 1) : 0;
    return { f: sr / (tau + frac), conf: 1 - b };
  }
  function listen(L, dt, t) {
    L.an.getFloatTimeDomainData(L.buf);
    let e = 0; for (let i = 0; i < L.buf.length; i += 2) e += L.buf[i] * L.buf[i]; const rms = Math.sqrt(e / (L.buf.length / 2));
    L.slow += (rms - L.slow) * Math.min(1, dt * 1.5);
    if (rms > L.slow * 1.45 && rms > .02 && t - L.flipAt > .28) { L.dir = -L.dir; L.flipAt = t; }   // a fresh attack: new bow stroke
    L.rms += (rms - L.rms) * Math.min(1, dt * 12);
    if (L.rms < .012) { L.held = 0; return null; }
    const p = yin(L.buf, L.sr / 2);
    if (p && p.conf > .82 && p.f > 62 && p.f < 1100) {
      const m = Math.round(69 + 12 * Math.log2(p.f / 440));
      if (m === L.m) L.stable += dt; else { L.stable = 0; L.m = m; }
      if (L.stable > .06) {                       // only follow pitches that hold for a moment
        let si = 3; for (let j = 0; j < 4; j++) if (m >= STR[j].open) { si = j; break; }
        const kk = m - STR[L.string].open;
        if (kk >= 0 && kk <= 7 && L.k >= 4) si = L.string;     // stay on the string for small moves up the neck
        L.string = si; L.k = Math.max(0, m - STR[si].open);
      }
      L.held = .25;
    } else L.held -= dt;
    return { speed: clamp(.12 + L.rms * 3.2, .12, .9) };
  }

  /* ---------- animation ---------- */
  const ease = u => lerp(u, u * u * (3 - 2 * u), .45);
  let visible = true, lastF = performance.now(), hy = NUT, hx = 0, hOn = 0, sway = 0, swayV = 0;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(box);
  function draw(dt) {
    let active = -1, speed = 0, sounding = false, vib = 0;
    if (playing) {
      const { P, t0, ac, el } = playing, t = el ? el.currentTime : ac.currentTime - t0;
      if (t > P.total + .5 || (el && el.ended)) { stop(); return; }
      $('#np-bar').style.width = `${clamp(t / P.total, 0, 1) * 100}%`; $('#np-time').textContent = fmt(Math.max(0, t));
      if (playing.live) {   // a real recording: follow the sound itself
        const L = playing.live, st = listen(L, dt, t);
        if (st) {
          active = L.string; sounding = true; speed = st.speed;
          B.s = clamp(B.s + L.dir * st.speed * dt, .05, .95);
          if (B.s <= .05 || B.s >= .95) { L.dir = -L.dir; L.flipAt = t; }
          B.tilt += (TILT[L.string] - B.tilt) * Math.min(1, dt * 10); B.lift += (0 - B.lift) * Math.min(1, dt * 20);
          const y = L.k > 0 ? NUT + LEN * (1 - Math.pow(2, -L.k / 12)) : NUT;
          hy += (y - hy) * Math.min(1, dt * (Math.abs(y - hy) > 30 ? 12 : 26)); hOn += ((L.k > 0 ? 1 : 0) - hOn) * Math.min(1, dt * 14);
          if (L.stable > .3) vib = Math.sin(t * 5.6 * Math.PI * 2) * 1.6;
          hx = xAt(STR[L.string], hy); STR[L.string].stop = hy;
          swayV += (st.speed * L.dir * .6 - sway) * dt * 1.5;
        } else { B.lift += (12 - B.lift) * Math.min(1, dt * 6); hOn += (0 - hOn) * Math.min(1, dt * 4); }
      }
      let i = playing.idx; while (i > 0 && P.notes[i] && P.notes[i].t0 > t) i--; while (P.notes[i + 1] && P.notes[i + 1].t0 <= t) i++; playing.idx = i;
      const n = P.notes[i];
      if (!playing.live && n && !n.rest && t >= n.t0) {
        const st = n.stroke, u = clamp((t - st.t0) / (st.t1 - st.t0), 0, 1);
        B.s = lerp(st.s0, st.s1, ease(u)); speed = Math.abs(st.s1 - st.s0) / (st.t1 - st.t0);
        active = n.string; sounding = true;
        B.tilt += (TILT[n.string] - B.tilt) * Math.min(1, dt * 16); B.lift += (0 - B.lift) * Math.min(1, dt * 20);
        const y = n.k > 0 ? NUT + LEN * (1 - Math.pow(2, -n.k / 12)) : NUT;
        const shiftK = Math.abs(y - hy) > 30 ? 14 : 32;                 // a visible glide on big shifts
        hy += (y - hy) * Math.min(1, dt * shiftK); hOn += ((n.k > 0 ? 1 : 0) - hOn) * Math.min(1, dt * 18);
        if (n.t1 - n.t0 > .35 && t - n.t0 > .18) vib = Math.sin(t * 5.6 * Math.PI * 2) * 1.8;
        hx = xAt(STR[n.string], hy); STR[n.string].stop = hy;
        swayV += (speed * (st.s1 > st.s0 ? 1 : -1) * .6 - sway) * dt * 1.5;
      } else if (!playing.live) { B.lift += (12 - B.lift) * Math.min(1, dt * 8); }
    } else { B.tilt += (0 - B.tilt) * Math.min(1, dt * 3); B.lift += (14 - B.lift) * Math.min(1, dt * 3); hOn += (0 - hOn) * Math.min(1, dt * 6); }
    sway += swayV * dt; swayV *= Math.exp(-dt * 2.5); sway *= Math.exp(-dt * .8);
    wrap.style.transform = `rotate(${clamp(sway, -1, 1).toFixed(3)}deg)`;
    placeBow();
    hand.setAttribute('transform', `translate(${f(hx)} ${f(hy + vib)}) rotate(0)`); hand.setAttribute('opacity', hOn.toFixed(2));
    STR.forEach((s, i) => {
      const want = i === active && sounding ? clamp(2.5 + speed * 10, 2.5, 6) : 0;
      s.amp += (want - s.amp) * Math.min(1, dt * (want > s.amp ? 26 : 7));
      if (i !== active) s.stop += (NUT - s.stop) * Math.min(1, dt * 6);
      s.ph += dt * s.hz * 7;
      const y0 = s.stop, a = reduce ? 0 : s.amp;
      let d = '', up = '', dn = '';
      for (let k = 0; k <= 36; k++) {
        const u = k / 36, y = lerp(y0, BR, u), x = xAt(s, y), env = Math.sin(Math.PI * u);
        d += (k ? 'L' : 'M') + f(x + a * env * Math.sin(s.ph)) + ' ' + f(y);
        up += (k ? 'L' : 'M') + f(x + a * env) + ' ' + f(y); dn = 'L' + f(x - a * env) + ' ' + f(y) + dn;
      }
      const pre = y0 > NUT + .5 ? `M${f(s.nut)} ${NUT}L${f(xAt(s, y0))} ${f(y0)}` : '';
      s.path.setAttribute('d', pre + d);
      s.lens.setAttribute('d', up + dn + 'Z'); s.lens.setAttribute('opacity', (Math.min(1, a / 3) * .45).toFixed(2));
    });
  }
  (function frame(now) { requestAnimationFrame(frame); const dt = clamp((now - lastF) / 1000, 0, .05); lastF = now; if (visible || playing) draw(dt); })(lastF);
  window.__cello = { plan, playing: () => playing && playing.p.id, toggle: id => { const p = PIECES.find(x => x.id === id); toggle(p, p.btn); } };
}
