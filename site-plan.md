# Personal site: build brief

Hand this file to whichever Claude session builds the site. Research is in `claude/design-research.md`; the v5 research report is in the conversation of 2026-11-18.

## Goal

A personal site for Shunkai Xu, a high school student in Shanghai who plays the cello, builds iPhone apps and writes robot code. Benchmarks: henryyang.net for craft (do not copy), Clear / Tiimo / Notability for feel. School name stays off the site. No Chinese name in the hero. Contact email: shunkai_xu@163.com.

## Stack

Astro 6 (static, multi-page) with `<ClientRouter />`; vanilla three.js; Web Audio. Fonts: Geist + Geist Mono (OFL); Caveat Brush (OFL) for the header wordmark only. Cloudflare Workers static assets, domain shunkaixu.com.

## Design (version 5.6, 2026-11-19 evening: the prototype is the reference)

Rejected: v1 colour blocks + pinned scroll; v2 flat arm and notes; v3 pastel blocks on a tray; v4 warm Rosin & Brass with an arm assembling a cello. In v5: single-note string dividers (piercing, pointless), metronome, Bach Prelude as the site motif, Chinese name, one long page, a white drafting sheet on the page, a technical drawing of a cello, pluckable strings ("background noise"), and the "Sorting, out loud" demo (meaningless to visitors, not about the owner).

- Light: paper #F3F3F0, ink #121212, rule #D3D5D0, blue #1F4FD8, orange #FF5A1F. Dark: paper #111214, ink #ECECE8, rule #2B2D31, blue #7C9BFF, orange #FF6A33. Theme always opens **light** (does not follow the system); toggle in header, remembered under localStorage `site-theme`, attribute `data-site-theme` (the artifact host overrides `data-theme`).
- Background: 1 px dots every 16 px plus blue "+" crosshairs every 128 px, both in the body background so they scroll together.
- Dividers: "§ n" hairline strings pinned between two small dots (nut and bridge). Swipe across or tap to pluck: the line vibrates from the pluck point, turns orange and plays a pizzicato chord from his repertoire: G major (Bach Prelude), E minor (Elgar Op. 85), A major (Tchaikovsky Rococo Variations), D major (Dvořák), C minor (Fauré, unused). He has never played Kodály; don't use it.
- Wordmark: "Shunkai Xu" in Caveat Brush with a left-to-right reveal.
- Dithered orange field (home intro, About): value-noise edge, 8x8 Bayer dither, 6 px cells. Narrow (min(15vw, 220px)), tucked to the left, fades out at its top and bottom. Only a slight, slow lean toward a nearby cursor: no hole, wake or ripple (he disliked them).
- Pages: Home, Projects, Music, Posts, Interests, About.

Home hero: the 3D canvas is transparent over the real page; an invisible depth-only floor hides what is below it.
- Intro: orange cracks spread across the page (64 Voronoi cells) with a building tremor; the page shatters into thick bevelled shards with orange edges plus short-lived orange dust; camera shake; low E chord; the UR5e (ros-industrial meshes, BSD-3) rises out of the hole, then folds into rest. No "Fig. 1 UR5e" caption.
- Then it writes SHUNKAI XU directly on the page (transparent ink layer, blue dimension line, "FIG. 1" caption), fast (V_DRAW 1.6), with substepped IK. Each letter plays the next note of an E minor line (Elgar's key); an E minor chord when the name is done. Visitor drags to draw in orange; finished letters lift into 3D ink.

Home "Play me something": text on columns 1–7, cello on 8–12 pushed right. The SVG cello has deep red-brown varnish with darker edges and faint grain, and accurate f-holes (small upper eye inside, tapered S stem, larger lower eye outside, pointed wings, nicks level with the bridge). Near upright (13 degrees), long endpin, full bow. The header Sound toggle mutes everything and stops playback.
- Sound: solo cello samples by flcellogrl (Freesound, CC BY 3.0), C2 to C5 (~1 MB, lazy). Phrasing: ritardando at phrase ends, dynamic arch, legato joins, portamento, synthetic hall.
- Scores: Mutopia LilyPond sources (public domain) via `tools/ly2json.py`: Fauré Après un rêve, Dvořák Songs My Mother Taught Me, Bach Suite No. 1 Prelude. Elgar Op. 85 is "Soon": transcribe from a photo of the owner's part.
- Bach Prelude plays a real recording (Chris, public domain, Wikimedia Commons). The 699 score notes are aligned to it (basic-pitch transcription + Needleman–Wunsch) and stored as `times` on the piece, so the animation follows the performance.
- Bowing: short notes slurred in fours (twos when slow). Bach uses `fullBow`: eight sixteenths per stroke, every stroke frog to tip.

Home ending (Fig. 4): a 320vh scroll section with a sticky canvas. About 5,200 gold shards (one InstancedMesh, vertex-shader animation) fly in, form a vortex, then the four strings (strum C G D A), then "Shunkai Xu" (E minor chord). The cursor parts them.

Footer text 14.5 px. GitHub: github.com/ShunkaiXu.

Projects: spec list (Kept, Tempo, Drawing arm, Card-counting trainer, Hold'em simulator) plus "Try Tempo": a working web version of his timer app. 60-minute dial you drag (also arrow keys), presets Focus 25 / Break 5 / Cello practice 45, start/pause/reset, survives reloads (localStorage), tab title shows the countdown, a chord on finish if sound is on, and a "today" log.

Music (all facts confirmed by the owner; each row links to the published result):
- Teacher: Aihao Zheng.
- Working on: Elgar Op. 85, Beethoven Op. 5 No. 2, Paganini Moses arr. Silva; Arensky Op. 32 next.
- Summers: Music@Menlo Young Performers Program 2025; master class with Wu Han, 1 Aug 2025; Juilliard summer programme 2026, with classes, master classes and studio classes with Clara Kim, Sterling Elliott, Zvi Plesser and others.
- Performances: Menlo Koret Young Performers concerts 2025 (Ravel quartet I, 9 Aug; Dvořák Dumky I–II, 2 Aug; Dvořák Quintet Op. 81 IV, 26 Jul); Paris, Église Sainte-Élisabeth-de-Hongrie, 11 May 2024, Popper Polonaise de concert Op. 14.
- Competitions 2024: Schubert IMC Season 4 Platinum Prize + Best Schubert Performance; Clara Schumann 2nd Prize Cello Junior A; AVIMC Winter 1st Prize, Romantic, Young Artist B; Vienna Classical Music Academy prize winner; Mahler Institute Category 3 prize winner (Saint-Saëns No. 1); Bellagrande IMC honorable mention.

Interests (spec list + supply and demand chart); Posts; About.

Prototype limitation: artifacts can't serve .glb or audio files, so the robot mesh and the samples ship as base64 JS modules. In Astro, serve them as files.

Still placeholder: post titles, "Right now" board text, Kept and Tempo screenshots.

## Visitor map ("Hello from" flags)

Build our own at launch: a Cloudflare Worker reads `request.cf.country`, increments a count in D1 or KV (no IPs stored), and the page draws it in the site's style. No fake numbers in the prototype.

## Next

Owner sets up Cloudflare, GitHub and Claude Code; Claude Code ports the handoff folder (CLAUDE.md, prototype, sources, this plan) to Astro and deploys; Elgar from the owner's part; visitor map; real iPhone sound test.
