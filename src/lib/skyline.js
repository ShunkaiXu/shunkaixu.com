/* Lujiazui, Shanghai, seen across the Huangpu from the Bund. Built at build time into one SVG.
   Ground (the river bank) is y = 200; 1 px is about 3.5 m, so heights are roughly to scale. */
const f = n => +n.toFixed(1);
const G = 200;

// background blocks: deterministic so every build draws the same city
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const blocks = [];
for (let x = 20; x < 1180;) {
  const w = 14 + rnd() * 26, near = Math.abs(x - 640) < 260;
  const h = (near ? 34 : 14) + rnd() * (near ? 46 : 30);
  const top = G - h, d = rnd() < .25 ? `M${f(x)} ${G}V${f(top + 4)}L${f(x + w / 2)} ${f(top)}L${f(x + w)} ${f(top + 4)}V${G}` : `M${f(x)} ${G}V${f(top)}H${f(x + w)}V${G}`;
  blocks.push(d); x += w + (rnd() < .3 ? 2 + rnd() * 8 : 0);
}

// Oriental Pearl Tower: three splayed legs, two pink spheres on three columns, then the mast
const P = 330;
const pearl = [
  `M${P - 22} ${G}L${P - 6} ${G - 22}M${P + 22} ${G}L${P + 6} ${G - 22}M${P} ${G}V${G - 18}`,
  `M${P - 4} ${G - 40}V${G - 98}M${P + 4} ${G - 40}V${G - 98}`,
  `M${P} ${G - 112}V${G - 124}M${P} ${G - 130}V${G - 162}`,
];
const spheres = [[P, G - 30, 11], [P, G - 105, 8.5], [P, G - 127, 3.4]];

// Jin Mao: a pagoda of setbacks, each tier a little narrower
const J = 585; let jl = [], jr = []; let y = G, hw = 13;
for (let i = 0; i < 9; i++) { const th = [34, 22, 16, 12, 9, 7, 6, 5, 4][i]; jl.push([J - hw, y], [J - hw, y - th]); jr.push([J + hw, y], [J + hw, y - th]); y -= th; hw -= 1.3; }
const jin = `M${jl.map(p => `${f(p[0])} ${f(p[1])}`).join('L')}L${J} ${f(y - 14)}L${[...jr].reverse().map(p => `${f(p[0])} ${f(p[1])}`).join('L')}`;
const jinMast = `M${J} ${f(y - 14)}V${f(y - 24)}`;

// Shanghai World Financial Center: a tapering prism with the trapezoid opening at the top
const S = 700, sT = G - 141;
const swfc = `M${S - 19} ${G}L${S - 11} ${sT}H${S + 11}L${S + 19} ${G}`;
const swfcHole = `M${S - 7} ${sT + 4}H${S + 7}L${S + 5} ${sT + 15}H${S - 5}Z`;

// Shanghai Tower: a twisting, tapering cylinder with a notch that spirals to the slanted crown
const T = 820, tT = G - 182;
const tower = `M${T - 23} ${G}C${T - 22} ${G - 80} ${T - 15} ${G - 140} ${T - 10} ${tT + 6}L${T + 8} ${tT}C${T + 12} ${G - 140} ${T + 20} ${G - 80} ${T + 23} ${G}`;
const towerTwist = `M${T + 18} ${G}C${T + 10} ${G - 70} ${T - 2} ${G - 120} ${T - 6} ${tT + 10}`;

// the river: a few broken strokes under the bank
const river = ['M40 212H160M230 212H420M500 212H560', 'M640 212H900M960 212H1120', 'M120 222H260M360 222H470M700 222H820M1000 222H1080'];

export const SKY = { blocks, pearl, spheres, jin, jinMast, swfc, swfcHole, tower, towerTwist, river };
