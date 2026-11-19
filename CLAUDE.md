# shunkaixu.com: port the prototype to Astro and deploy it

You are working with Shunkai Xu, a high school student. He is new to the terminal, Git and deploying. Explain one step at a time, wait for him to confirm each step before the next, and keep explanations short and plain.

## What's in this folder

- `prototype/`: the finished site as plain HTML, CSS and JS (6 pages). **This is the reference. The live site must look, move and sound the same.** Open `prototype/index.html` through a local server to compare.
- `site-plan.md`: the design brief, with every decision and the facts on the Music page.

## The job

1. **Make an Astro project** in this folder (`site/` or the root, your choice). Use static output, multi-page, one page per prototype HTML file. Put the shared header and footer in a layout. Keep the hand-written CSS (`assets/site.css`) as it is; don't add Tailwind or a UI framework.
2. **Port the scripts faithfully.** `site.js`, `home.js`, `player.js`, `finale.js`, `dither.js`, `robot.js`, `pieces.js`, `projects.js` and `interests.js` should keep their behaviour exactly.
   - Install `three@0.170.0` from npm and import it normally, replacing the CDN import map.
   - `ur5e-data.js` and `cello-samples.js` are base64 blobs, a workaround for the prototype host. Convert them back into real files in `public/` (a `.glb` or mesh files for the robot; audio files for the samples) and load them with `fetch`. If that's risky, keep them as JS modules first and convert later.
   - `bach-prelude.mp3` goes in `public/`.
   - The theme switch uses `data-site-theme` on `<html>` and the localStorage key `site-theme`, and **defaults to light**. Keep it that way.
3. **Check locally.** Run `npm run dev`, have Shunkai open the local URL, and go through every page with him next to the prototype. Check:
   - the wall breaking and the arm writing the name;
   - the chord strings;
   - the cello player with the Bach recording;
   - the gold-shard finale at the bottom of Home;
   - light and dark mode;
   - a phone-width window.

   Fix anything that differs.
4. **GitHub.** His username is **ShunkaiXu**. Walk him through creating an empty repo called `shunkaixu.com` on github.com, then connecting and pushing. Use whatever sign-in method works on his Mac; GitHub needs a personal access token or GitHub Desktop, not his password. Add a sensible `.gitignore` (node_modules, dist, .astro, .DS_Store).
5. **Cloudflare.** Use Cloudflare Workers with static assets.
   - Add a `wrangler.jsonc` that serves `./dist`.
   - Walk him through Cloudflare dashboard → **Workers & Pages → Create → Import a repository**. Pick the repo. Build command `npm run build`, deploy command `npx wrangler deploy`.
   - Check the `*.workers.dev` link works.
   - Then add the custom domains **shunkaixu.com** and **www.shunkaixu.com**. The domain is already registered on his Cloudflare account.

## Things to know

- **Slow downloads:** his connection to GitHub's download servers is very slow and sometimes resets (Homebrew downloads crawl). npm and browser downloads have worked better. If an install stalls, suggest a browser download or retrying rather than waiting forever.
- **Node:** Node v26 is installed from nodejs.org. Homebrew is installed but slow for big downloads.
- **Credits** (keep them on the site):
  - Bach recording by Chris, public domain, Wikimedia Commons;
  - cello samples by flcellogrl on Freesound, CC BY 3.0;
  - scores from the Mutopia Project;
  - UR5e model from ros-industrial, BSD-3.
- **Placeholders:** don't invent content. The post titles, the "Right now" board text and the Kept/Tempo screenshots are still placeholders; ask him rather than making things up.
