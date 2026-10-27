// Pixel Aquarium: tank interior for the large widget, fish NOT included (they are overlaid).
// 116x122 art px ~ one widget at the fish's pixel scale (9 device px per art px on a 3x phone).
// Open water band (fish canvas): x 7..109, y 17..105 — keep it uncluttered.
pal({
  // frame (dark walnut)
  K: "#120c10", F: "#2b1a17", f: "#4a2c22", h: "#6e4430",
  // water, deep -> light
  A: "#0c2a3c", B: "#12405a", C: "#18566e", D: "#227084", E: "#3a90a0", S: "#7cc4c8",
  // plants
  P: "#0f3a2c", Q: "#1e5c34", G: "#3b8a3a", g: "#7cc05a",
  // rocks
  r: "#2a2a36", R: "#4a4a5a", q: "#74748a", Z: "#a3a3b4",
  // gravel / sand
  t: "#5a4632", u: "#8a6a44", v: "#b8935c", x: "#e0c088",
  // driftwood, air stone
  w: "#3a2418", W: "#6a4428", o: "#c8e8ec",
})
ramps("KFfh", "ABCDES", "PQGg", "rRqZ", "tuvx", "wW")

// --- parts -----------------------------------------------------------------
// Tall ribbon plant: procedural sway-free stalk with leaves.
for (let i = 1; i <= 3; i++) {
  sprite("_weed_" + i, { w: 9, h: 40 + i * 6 }, (c) => {
    const h = 40 + i * 6
    for (let y = h - 1; y >= 0; y--) {
      const x = 4 + Math.round(Math.sin((h - y) / (5 + i)) * (1 + i * 0.6))
      c.px(x, y, y > h * 0.4 ? "Q" : "G")
      c.px(x + 1, y, y > h * 0.55 ? "P" : "Q")
      if ((y + i) % 6 === 0) { c.px(x - 1, y, "G"); c.px(x - 2, y - 1, "g") }
      if ((y + i * 2) % 7 === 0) { c.px(x + 1, y, "G"); c.px(x + 2, y - 1, "g") }
    }
  })
}
// Amazon sword: leaves fanning out from one crown.
sprite("_bush", { w: 26, h: 22 }, (c) => {
  const leaves = [[-11, 6], [-8, 1], [-4, -2], [0, -3], [4, -2], [8, 1], [11, 6], [-6, 9], [6, 9]]
  leaves.forEach(([dx, dy], i) => {
    const tip = [13 + dx, 4 + dy + 3]
    c.line(13, 21, tip[0], tip[1], i % 2 ? "Q" : "G", 2)
    c.line(13, 21, tip[0], tip[1], i % 2 ? "G" : "g", 1)
  })
  c.rect(11, 19, 5, 3, "P")
})
sprite("_rock_big", { w: 26, h: 14, outline: "r" },
  ellipse(13, 9, 12, 5, "R"), ellipse(10, 7, 8, 4, "q"), ellipse(8, 5, 4, 2, "Z"),
  shade([0, 10, 26, 4], 1, 0.6))
sprite("_rock_small", { w: 12, h: 8, outline: "r" },
  ellipse(6, 5, 5, 3, "R"), ellipse(5, 4, 3, 2, "q"), px(4, 3, "Z"))
sprite("_pebble_1", "u")
sprite("_pebble_2", "vu")
sprite("_pebble_3", "x\nv")

