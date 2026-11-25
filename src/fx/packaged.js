// Native effects keep their engine preview and downloadable scene together under outputs/.
export const packagedEffects = {
  "impacts/body-shockwave": {
    meta: {
      name: "Body shockwave",
      desc: "The battlefield snaps into black-and-white manga. Speed lines stream from the caster’s chest to every edge, follow the caster, then clear outward as colour returns.",
      tags: ["shockwave", "manga", "speed-lines", "screen", "radial"],
      size: [960, 540], fps: 30, duration: 48 / 30, loop: true,
    },
    media: {
      preview: "body-shockwave/preview.mp4",
      poster: "body-shockwave/poster.png",
      archive: "body-shockwave/body-shockwave.zip",
    },
  },
};
