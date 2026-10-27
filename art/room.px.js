// Pixel Aquarium "tank on a stand" style.
//  tank  (130x130): the widget itself. Its rounded dark frame IS the widget edge, so the
//                   glass rim iOS draws around widgets reads as the tank's glass.
//  stand (140x44):  cabinet the app pastes into the room right under the calibrated widget.
//  room  (147x319): the wallpaper without the stand. Art px = 3 pt (9 device px at 3x).
pal({
  // frame / wood
  K: "#120c10", F: "#2b1a17", f: "#4a2c22", h: "#6e4430", H: "#94603e",
  // water, deep -> light
  A: "#0c2a3c", B: "#12405a", C: "#18566e", D: "#227084", E: "#3a90a0", S: "#7cc4c8", s: "#bfe6e6",
  // plants
  P: "#0f3a2c", Q: "#1e5c34", G: "#3b8a3a", g: "#7cc05a",
  // rocks / sand
  r: "#2a2a36", R: "#4a4a5a", q: "#74748a", Z: "#a3a3b4",
  t: "#5a4632", u: "#8a6a44", v: "#b8935c", x: "#e0c088",
  // room: plaster wall, wainscot, floor, night window, lamp light
  m: "#3a2a33", n: "#4d3640", N: "#634552", o: "#7a5a5e",
  w: "#2a1c18", W: "#45302a", y: "#5e4234", Y: "#7a5640",
  j: "#0e1430", J: "#1c2850", i: "#f4e8b0", I: "#ffd27a", L: "#ffb050",
  c: "#7a2c34", e: "#a8404a",
})
ramps("KFfhH", "ABCDESs", "PQGg", "rRqZ", "tuvx", "mnNo", "wWyY", "jJ", "LIi", "ce")

