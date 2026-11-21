/* Gentle reveals: headings, paragraphs and list rows fade up a little as they scroll into view.
   Only things already below the fold are hidden first, so nothing on screen ever blinks,
   and nothing is hidden at all without JavaScript or for visitors who prefer reduced motion. */
import { reduce } from './site.js';

const SEL = [
  'main h2:not(.vh)', 'main .head p', 'main .spec > a', 'main .spec > li', 'main .board > li',
  'main .sect > p', 'main .cols > p', 'main .bio > p', 'main .facts', 'main section > p'
].join(',');
// parts that animate themselves are left alone
const SKIP = '#hero, #finale, .play, .pieces';

if (!reduce) {
  const fold = innerHeight * .92, pending = [];
  let lastTop = -1, n = 0;
  for (const el of document.querySelectorAll(SEL)) {
    if (el.closest(SKIP)) continue;
    const top = el.getBoundingClientRect().top;
    if (top < fold) continue;                                     // already visible: leave it alone
    n = Math.abs(top - lastTop) < 4 ? n + 1 : 0; lastTop = top;    // items side by side get a small stagger
    el.style.setProperty('--rv-d', `${Math.min(n, 4) * 60}ms`);
    el.classList.add('rv'); pending.push(el);
  }
  // reveal on scroll (a plain position check, so it can't silently fail)
  let queued = false;
  const check = () => {
    queued = false;
    const line = innerHeight * .94;
    for (let i = pending.length - 1; i >= 0; i--) if (pending[i].getBoundingClientRect().top < line) { pending[i].classList.add('rv-in'); pending.splice(i, 1); }
    if (!pending.length) { removeEventListener('scroll', onScroll); removeEventListener('resize', onScroll); }
  };
  const onScroll = () => { if (!queued) { queued = true; setTimeout(check, 40); } };
  addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll);
  // safety net: never leave anything hidden for long (jumping to an anchor, printing, odd browsers)
  setTimeout(() => { pending.forEach(el => el.classList.add('rv-in')); pending.length = 0; }, 6000);
}
