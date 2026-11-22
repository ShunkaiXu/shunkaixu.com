/* Music page: Shunkai's four recordings in full, with one shared player.
   Plain <audio>, nothing preloaded until a row is pressed. Turning Sound off in the header pauses it. */
import { Sound, $ } from './site.js';
import PIECES from './pieces.js';

const list = $('#recs'), bar = $('#recbar');
if (list && bar) {
  const pp = bar.querySelector('.pp'), seek = $('#rec-seek'), title = $('#rec-title'), time = $('#rec-time');
  const fmt = s => { s = Math.max(0, Math.floor(s || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const audio = new Audio(); audio.preload = 'none';
  let cur = -1, dragging = false;
  const rows = PIECES.map((p, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<button type="button" aria-pressed="false"><span class="n"><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1.5v11l9.5-5.5z"/></svg>0${i + 1}</span><span class="t">${p.composer}</span><span class="d">${p.fullTitle}</span><span class="m">${fmt(p.fullLen)}</span></button>`;
    list.appendChild(li);
    const b = li.querySelector('button'); b.addEventListener('click', () => pick(i)); return b;
  });
  function turnSoundOn() {
    if (Sound.on) return;
    Sound.set(true); $('#sound').setAttribute('aria-pressed', 'true'); $('#sound-label').textContent = 'Sound on';
  }
  function pick(i) {
    if (i === cur) { audio.paused ? play() : audio.pause(); return; }
    cur = i; const p = PIECES[i];
    rows.forEach((b, j) => b.setAttribute('aria-pressed', j === i));
    title.innerHTML = `${p.composer} <span>· ${p.fullTitle}</span>`;
    audio.src = p.full; audio.preload = 'auto'; play();
  }
  function play() { if (cur < 0) { pick(0); return; } turnSoundOn(); audio.play().catch(() => {}); }
  pp.addEventListener('click', () => audio.paused ? play() : audio.pause());
  const paint = () => {
    const d = audio.duration || (cur >= 0 ? PIECES[cur].fullLen : 0), t = audio.currentTime || 0;
    if (!dragging) seek.value = d ? Math.round(t / d * 1000) : 0;
    seek.style.setProperty('--p', `${seek.value / 10}%`);
    time.textContent = `${fmt(dragging ? seek.value / 1000 * d : t)} / ${fmt(d)}`;
  };
  audio.addEventListener('timeupdate', paint); audio.addEventListener('loadedmetadata', paint);
  audio.addEventListener('play', () => { bar.classList.add('playing'); pp.setAttribute('aria-label', 'Pause'); });
  audio.addEventListener('pause', () => { bar.classList.remove('playing'); pp.setAttribute('aria-label', 'Play'); });
  audio.addEventListener('ended', () => { if (cur < PIECES.length - 1) pick(cur + 1); });
  seek.addEventListener('input', () => { dragging = true; paint(); });
  seek.addEventListener('change', () => {
    dragging = false; if (cur < 0) { seek.value = 0; paint(); return; }
    const d = audio.duration || PIECES[cur].fullLen; audio.currentTime = seek.value / 1000 * d; paint();
  });
  // the header's Sound switch is the master: off means quiet
  $('#sound').addEventListener('click', () => { if (!Sound.on) audio.pause(); });
  addEventListener('pagehide', () => audio.pause());
}