// rounded-rect region helper (pixel-art corners)
const rr = (x0, y0, w, h, r) => (x, y) => {
  if (x < x0 || y < y0 || x >= x0 + w || y >= y0 + h) return false
  const cx = Math.min(Math.max(x + 0.5, x0 + r), x0 + w - r), cy = Math.min(Math.max(y + 0.5, y0 + r), y0 + h - r)
  return (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r
}

// ---- shared tank parts -----------------------------------------------------------
for (let i = 1; i <= 3; i++) {
  sprite("_weed_" + i, { w: 11, h: 34 + i * 10 }, (c) => {
    const h = 34 + i * 10
    for (let y = h - 1; y >= 0; y--) {
      const x = 5 + Math.round(Math.sin((h - y) / (6 + i)) * (1 + i * 0.7))
      c.px(x, y, y > h * 0.4 ? "Q" : "G"); c.px(x + 1, y, y > h * 0.55 ? "P" : "Q")
      if ((y + i) % 6 === 0) { c.px(x - 1, y, "G"); c.px(x - 2, y - 1, "g") }
      if ((y + i * 2) % 7 === 0) { c.px(x + 2, y, "G"); c.px(x + 3, y - 1, "g") }
    }
  })
}
sprite("_sword", { w: 26, h: 22 }, (c) => {
  ;[[-11, 6], [-8, 1], [-4, -2], [0, -3], [4, -2], [8, 1], [11, 6], [-6, 9], [6, 9]].forEach(([dx, dy], i) => {
    c.line(13, 21, 13 + dx, 7 + dy, i % 2 ? "Q" : "G", 2); c.line(13, 21, 13 + dx, 7 + dy, i % 2 ? "G" : "g", 1)
  })
  c.rect(11, 19, 5, 3, "P")
})
sprite("_rock_big", { w: 26, h: 14, outline: "r" },
  ellipse(13, 9, 12, 5, "R"), ellipse(10, 7, 8, 4, "q"), ellipse(8, 5, 4, 2, "Z"), shade([0, 10, 26, 4], 1, 0.6))
sprite("_rock_small", { w: 12, h: 8, outline: "r" }, ellipse(6, 5, 5, 3, "R"), ellipse(5, 4, 3, 2, "q"), px(4, 3, "Z"))
sprite("_pebble_1", "u"); sprite("_pebble_2", "vu"); sprite("_pebble_3", "x\nv")
sprite("_mote_1", "S"); sprite("_mote_2", "SS")

// ---- tank (the widget) ---------------------------------------------------------------
// Top: wooden lid rounded like the widget's top corners (iOS's rim light falls on it).
// Sides: 2 px glass bezel. Bottom: square base on the cabinet; the app paints the same base
// into the wallpaper under the widget, so the corners iOS rounds off still show base.
// Base/bezel colours stay inside what the widget can show after iOS lightens it (no deep blacks).
const R = 9, LID = 7, BASE = 10
// One tank per widget family (art px = 3 pt): large 130x130, medium 130x62, small 62x62.
function tankScene(name, T, TH) {
  const lidShape = rr(0, 0, T, TH + 2 * R, R)          // rounded top corners only
  const wh = TH - LID - BASE                            // water height
  const inner = [2, LID, T - 4, wh]
  const g = TH - BASE - 16                              // gravel line
  const sx = T / 130                                    // horizontal scale for props
  return scene(name, { w: T, h: TH },
    layer("water", clip(inner,
      grad(0, LID, T, wh, "EDCBA", "v", 0.5), rect(0, LID, T, 3, "S"), hline(0, LID + 3, T, "E"))),
    layer("rays", { light: true, density: 0.35 }, clip(inner,
      poly([18 * sx, 10, 30 * sx, 10, 54 * sx, g + 2, 38 * sx, g + 2], "S"),
      poly([62 * sx, 10, 70 * sx, 10, 88 * sx, g + 2, 76 * sx, g + 2], "S"),
      poly([94 * sx, 10, 102 * sx, 10, 116 * sx, g - 20, 108 * sx, g - 20], "S"))),
    layer("motes", { light: true }, clip(inner, scatter("_mote*", 6, 12, T - 12, Math.max(4, g - 18), Math.round(70 * sx * wh / 113), {}))),
    layer("plants", clip(inner,
      ...(TH > 100
        ? [stamp("_weed_3", 2, g - 42), stamp("_weed_2", 12, g - 28), stamp("_weed_1", 21, g - 16),
           stamp("_weed_3", T - 13, g - 44, { flip: "x" }), stamp("_weed_2", T - 23, g - 30), stamp("_weed_1", T - 32, g - 14)]
        : [stamp("_weed_1", 2, g - 38), stamp("_weed_1", T - 12, g - 36, { flip: "x" })]))),
    layer("gravel", clip(inner,
      poly([0, g + 2, T * 0.25, g - 2, T * 0.5, g + 1, T * 0.75, g - 3, T, g, T, TH, 0, TH], "u"),
      poly([0, g + 7, T * 0.35, g + 5, T * 0.7, g + 8, T, g + 5, T, TH, 0, TH], "v"),
      noise(0, g - 3, T, 19, "tx", 0.12, 7, "uv"),
      scatter("_pebble_*", 4, g + 2, T - 8, 11, Math.round(24 * sx), { on: "uv", rflip: "x" }),
      ...(T > 100
        ? [line(30, g + 2, 46, g - 7, "W", 3), line(44, g - 6, 52, g - 12, "Y", 2),
           stamp("_rock_big", 70, g - 10), stamp("_rock_small", 16, g - 4), stamp("_rock_small", 104, g - 5, { flip: "x" }),
           stamp("_sword", 48, g - 12), stamp("_sword", T - 30, g - 10)]
        : [stamp("_rock_small", 8, g - 4), stamp("_sword", T - 30, g - 10)]))),
    layer("glass", { light: true, density: 0.5 }, clip(inner,
      poly([12, 10, 22, 10, 6, 38, 6, 28], "s"), poly([26, 10, 30, 10, 10, 44, 8, 42], "s"))),
    layer("bezel", vline(0, LID, wh, "y"), vline(T - 1, LID, wh, "y"), vline(1, LID, wh, "s"), vline(T - 2, LID, wh, "S")),
    layer("lid", clip(lidShape,
      rect(0, 0, T, LID, "h"), hline(0, 0, T, "W"), hline(0, 1, T, "H"), hline(0, 4, T, "y"), hline(0, LID - 1, T, "W"))),
    layer("base",
      rect(0, TH - BASE, T, BASE, "h"), hline(0, TH - BASE, T, "W"), hline(0, TH - BASE + 1, T, "H"),
      hline(0, TH - 3, T, "y"), hline(0, TH - 2, T, "y"), hline(0, TH - 1, T, "W")))
}
tankScene("tank", 130, 130)
tankScene("tank_medium", 130, 62)
tankScene("tank_small", 62, 62)

// Wall shelf for a tank that is not the lowest one; the app 3-slices it to the tank's width
// (left 12 px, middle column 70 repeated, right 12 px).
scene("shelf", { w: 140, h: 16 },
  rect(0, 0, 140, 5, "y"), hline(0, 0, 140, "Y"), hline(0, 4, 140, "w"),
  poly([8, 5, 14, 5, 14, 15, 12, 15], "w"), poly([126, 5, 132, 5, 128, 15, 126, 15], "w"),
  vline(13, 5, 10, "W"), vline(127, 5, 10, "W"))

// ---- stand (pasted under the widget by the app) ---------------------------------------
const SW = 140, SH = 44
scene("stand", { w: SW, h: SH },
  rect(0, 0, SW, 5, "y"), hline(0, 0, SW, "Y"), hline(0, 4, SW, "w"),
  rect(3, 5, SW - 6, 33, "W"), box(3, 5, SW - 6, 33, "w"),
  box(9, 9, 58, 25, "w"), box(SW - 67, 9, 58, 25, "w"),
  hline(10, 10, 56, "y"), hline(SW - 66, 10, 56, "y"),
  rect(63, 19, 2, 5, "I"), rect(SW - 65, 19, 2, 5, "I"),
  shade([3, 30, SW - 6, 8], 1, 0.5),
  rect(6, 38, 6, 6, "w"), rect(SW - 12, 38, 6, 6, "w"))

// ---- room (wallpaper, no stand) ---------------------------------------------------------
const WW = 147, WH = 319
sprite("_book", { w: 3, h: 9 }, rect(0, 0, 3, 9, "c"), hline(0, 2, 3, "i"))
scene("room", { w: WW, h: WH, bg: "n" },
  // plaster wall with a darker band at the ceiling
  layer("wall", rect(0, 0, WW, 12, "m"), hline(0, 12, WW, "w"), rect(0, 13, WW, 2, "y")),
  // night window with moon and curtains
  layer("window",
    rect(20, 34, 48, 56, "w"), rect(23, 37, 42, 50, "j"), grad(23, 37, 42, 50, "jJ", "v", 0.5),
    circ(54, 48, 5, "i"), circ(56, 47, 4, "j"),
    px(30, 44, "i"), px(40, 60, "i"), px(35, 52, "s"), px(58, 70, "s"), px(28, 76, "i"),
    vline(43, 37, 50, "w"), hline(23, 61, 42, "w"),
    rect(14, 30, 60, 3, "Y"), rect(14, 33, 9, 62, "c"), rect(65, 33, 9, 62, "c"),
    vline(17, 33, 62, "e"), vline(68, 33, 62, "e"), rect(18, 90, 52, 3, "y")),
  // shelf with books and a pot plant
  layer("shelf",
    rect(92, 58, 44, 3, "Y"), hline(92, 61, 44, "w"),
    tile("_book", 95, 49, 5, 1, { rswap: [{}, { c: "J" }, { c: "Q" }, { c: "y" }] }),
    rect(118, 50, 9, 8, "c"), ellipse(122, 46, 6, 4, "G"), ellipse(121, 44, 3, 2, "g")),
  // wall lamp with a warm glow
  layer("lamp", rect(126, 96, 3, 8, "w"), poly([120, 94, 134, 94, 131, 88, 123, 88], "I"), hline(121, 94, 13, "L")),
  glow("IL", { r: 26, strength: 0.35, bands: 4 }),
  // wainscot panels behind the stand area
  layer("wainscot", rect(0, 230, WW, 60, "W"), hline(0, 229, WW, "Y"), hline(0, 230, WW, "y"),
    ...Array.from({ length: 7 }, (_, i) => box(4 + i * 20, 236, 18, 48, "w"))),
  // floor
  layer("floor", rect(0, 290, WW, 29, "y"), hline(0, 290, WW, "w"),
    ...Array.from({ length: 5 }, (_, i) => hline(0, 295 + i * 5, WW, "W")),
    ...[[14, 295], [60, 300], [101, 295], [37, 305], [120, 310], [80, 315]].map(([x, y]) => vline(x, y, 5, "W")),
    rect(30, 304, 87, 15, "c"), box(30, 304, 87, 15, "e")))
