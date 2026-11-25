import { fit, TAU } from "../../core/index.js";

export const meta = {
  name: "Black sword wake",
  desc: "A black pommel wake pinches into a heavy ink stroke, sheds two hooked wisps and frays into ash.",
  tags: ["shadow", "sword", "trail", "ink", "smoke", "directional", "loop"],
  size: [128, 40], origin: [122, 20], duration: 2, fps: 24, loop: true, bg: "light",
  options: { palette: ["#09090b", "#171619", "#29272b", "#4b474c", "#958d94"], seed: 7 },
};

// The anchor is the pommel. The source can be bent along a moving weapon's path.
export const wakeLength = 116;

function band(p, x, y, radius, color, opacity) {
  if (radius <= 0 || opacity <= 0) return;
  const top = y - radius, bottom = y + radius;
  for (let row = Math.floor(top); row < Math.ceil(bottom); row++) {
    const coverage = Math.min(row + 1, bottom) - Math.max(row, top);
    if (coverage > 0) p.blend(x, row, color, opacity * coverage);
  }
}

function windowAt(u, start, end) {
  if (u <= start || u >= end) return 0;
  return Math.sin(Math.PI * (u - start) / (end - start));
}

export function draw(p, t, o) {
  const colors = fit(o.palette, 5);
  const phase = TAU * (t / meta.duration + (o.seed % 23) / 23);
  for (let pixel = 0; pixel <= wakeLength; pixel++) {
    const u = pixel / wakeLength, x = -pixel;
    const wave = TAU * 1.57 * u - phase;
    const belly = Math.sin(Math.PI * u);
    const y = (2.1 * Math.sin(wave) + 1.2 * Math.sin(2 * wave + .9)) * belly - 2.4 * u * u;
    const core = (0.82 + 4.2 * belly ** .82) * (1 - u) ** .86;
    const lift = Math.sin(wave + .7);

    // A torn lower fold peels away from the spine, leaving transparent air between.
    const split = windowAt(u, .16, .84 + .055 * Math.sin(phase));
    const curl = y + (5.0 + 4.8 * lift) * split + 4.1 * u;
    band(p, x, curl, 1.55 * split, colors[1], .78 * split);
    band(p, x, curl - .85 * split, .54 * split, colors[3], .64 * split);
    const crest = windowAt(u, .33, .98);
    const crestY = y - (6.4 + 3.0 * Math.cos(wave)) * crest - 3.6 * u;
    band(p, x, crestY, 1.18 * crest, colors[2], .66 * crest);

    // Pieces of the outer fold travel their own short distance before evaporating.
    for (let i = 0; i < 3; i++) {
      const age = ((t / meta.duration + (i + .17 * o.seed) / 3) % 1 + 1) % 1;
      const center = .29 + .67 * age;
      const tip = windowAt(u, center - .049, center + .052);
      const fade = Math.sin(Math.PI * age);
      const side = i === 1 ? 1 : -1;
      const ay = y + side * (4 + 5 * age + 2 * Math.sin(wave + i))
                 - side * (u - center) * 30;
      band(p, x, ay, .95 * tip, colors[1], .82 * tip * fade);
    }

    const mist = windowAt(u, .21, .92) * (.65 + .35*Math.cos(wave));
    band(p, x, y - 1.4*mist, core + 3.7*mist, colors[2], .20*mist);
    band(p, x, y, core + 1.15 * belly, colors[2], .28 * (1 - u));
    band(p, x, y, core, colors[0], .97 * (1 - u ** 1.8));
    band(p, x, y + core * .24, core * .34, colors[1], .72 * (1 - u));
    const rim = .32 + .68 * Math.max(0,Math.sin(wave + 1.1));
    band(p, x, y - .92 * core, Math.min(.90, core * .36), colors[4], rim * .88 * (1 - u*.85));
  }
}