// --- scene -------------------------------------------------------------------
scene("aquarium_bg", { w: 116, h: 122, bg: "K" },
  // water body with depth gradient and a lit surface
  layer("water",
    grad(4, 9, 108, 104, "EDCB", "v", 0.35),
    rect(4, 9, 108, 2, "S"),
    hline(4, 11, 108, "E")),

  // far background: dark silhouette plants
  layer("far",
    clip([4, 9, 108, 104],
      stamp("_weed_3", 2, 54, { swap: { Q: "P", G: "P", g: "Q" } }),
      stamp("_weed_2", 14, 66, { swap: { Q: "P", G: "P", g: "Q" } }),
      stamp("_weed_3", 96, 52, { swap: { Q: "P", G: "P", g: "Q" }, flip: "x" }),
      stamp("_weed_1", 86, 70, { swap: { Q: "P", G: "P", g: "Q" } }))),

  // light shafts from the surface (soft, dithered)
  layer("rays", { light: true, density: 0.4 },
    poly([18, 11, 30, 11, 50, 100, 34, 100], "S"),
    poly([56, 11, 64, 11, 80, 100, 68, 100], "S"),
    poly([84, 11, 92, 11, 104, 80, 96, 80], "S")),
  layer("rays_core", { light: true, density: 0.75 },
    poly([22, 11, 26, 11, 38, 60, 34, 60], "S"),
    poly([59, 11, 61, 11, 68, 50, 66, 50], "S")),

  // substrate: sand with gravel grain, sloping up at the back corners
  layer("gravel",
    poly([4, 104, 30, 100, 60, 103, 90, 99, 112, 102, 112, 113, 4, 113], "u"),
    poly([4, 108, 40, 106, 80, 108, 112, 106, 112, 113, 4, 113], "v"),
    noise(4, 99, 108, 14, "tx", 0.12, 7, "uv"),
    scatter("_pebble_*", 4, 104, 108, 9, 26, { on: "uv", rflip: "x" })),

  // mid ground: plants, rocks, driftwood at the sides and bottom
  layer("mid",
    stamp("_weed_2", 6, 52),
    stamp("_weed_1", 13, 62),
    stamp("_weed_3", 100, 48, { flip: "x" }),
    stamp("_weed_1", 92, 64),
    line(30, 103, 46, 94, "w", 3), line(44, 95, 52, 89, "W", 2), line(36, 99, 34, 92, "W", 2),
    stamp("_rock_big", 64, 92),
    stamp("_rock_small", 20, 97),
    stamp("_rock_small", 88, 96, { flip: "x" }),
    stamp("_bush", 46, 94),
    stamp("_bush", 0, 96, { flip: "x" })),

  // contact shadows under rocks/bush
  layer("contact", { shade: true, density: 0.5 },
    ellipse(77, 106, 14, 2, "K"), ellipse(57, 108, 11, 2, "K"), ellipse(26, 105, 7, 1, "K")),

  // air stone + a column of resting bubbles (static; animated bubbles would be overlaid)
  layer("air",
    rect(104, 104, 5, 3, "q"), hline(104, 103, 5, "Z"),
    px(106, 98, "o"), px(105, 92, "o"), px(107, 86, "o"), px(106, 79, "S"), px(105, 71, "S")),

  // glass: faint vertical reflection streaks near the left and right walls
  layer("glass", { light: true, density: 0.35 },
    rect(7, 14, 2, 70, "S"), rect(10, 14, 1, 40, "S"), rect(108, 30, 1, 50, "S")),

  // frame: lid rim, side posts, base trim (outermost px may be clipped by widget corners)
  layer("frame",
    rect(0, 0, 116, 9, "F"), hline(0, 0, 116, "K"), hline(0, 7, 116, "h"), hline(0, 8, 116, "K"),
    rect(2, 2, 112, 4, "f"), hline(2, 2, 112, "h"),
    rect(0, 9, 4, 104, "F"), vline(3, 9, 104, "K"), vline(1, 9, 104, "f"),
    rect(112, 9, 4, 104, "F"), vline(112, 9, 104, "K"), vline(114, 9, 104, "f"),
    rect(0, 113, 116, 9, "F"), hline(0, 113, 116, "K"), hline(0, 114, 116, "h"),
    rect(2, 116, 112, 4, "f"), hline(0, 121, 116, "K")))

