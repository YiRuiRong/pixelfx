// There is no painted sound wave. The eight beads ARE the measuring instrument.
import { clamp, fit, rand, smooth } from "../../core/index.js";
import { bead } from "../_ink-studies.js";

export const meta = {
  name: "Empty mountain echo", desc: "Eight hanging ink drops flatten in succession under an unseen bell stroke. After the stillness, the last drop stirs: a softer reply travels back through four drops only.",
  tags: ["ink-wash", "ink-studies", "echo", "sound-wave", "droplets", "one-shot"],
  size: [232,76], origin: [116,38], duration: 2.36, fps: 50, loop: false, bg: "light",
  options: {palette: ["#182225", "#2a3a3b", "#485d5a", "#798d83", "#a6b5a1"], seed: 17},
};
export const cues = { strike: .32, interval: .09, echo: 1.46, returnInterval: .10, drain: 2.14 };
// A loose calligraphic rhythm, big / small / pause. The space between beads matters.
const beads = [[-92,3,4.4],[-67,-6,7.6],[-42,4,4.9],[-16,-3,9.3],[14,6,6.1],[41,-6,8.0],[67,3,4.0],[90,-3,6.6]];
function pulse(age) {
  if (age<=0 || age>=.32) return 0;
  if (age<.048) return smooth(0,.048,age);
  if (age<.198) return 1-smooth(.048,.198,age);
  return -.16*Math.sin(Math.PI*(age-.198)/.122)**2; // ink briefly pulls taller as it comes round
}
export function draw(p,t,o) {
  if (t <= 0 || t >= meta.duration) return;
  const C=fit(o.palette,5);
  for (const [i,[x,y,r]] of beads.entries()) {
    const entry=smooth(.012*(i%3),.22+.01*(i%3),t);
    const leave=smooth(cues.drain+.015*(i%3),meta.duration-.018*(i%3),t);
    const s=entry*(1-leave);
    if (s < .015) continue;
    // The echo is not a rewound primary: it arrives from the other side and
    // takes a little longer to fall silent at each of its four receivers.
    const first=pulse(t-cues.strike-i*cues.interval);
    const back=i<4 ? 0 : (.56-.11*(7-i))*pulse((t-cues.echo-(7-i)*cues.returnInterval)/1.10);
    const force=first+back, travel=first-back;
    const variation=rand(o.seed,i), lean=(variation-.5)*.29;
    const cx=x+travel*(3.6+.15*r), cy=y+.95*(variation-.5) - 4*(1-entry)+leave*leave*(9+r);
    // Pinch into a tilted leaf for a single accent; the wider body takes longer
    // to recover than it did to compress. Halfway back the left bank stays still.
    const rx=r*(.92+.10*variation)*(1+.68*force)*s;
    const ry=r*(1.06+.09*variation)*(1-.75*force)*s;
    bead(p,cx,cy,rx,ry,lean+travel*(i%2 ? -.21 : -.13),C,o.seed+i*1.63,s,.19+.09*variation);
  }
}
