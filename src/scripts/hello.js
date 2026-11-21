/* "Hello from": where visitors come from. The site's own Cloudflare Worker (worker/index.js) counts one
   visit per visitor per day by country (it stores no IP addresses) and returns the totals. If the counter
   isn't reachable (for example on the local dev server), the block simply stays hidden. */
const box = document.getElementById('hello'), list = document.getElementById('hello-list'), count = document.getElementById('hello-n');
let names = null; try { names = new Intl.DisplayNames(['en'], { type: 'region' }); } catch (e) {}

if (box) {
  fetch('/api/hello', { method: 'POST', credentials: 'same-origin' })
    .then(r => (r.ok && (r.headers.get('content-type') || '').includes('json') ? r.json() : null))
    .then(d => {
      if (!d || !d.total || !Array.isArray(d.top)) return;
      list.innerHTML = '';
      for (const [cc, n] of d.top) {
        const li = document.createElement('li');
        // country code and name as text: emoji flags look different on every device (and some hide some flags)
        const name = names ? names.of(cc) : cc;
        li.innerHTML = `<span class="c">${cc}</span><span class="nm">${name}</span><span class="v">${n.toLocaleString('en')}</span>`;
        list.appendChild(li);
      }
      count.textContent = `${d.total.toLocaleString('en')} ${d.total === 1 ? 'visit' : 'visits'} · ${d.countries} ${d.countries === 1 ? 'country' : 'countries'}`;
      box.hidden = false;
    })
    .catch(() => {});
}