// --- full-screen wallpaper -------------------------------------------------------
// 147x319 art px x 9 = 1323x2871, centre-cropped to the iPhone's 1320x2868.
// The widget shows an exact crop of this image, so any spot can sit under it; keep the
// band where a low large widget lands (y ~150..275) open water with only low plants.
const WW = 147, WH = 319
sprite("_bubble", "o")
sprite("_mote_1", "S")
sprite("_mote_2", "SS")
sprite("_mote_3", "S\nS")
// Tall ribbon weeds for the full-height tank (same drawing as _weed_*).
for (let i = 1; i <= 3; i++) {
  const h = 70 + i * 25
  sprite("_tall_" + i, { w: 13, h }, (c) => {
    for (let y = h - 1; y >= 0; y--) {
      const x = 6 + Math.round(Math.sin((h - y) / (9 + i * 2)) * (2 + i))
      c.px(x, y, y > h * 0.4 ? "Q" : "G")
      c.px(x + 1, y, y > h * 0.55 ? "P" : "Q")
      if ((y + i) % 7 === 0) { c.px(x - 1, y, "G"); c.px(x - 2, y - 1, "G"); c.px(x - 3, y - 2, "g") }
      if ((y + i * 3) % 9 === 0) { c.px(x + 2, y, "G"); c.px(x + 3, y - 1, "G"); c.px(x + 4, y - 2, "g") }
    }
  })
}
scene("wallpaper_aquarium", { w: WW, h: WH, bg: "K" },
  layer("water",
    grad(5, 14, WW - 10, WH - 19, "EDCBA", "v", 0.5),
    rect(5, 14, WW - 10, 2, "S"),
    hline(5, 16, WW - 10, "E")),

  layer("far",
    clip([5, 14, WW - 10, WH - 19],
      ...[[-2, 150, 3], [10, 180, 2], [24, 205, 1], [WW - 12, 145, 3], [WW - 24, 178, 2], [WW - 38, 210, 1]]
        .map(([x, y, i]) => stamp("_tall_" + i, x, y, { swap: { Q: "P", G: "P", g: "Q" }, flip: x > WW / 2 ? "x" : undefined })))),

  layer("rays", { light: true, density: 0.4 },
    poly([22, 16, 38, 16, 70, 260, 46, 260], "S"),
    poly([70, 16, 80, 16, 104, 240, 90, 240], "S"),
    poly([108, 16, 118, 16, 136, 200, 126, 200], "S")),
  layer("rays_core", { light: true, density: 0.75 },
    poly([28, 16, 33, 16, 52, 130, 46, 130], "S"),
    poly([73, 16, 76, 16, 88, 110, 85, 110], "S")),

  // suspended specks (one step lighter than the water under them); also give the app's
  // wallpaper matching unique points everywhere in otherwise smooth water
  layer("motes", { light: true },
    scatter("_mote*", 6, 18, WW - 12, 262, 340, {})),

  layer("gravel",
    poly([5, 288, 40, 282, 80, 287, 115, 281, WW - 5, 285, WW - 5, WH - 5, 5, WH - 5], "u"),
    poly([5, 298, 50, 295, 100, 299, WW - 5, 294, WW - 5, WH - 5, 5, WH - 5], "v"),
    noise(5, 281, WW - 10, 33, "tx", 0.12, 7, "uv"),
    scatter("_pebble_*", 5, 288, WW - 10, 26, 60, { on: "uv", rflip: "x" })),

  layer("mid",
    stamp("_tall_3", 2, 186), stamp("_tall_2", 14, 214), stamp("_weed_2", 26, 240),
    stamp("_tall_3", WW - 16, 182, { flip: "x" }), stamp("_tall_1", WW - 28, 228), stamp("_weed_1", WW - 38, 246),
    line(38, 290, 58, 278, "w", 3), line(56, 279, 66, 272, "W", 2), line(45, 286, 43, 277, "W", 2),
    stamp("_rock_big", 84, 274), stamp("_rock_small", 30, 280), stamp("_rock_small", 112, 280, { flip: "x" }),
    stamp("_bush", 60, 272), stamp("_bush", 4, 278, { flip: "x" }), stamp("_bush", WW - 30, 276)),

  layer("contact", { shade: true, density: 0.5 },
    ellipse(97, 288, 14, 2, "K"), ellipse(73, 293, 11, 2, "K"), ellipse(36, 288, 7, 1, "K")),

  layer("air",
    rect(WW - 18, 290, 5, 3, "q"), hline(WW - 18, 289, 5, "Z"),
    ...[284, 276, 266, 254, 240, 224, 206].map((y, i) => stamp("_bubble", WW - 16 + (i % 3) - 1, y))),

  layer("glass", { light: true, density: 0.35 },
    rect(9, 24, 2, 150, "S"), rect(12, 24, 1, 80, "S"), rect(WW - 10, 60, 1, 120, "S")),

  layer("frame",
    rect(0, 0, WW, 14, "F"), hline(0, 12, WW, "h"), hline(0, 13, WW, "K"),
    rect(2, 3, WW - 4, 7, "f"), hline(2, 3, WW - 4, "h"),
    rect(0, 14, 5, WH - 19, "F"), vline(4, 14, WH - 19, "K"), vline(1, 14, WH - 19, "f"),
    rect(WW - 5, 14, 5, WH - 19, "F"), vline(WW - 5, 14, WH - 19, "K"), vline(WW - 2, 14, WH - 19, "f"),
    rect(0, WH - 5, WW, 5, "F"), hline(0, WH - 5, WW, "K"), hline(0, WH - 4, WW, "h")))
