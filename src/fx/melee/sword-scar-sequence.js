import { crossing, middleScar, swordScarStage } from "./_sword-scar.js";

export const { meta, cues, drawBack, draw } = swordScarStage({
  name: "Sword scar: Cascade",
  desc: "One rising sword stroke cuts through three sleeping scars. Their crossings kindle in order, each releasing a single bright edge on its own bearing.",
  tags: ["cross", "combo", "chain"],
  echoes: [
    crossing({ along: 0.26, degrees: -100, length: 133, pivot: 0.37, width: 11.5, key: 1, warning: 10, release: 18 }),
    crossing({ ...middleScar, warning: 21, release: 27 }),
    crossing({ along: 0.77, degrees: 168, length: 160, pivot: 0.36, width: 16.5, key: 3, warning: 30, release: 36 }),
  ],
  end: 58,
});
