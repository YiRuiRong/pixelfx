import { crossing, middleScar, swordScarStage } from "./_sword-scar.js";

export const { meta, cues, drawBack, draw } = swordScarStage({
  name: "Sword scar: Reprise",
  desc: "A rising cut crosses an old descending scar. A wine-red spark spreads from their crossing before the old cut reopens along its original path.",
  tags: ["cross", "combo"],
  echoes: [crossing({ ...middleScar, warning: 10, release: 20 })],
  end: 42,
});
