/* The site's Worker. Every page and file is served straight from ./dist as static assets;
   this script only runs for /api/* (see run_worker_first in wrangler.jsonc).

   /api/hello: the "Hello from" counter in the footer.
   - POST counts the visitor's country (from Cloudflare's request.cf.country), at most once a day per
     browser (a cookie), and returns the totals. GET just returns the totals.
   - Nothing personal is stored: no IP addresses, only one number per country. */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/hello') return hello(request, env);
    return env.ASSETS.fetch(request);
  },
};

async function hello(request, env) {
  const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
  if (request.method !== 'GET' && request.method !== 'POST') return new Response('{}', { status: 405, headers });
  const data = (await env.VISITS.get('countries', 'json')) || { total: 0, c: {} };
  if (request.method === 'POST') {
    const seen = /(?:^|;\s*)hf=1/.test(request.headers.get('cookie') || '');
    const cc = (request.cf && request.cf.country) || '';
    // two capital letters only; skip Tor (T1) and unknown (XX)
    if (!seen && /^[A-Z]{2}$/.test(cc) && cc !== 'T1' && cc !== 'XX') {
      data.c[cc] = (data.c[cc] || 0) + 1;
      data.total += 1;
      await env.VISITS.put('countries', JSON.stringify(data));
    }
    if (!seen) headers['set-cookie'] = 'hf=1; Max-Age=86400; Path=/; Secure; HttpOnly; SameSite=Lax';
  }
  const all = Object.entries(data.c).sort((a, b) => b[1] - a[1]);
  return new Response(JSON.stringify({ total: data.total, countries: all.length, top: all.slice(0, 18) }), { headers });
}
