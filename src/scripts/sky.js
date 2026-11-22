/* Footer skyline: draws itself the first time it scrolls into view, and shows the time in Shanghai. */
const sky = document.getElementById('sky');
if (sky) {
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    sky.classList.add('arm');
    // a scroll check rather than IntersectionObserver: it also fires in throttled or background tabs
    const check = () => { const r = sky.getBoundingClientRect(); if (r.top < innerHeight * .92 && r.bottom > 0) { sky.classList.add('in'); removeEventListener('scroll', check); } };
    addEventListener('scroll', check, { passive: true }); check();
  }
  const t = document.getElementById('sh-time');
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit' });
  const tick = () => { t.textContent = `${fmt.format(new Date())} in Shanghai`; };
  tick(); setInterval(tick, 20000);
}
