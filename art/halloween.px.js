// Pidgy theme: Midnight Manor (Halloween). Art px = 2 pt (6 device px at 3x).
//   hw_room          wallpaper 220x478: Victorian parlour at midnight (no widgets)
//   hw_window        large widget 195x195, static: Gothic window onto a moonlit farm
//   hw_window_fx     240-frame transparent layer (30 s @ 8 fps): clouds, bats, windmill, wisps, barn light
//   hw_portrait      small widget 92x92, static: witch portrait in a gilded frame
//   hw_portrait_fx   240-frame transparent layer: eyes follow + blink, candle, spider
//   *_preview        static + fx composited, for looking at the animation
// Widget edges are object edges (window casing, picture frame) so the iOS rim reads as a bevel.
const TAU = Math.PI * 2
pal({
  // night interior
  k: "#0a0710", d: "#171021", D: "#231833", e: "#33234a", E: "#4a3466",
  // wood
  w: "#170e0b", W: "#2a1a13", v: "#432a1d", V: "#634029",
  // gilt
  y: "#3a2a10", Y: "#76561c", j: "#b48a2c", J: "#ecc96a",
  // flame / candle light
  f: "#d9641a", F: "#ffb03a", l: "#fff0b0", t: "#e8dcc0",
  // pumpkin
  o: "#9a3e14", O: "#e0701e",
  // witch green
  g: "#3d6b34", n: "#6a9e4c", N: "#9cc66e",
  // night sky
  s: "#05081a", S: "#0c1430", z: "#18264e", Z: "#2a3d70",
  // moon
  M: "#b8b294", m: "#ece6c8",
  // cloud / fog
  c: "#2a3350", C: "#46527a",
  // barn, field
  b: "#3a1010", B: "#6a1c1c", h: "#070d0a", H: "#0f1c14", q: "#1b2e20",
  // eye whites, wisp
  i: "#e8e6d0", I: "#e4c42a", u: "#7cffb0", U: "#d8ffe8",
  // potion glass, bone shadow, velvet highlight, raven sheen, crystal-ball glow
  r: "#6a1028", R: "#c8325a", p: "#1a3470", P: "#4a86d8", x: "#8f8468", A: "#9a2c34", Q: "#3c4468",
  G: "#7a4ac8", T: "#c8a8ff",
  // stone
  "1": "#22202c", "2": "#3a3846", "3": "#58566a", "4": "#7c7a90",
})
ramps("kdDeE", "wWvV", "yYjJ", "fFl", "oO", "gnN", "sSzZ", "Mm", "cC", "bBA", "hHq", "rR", "pP", "xti", "dQ", "GT", "1234")

const rr = (x0, y0, w, h, r) => (x, y) => {
  if (x < x0 || y < y0 || x >= x0 + w || y >= y0 + h) return false
  const cx = Math.min(Math.max(x + 0.5, x0 + r), x0 + w - r), cy = Math.min(Math.max(y + 0.5, y0 + r), y0 + h - r)
  return (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r
}

// ===================================================================== parts
// damask motif (repeats over the wall)
sprite("_damask", { w: 14, h: 18 }, (c) => {
  c.px(7, 1, "e"); c.vline(7, 2, 14, "e")
  c.ellipse(7, 7, 3, 4, "e", true); c.px(7, 7, "E")
  c.line(7, 11, 3, 14, "e"); c.line(7, 11, 11, 14, "e")
  c.px(2, 13, "e"); c.px(12, 13, "e"); c.px(4, 4, "e"); c.px(10, 4, "e")
})
sprite("_cobweb", { w: 22, h: 22 }, (c) => {
  for (let a = 0; a <= 4; a++) c.line(0, 0, Math.round(21 * Math.cos(a * Math.PI / 8)), Math.round(21 * Math.sin(a * Math.PI / 8)), "C")
  for (const r of [6, 11, 16]) for (let a = 0; a < 4; a++) {
    const p = [r * Math.cos(a * Math.PI / 8), r * Math.sin(a * Math.PI / 8)], q = [r * Math.cos((a + 1) * Math.PI / 8), r * Math.sin((a + 1) * Math.PI / 8)]
    c.line(Math.round(p[0]), Math.round(p[1]), Math.round(q[0] * 0.92), Math.round(q[1] * 0.92), "c")
  }
})
sprite("_candle", { w: 5, h: 14 }, rect(1, 4, 3, 10, "t"), px(2, 3, "k"), px(2, 1, "F"), px(2, 2, "f"), px(2, 0, "l"), px(3, 6, "i"))
sprite("_jack", { w: 18, h: 14, outline: "k" },
  ellipse(9, 8, 8, 5, "o"), ellipse(6, 8, 3, 5, "O"), ellipse(12, 8, 3, 5, "O"), rect(8, 1, 2, 3, "g"),
  poly([4, 6, 7, 6, 5, 9], "F"), poly([11, 6, 14, 6, 13, 9], "F"), poly([4, 10, 14, 10, 12, 12, 6, 12], "F"), px(8, 11, "o"), px(10, 11, "o"))
sprite("_book", { w: 4, h: 20 }, rect(0, 0, 4, 20, "B"), hline(0, 3, 4, "j"), hline(0, 16, 4, "j"))
sprite("_star_1", "i"); sprite("_star_2", "t"); sprite("_star_3", "Z")

// ===================================================================== room
// Light: chandelier (top right) + candles; everything else falls off into purple dark.
const RW = 220, RH = 478

// ---- furniture parts -------------------------------------------------------------------
// tapered candle with wax drips; h = wax height
const candle = (c, x, y, h, lit = true) => {
  c.rect(x, y, 3, h, "t"); c.vline(x + 2, y, h, "x"); c.px(x, y + 1, "i")
  c.px(x + 1, y + 2, "t"); c.px(x - 1, y + 2, "t"); c.px(x - 1, y + 3, "x"); c.px(x + 3, y + 1, "t"); c.vline(x + 3, y + 2, 2, "x")
  c.px(x + 1, y - 1, "k")
  if (lit) { c.px(x + 1, y - 2, "f"); c.px(x + 1, y - 3, "F"); c.px(x + 1, y - 4, "l"); c.px(x, y - 3, "f") }
}
// glass bottle: body ellipse/rect, neck, cork, highlight, liquid level
const bottle = (c, x, y, w, h, glass, liquid, shape) => {
  const cx = x + Math.floor(w / 2)
  if (shape === "flask") { c.ellipse(cx, y + h - w / 2, w / 2, w / 2, glass); c.ellipse(cx, y + h - w / 2 + 1, w / 2 - 1, w / 2 - 2, liquid) }
  else { c.rect(x, y + 4, w, h - 4, glass); c.rect(x + 1, y + Math.round(h * 0.45), w - 2, h - Math.round(h * 0.45) - 1, liquid) }
  c.rect(cx - 1, y, 2, 5, glass); c.rect(cx - 1, y - 2, 2, 2, "v")
  c.vline(x + 1, y + 5, Math.max(1, Math.round(h * 0.35)), "i")
}
const book = (c, x, y, w, h, col, band) => {
  c.rect(x, y, w, h, col); c.vline(x, y, h, "k"); c.vline(x + w - 1, y, h, "k")
  c.hline(x + 1, y + 2, w - 2, band); c.hline(x + 1, y + h - 3, w - 2, band)
  if (h > 12) c.rect(x + 1, y + Math.round(h / 2) - 1, w - 2, 2, "k")
}
const skull = (c, x, y) => {
  c.ellipse(x + 5, y + 4, 5, 4, "t"); c.rect(x + 2, y + 6, 7, 4, "t"); c.rect(x + 3, y + 10, 5, 2, "x")
  c.ellipse(x + 6, y + 3, 2, 2, "i"); c.vline(x + 9, y + 2, 7, "x")
  c.rect(x + 2, y + 5, 2, 2, "k"); c.rect(x + 6, y + 5, 2, 2, "k"); c.px(x + 5, y + 8, "k")
  c.px(x + 4, y + 10, "k"); c.px(x + 6, y + 10, "k")
}

sprite("_chandelier", { w: 66, h: 50 }, (c) => {
  // chain
  for (let y = 0; y < 14; y += 3) { c.px(32, y, "Y"); c.px(33, y + 1, "y"); c.px(32, y + 2, "j") }
  // stem with knobs
  c.rect(31, 14, 4, 18, "Y"); c.vline(31, 14, 18, "j"); c.vline(34, 14, 18, "y")
  c.ellipse(33, 17, 3, 2, "j"); c.ellipse(33, 25, 4, 2, "Y"); c.px(31, 24, "J")
  c.ellipse(33, 33, 6, 3, "Y"); c.ellipse(33, 32, 5, 1, "j"); c.ellipse(33, 38, 2, 2, "y")
  // scroll arms (mirrored) ending in cups
  for (const s of [-1, 1]) {
    for (const [len, up] of [[28, 10], [17, 4]]) {
      const ex = 33 + s * len
      c.line(33, 33, 33 + s * Math.round(len * 0.5), 35, "y")
      c.line(33 + s * Math.round(len * 0.5), 35, ex, 33 - up + 8, "y")
      c.px(33 + s * Math.round(len * 0.5), 36, "Y"); c.px(33 + s * Math.round(len * 0.5) + s, 37, "y")
      const cy = 33 - up + 7
      c.ellipse(ex, cy, 3, 1, "Y"); c.hline(ex - 2, cy - 1, 5, "j")
      candle(c, ex - 1, cy - 9, 8)
      // crystal drops
      c.px(ex, cy + 2, "Z"); c.px(ex, cy + 3, "i"); c.px(ex, cy + 4, "Z")
    }
  }
  candle(c, 32, 4, 9)
  for (const dx of [-8, -4, 4, 8]) { c.px(33 + dx, 41, "Z"); c.px(33 + dx, 42 + (Math.abs(dx) % 8 ? 1 : 0), "i") }
})

// fluted pilaster with capital and base (full wall height)
sprite("_pilaster", { w: 12, h: 300 }, (c) => {
  c.rect(0, 0, 12, 300, "W")
  c.rect(0, 0, 12, 8, "v"); c.hline(0, 0, 12, "V"); c.hline(0, 3, 12, "j"); c.hline(0, 7, 12, "w")
  c.px(2, 5, "V"); c.px(9, 5, "V"); c.rect(5, 4, 2, 3, "V")
  for (const x of [2, 5, 8]) { c.vline(x, 12, 274, "w"); c.vline(x + 1, 12, 274, "v") }
  c.vline(0, 8, 284, "V"); c.vline(11, 8, 284, "w")
  c.rect(0, 288, 12, 12, "v"); c.hline(0, 288, 12, "V"); c.hline(0, 293, 12, "w"); c.hline(0, 299, 12, "w")
})

// wall-mounted curio shelves (two tiers) full of oddities
sprite("_curio", { w: 98, h: 84 }, (c) => {
  const plank = (y) => {
    c.rect(0, y, 98, 4, "v"); c.hline(0, y, 98, "V"); c.hline(0, y + 3, 98, "w"); c.hline(1, y + 4, 96, "k")
    for (const bx of [6, 86]) {
      c.poly([bx, y + 4, bx + 6, y + 4, bx + 6, y + 6, bx + 3, y + 14, bx + 1, y + 14, bx + 2, y + 9, bx, y + 7], "W")
      c.px(bx + 4, y + 6, "v"); c.px(bx + 3, y + 8, "V"); c.px(bx + 2, y + 12, "w")
    }
  }
  // tier 1 (top): books, skull with candle, potions
  book(c, 4, 18, 5, 22, "A", "j"); book(c, 9, 20, 4, 20, "p", "j"); book(c, 13, 16, 6, 24, "g", "J")
  book(c, 19, 22, 4, 18, "e", "j"); c.poly([23, 40, 23, 24, 31, 38, 30, 40], "r"); c.line(23, 24, 31, 38, "k")
  skull(c, 34, 28); candle(c, 37, 20, 8)
  bottle(c, 50, 22, 7, 18, "Q", "R", "flask"); bottle(c, 59, 18, 5, 22, "Q", "N", "tall")
  bottle(c, 66, 28, 6, 12, "Q", "P", "tall"); bottle(c, 74, 24, 8, 16, "Q", "G", "flask")
  c.rect(84, 30, 9, 10, "Q"); c.rect(85, 33, 7, 6, "n"); c.circ(88, 35, 2, "i"); c.px(88, 35, "k"); c.rect(84, 28, 9, 2, "v")
  plank(40)
  // tier 2: raven on books, crystal ball, hourglass, candles
  book(c, 4, 70, 26, 5, "A", "j"); book(c, 6, 65, 22, 5, "e", "J"); book(c, 8, 61, 18, 4, "p", "j")
  c.ellipse(16, 55, 5, 5, "k"); c.ellipse(19, 50, 3, 3, "k"); c.poly([22, 49, 26, 51, 22, 51], "y"); c.px(20, 49, "I")
  c.poly([11, 54, 4, 62, 8, 61, 12, 58], "k"); c.line(14, 57, 18, 52, "Q"); c.px(13, 56, "Q"); c.vline(15, 60, 2, "y"); c.vline(18, 60, 2, "y")
  c.ellipse(46, 74, 7, 2, "Y"); c.rect(43, 70, 7, 4, "y"); c.hline(43, 70, 7, "j")
  c.circ(46, 62, 8, "G"); c.circ(44, 60, 5, "T"); c.circ(43, 58, 2, "i"); c.px(49, 66, "e"); c.px(50, 64, "e")
  c.rect(60, 56, 9, 2, "Y"); c.rect(60, 74, 9, 2, "Y"); c.vline(60, 58, 16, "y"); c.vline(68, 58, 16, "y")
  c.poly([62, 58, 67, 58, 65, 65, 64, 65], "i"); c.poly([64, 67, 65, 67, 67, 74, 62, 74], "i"); c.rect(63, 70, 3, 4, "x"); c.px(64, 66, "x")
  candle(c, 78, 62, 14); candle(c, 85, 66, 10); c.ellipse(83, 76, 8, 1, "x")
  plank(76)
})

// console table with carved apron and cabriole legs, plus its load
sprite("_console", { w: 196, h: 80 }, (c) => {
  const top = 40
  // top slab with moulded edge
  c.rect(0, top, 196, 6, "v"); c.hline(0, top, 196, "V"); c.hline(1, top + 1, 194, "J"); c.hline(0, top + 4, 196, "W"); c.hline(0, top + 5, 196, "w")
  // apron with drawers, scrolls and brass pulls
  c.rect(6, top + 6, 184, 14, "W"); c.hline(6, top + 19, 184, "w")
  for (const dx of [10, 74, 138]) {
    c.rect(dx, top + 8, 48, 9, "v"); c.box(dx, top + 8, 48, 9, "w"); c.hline(dx + 1, top + 9, 46, "V")
    c.ellipse(dx + 24, top + 12, 3, 2, "Y"); c.px(dx + 23, top + 11, "J"); c.px(dx + 24, top + 14, "y")
  }
  for (const x of [68, 132]) { c.vline(x, top + 7, 12, "w"); c.px(x - 1, top + 9, "V"); c.px(x + 1, top + 15, "v") }
  // scalloped skirt
  for (let x = 8; x < 188; x += 8) c.ellipse(x + 4, top + 20, 4, 2, "W")
  // cabriole legs (knee, slender ankle, pad foot)
  for (const lx of [8, 180]) {
    const s = lx < 98 ? 1 : -1
    c.poly([lx, top + 20, lx + 8, top + 20, lx + 7 + s * 2, top + 28, lx + 5, top + 36, lx + 4, top + 40, lx + 2, top + 40, lx + 2 - s, top + 30], "W")
    c.line(lx + 1, top + 21, lx + 2, top + 30, "v"); c.ellipse(lx + 3, top + 40, 3, 1, "w"); c.px(lx + 4, top + 23, "V")
  }
  // load: candelabra
  c.ellipse(24, top - 1, 6, 2, "Y"); c.vline(24, top - 18, 17, "Y"); c.vline(23, top - 18, 17, "j")
  c.line(24, top - 12, 16, top - 16, "Y"); c.line(24, top - 12, 32, top - 16, "Y"); c.line(16, top - 16, 16, top - 18, "Y"); c.line(32, top - 16, 32, top - 18, "Y")
  for (const x of [15, 23, 31]) { c.hline(x - 1, top - 19, 5, "j"); candle(c, x, top - 29 + (x === 23 ? -3 : 0), 10 + (x === 23 ? 3 : 0)) }
  // bracket clock at midnight
  c.rect(84, top - 26, 28, 26, "W"); c.box(84, top - 26, 28, 26, "w"); c.poly([82, top - 26, 114, top - 26, 106, top - 34, 90, top - 34], "v")
  c.hline(90, top - 34, 17, "V"); c.circ(98, top - 37, 2, "j"); c.vline(85, top - 25, 24, "V")
  c.circ(98, top - 14, 9, "t"); c.ring(98, top - 14, 9, "j"); c.ring(98, top - 14, 7, "x")
  for (let h = 0; h < 12; h++) c.px(98 + Math.round(8 * Math.sin(h * TAU / 12)), top - 14 - Math.round(8 * Math.cos(h * TAU / 12)), h % 3 ? "x" : "k")
  c.vline(98, top - 21, 7, "k"); c.vline(97, top - 19, 5, "k"); c.px(98, top - 14, "j")
  c.hline(86, top - 2, 24, "v")
  // stacked books, skull with candle
  book(c, 128, top - 6, 30, 6, "A", "j"); book(c, 130, top - 11, 26, 5, "p", "J"); book(c, 133, top - 15, 20, 4, "g", "j")
  skull(c, 138, top - 27); candle(c, 141, top - 33, 7)
  // potions and a jar of eyes
  bottle(c, 164, top - 18, 8, 18, "Q", "R", "flask"); bottle(c, 174, top - 22, 5, 22, "Q", "G", "tall"); bottle(c, 182, top - 12, 6, 12, "Q", "N", "tall")
  bottle(c, 56, top - 16, 7, 16, "Q", "P", "flask"); c.rect(66, top - 10, 9, 10, "Q"); c.rect(67, top - 7, 7, 6, "n"); c.px(69, top - 5, "i"); c.px(72, top - 3, "i"); c.rect(66, top - 12, 9, 2, "v")
})

// cauldron on embers
sprite("_cauldron", { w: 40, h: 34 }, (c) => {
  c.ellipse(20, 20, 17, 11, "k"); c.ellipse(15, 18, 9, 6, "d"); c.ellipse(12, 16, 3, 2, "Q")
  c.ellipse(20, 10, 16, 3, "d"); c.ellipse(20, 10, 13, 2, "n"); c.ellipse(19, 10, 9, 1, "N")
  for (const [x, y, r] of [[14, 9, 1], [24, 9, 2], [20, 7, 1], [28, 10, 1]]) c.circ(x, y, r, "N")
  c.px(24, 7, "U"); c.px(15, 6, "u"); c.px(22, 3, "u"); c.px(18, 1, "u")
  c.rect(4, 8, 3, 2, "x"); c.rect(33, 8, 3, 2, "x")
  for (const lx of [7, 31]) { c.line(lx, 28, lx - 2, 33, "k"); c.px(lx - 3, 33, "k") }
  c.hline(10, 32, 20, "W"); c.hline(12, 33, 16, "w"); c.px(14, 31, "f"); c.px(20, 31, "F"); c.px(25, 31, "f"); c.px(20, 30, "f")
})

// sitting black cat with rim light
sprite("_cat", { w: 22, h: 26 }, (c) => {
  c.ellipse(9, 18, 7, 7, "k"); c.ellipse(9, 7, 5, 5, "k")
  c.poly([4, 4, 5, 0, 7, 3], "k"); c.poly([11, 3, 13, 0, 14, 4], "k"); c.px(5, 2, "A"); c.px(13, 2, "A")
  c.rect(6, 6, 2, 2, "I"); c.rect(11, 6, 2, 2, "I"); c.px(7, 6, "k"); c.px(12, 6, "k")
  c.line(15, 23, 20, 20, "k", 2); c.line(20, 20, 20, 12, "k", 2); c.px(20, 11, "k")
  c.vline(16, 11, 12, "Q"); c.vline(14, 5, 5, "Q"); c.px(13, 4, "Q"); c.vline(21, 13, 6, "Q")
  c.hline(5, 25, 9, "k"); c.px(7, 25, "d")
})

// pumpkins: carved (lit), plain, gourd
sprite("_jack_big", { w: 26, h: 20, outline: "k" },
  ellipse(13, 11, 12, 8, "o"), ellipse(8, 11, 4, 8, "O"), ellipse(18, 11, 4, 8, "O"), ellipse(13, 11, 3, 8, "o"),
  rect(12, 1, 3, 3, "g"), px(15, 1, "n"), light([5, 5, 5, 6], 1, 0.5),
  poly([5, 8, 10, 8, 8, 11], "F"), poly([16, 8, 21, 8, 18, 11], "F"), poly([11, 11, 15, 11, 13, 13], "F"),
  poly([5, 14, 21, 14, 18, 17, 8, 17], "F"), rect(9, 14, 2, 2, "o"), rect(15, 14, 2, 2, "o"), rect(12, 16, 2, 1, "o"), px(7, 9, "l"), px(18, 9, "l"))
sprite("_pumpkin", { w: 16, h: 12, outline: "k" }, ellipse(8, 7, 7, 5, "o"), ellipse(5, 7, 3, 5, "O"), ellipse(11, 7, 2, 5, "O"), line(8, 1, 10, 0, "g"), px(4, 5, "O"))
sprite("_gourd", { w: 10, h: 14, outline: "k" }, ellipse(5, 10, 4, 3, "n"), ellipse(5, 5, 2, 3, "N"), px(5, 1, "g"), px(4, 9, "g"), px(6, 11, "g"))

// ---- room scene -----------------------------------------------------------------------------
scene("hw_room", { w: RW, h: RH, bg: "D" },
  // wall: damask in two tones with darker stripes between columns
  layer("damask", pattern("_damask", 0, 22, RW, 300), ...Array.from({ length: 16 }, (_, i) => vline(i * 14 + 13, 22, 300, "d"))),
  // cornice: dentils, gilt bead, egg-and-dart band
  layer("cornice",
    rect(0, 0, RW, 22, "W"), hline(0, 0, RW, "w"), hline(0, 2, RW, "V"), hline(0, 3, RW, "v"),
    ...Array.from({ length: 28 }, (_, i) => rect(2 + i * 8, 5, 5, 5, "v")), ...Array.from({ length: 28 }, (_, i) => hline(2 + i * 8, 5, 5, "V")),
    hline(0, 11, RW, "w"), hline(0, 12, RW, "j"), hline(0, 13, RW, "y"),
    ...Array.from({ length: 37 }, (_, i) => ellipse(3 + i * 6, 16, 2, 2, "v")), ...Array.from({ length: 37 }, (_, i) => px(6 + i * 6, 17, "w")),
    hline(0, 19, RW, "w"), hline(0, 20, RW, "V"), hline(0, 21, RW, "k")),
  layer("cobwebs", stamp("_cobweb", 12, 22), stamp("_cobweb", RW - 34, 22, { flip: "x" })),
  layer("pilasters", stamp("_pilaster", 0, 22), stamp("_pilaster", RW - 12, 22, { flip: "x" })),
  layer("chandelier", stamp("_chandelier", 128, 20)),
  layer("curio", stamp("_curio", 114, 64)),
  // wainscot with raised panels
  layer("wainscot", rect(0, 322, RW, 88, "W"),
    hline(0, 322, RW, "j"), hline(0, 323, RW, "V"), hline(0, 324, RW, "v"), hline(0, 327, RW, "w"),
    ...Array.from({ length: 7 }, (_, i) => [box(6 + i * 30, 334, 26, 66, "w"), hline(7 + i * 30, 335, 24, "V"), vline(7 + i * 30, 335, 64, "v"),
      rect(10 + i * 30, 338, 18, 58, "v"), hline(10 + i * 30, 338, 18, "V"), vline(27 + i * 30, 338, 58, "w")]).flat()),
  layer("console", stamp("_console", 12, 326)),
  // floor planks with staggered joints and candle sheen
  layer("floor", rect(0, 406, RW, 72, "W"), hline(0, 406, RW, "k"), hline(0, 407, RW, "w"),
    ...Array.from({ length: 10 }, (_, i) => hline(0, 413 + i * 7, RW, "w")),
    ...Array.from({ length: 10 }, (_, i) => Array.from({ length: 5 }, (_, j) => vline((j * 47 + i * 19) % RW, 413 + i * 7 - 6, 6, "w"))).flat()),
  layer("sheen", { light: true, density: 0.25 }, ellipse(110, 418, 80, 6, "V")),
  // rug: border with diamonds, medallion, fringe
  layer("rug", rect(40, 430, 140, 42, "b"), box(40, 430, 140, 42, "k"), box(43, 433, 134, 36, "j"), rect(45, 435, 130, 32, "B"),
    ...Array.from({ length: 16 }, (_, i) => poly([48 + i * 8, 431, 51 + i * 8, 428 + 3, 48 + i * 8, 433, 45 + i * 8, 431], "j")),
    ellipse(110, 451, 26, 11, "b"), ellipse(110, 451, 22, 9, "A"), ellipse(110, 451, 12, 5, "b"), poly([110, 444, 116, 451, 110, 458, 104, 451], "j"),
    ...[[60, 444], [160, 444], [60, 458], [160, 458]].map(([x, y]) => poly([x, y - 3, x + 3, y, x, y + 3, x - 3, y], "A")),
    ...Array.from({ length: 23 }, (_, i) => vline(42 + i * 6, 472, 3, "t"))),
  // floor props
  layer("props", stamp("_cauldron", 22, 424), stamp("_jack_big", 160, 412), stamp("_pumpkin", 186, 422), stamp("_gourd", 152, 424),
    stamp("_cat", 120, 440), stamp("_pumpkin", 70, 466), stamp("_jack_big", 2, 452)),
  // light falloff: darker towards the floor corners and wall edges, warm pools near candles
  glow("Fl", { r: 10, strength: 0.32, bands: 3 }),
  glow("T", { r: 8, strength: 0.35, bands: 3 }))

// ===================================================================== window (MEDIUM widget, 195x92)
// Three pointed lancets with stained-glass tips, carved stone-like mullion columns, a sill with
// candles; one continuous moonlit farm behind the glass. Its casing is the widget edge.
const WW2 = 195, WH2 = 92, WCR = 13
const LANCETS = [39, 97, 155], LHW = 24, ARCH_BASE = 24, ARCH_H = 14, VIEW_BOTTOM = 72
const archY = (x, cx) => ARCH_BASE - ARCH_H * Math.pow(Math.max(0, 1 - Math.abs(x + 0.5 - cx) / LHW), 0.55)
const lancetOf = (x) => LANCETS.find((cx) => Math.abs(x + 0.5 - cx) < LHW)
const inLancet = (x, y) => { const cx = lancetOf(x); return cx !== undefined && y >= archY(x, cx) && y < VIEW_BOTTOM }
const inStained = (x, y) => inLancet(x, y) && y < ARCH_BASE
const inView = (x, y) => inLancet(x, y) && y >= ARCH_BASE + 3
const HZ = 56                                          // horizon

sprite("_tomb", { w: 7, h: 9, outline: "k" }, rect(1, 3, 5, 6, "C"), ellipse(3, 3, 2, 2, "C"), vline(3, 2, 4, "c"), hline(2, 4, 3, "c"), px(1, 3, "Z"))
sprite("_crow", { w: 6, h: 4 }, rect(1, 1, 3, 2, "k"), px(4, 0, "k"), px(5, 0, "y"), px(0, 2, "k"), px(2, 3, "k"))
sprite("_hay", { w: 12, h: 8, outline: "k" }, ellipse(6, 5, 5, 3, "Y"), ellipse(5, 4, 3, 2, "j"), px(3, 3, "J"), px(8, 6, "y"))
sprite("_pine", { w: 7, h: 14 }, poly([3, 0, 6, 13, 0, 13], "h"), hline(1, 9, 5, "q"))

function farm(AB = ARCH_BASE, H = HZ, VB = VIEW_BOTTOM) {
  return [
    grad(0, AB, WW2, H - AB, "sSzZ", "v", 0.5),
    scatter("_star_*", 14, AB + 2, 168, H - AB - 10, Math.round(40 * (H - AB) / 32), {}),
    circ(155, AB + 14, 8, "m"), circ(152, AB + 12, 2, "M"), circ(158, AB + 17, 2, "M"), px(156, AB + 11, "M"),
    // far forest line and hills
    ...Array.from({ length: 26 }, (_, i) => stamp("_pine", 12 + i * 7 + (i % 3), H - 13 + (i % 2) * 2)),
    poly([0, H, 40, H - 3, 90, H, 140, H - 4, WW2, H - 1, WW2, VB, 0, VB], "h"),
    poly([0, H + 5, 70, H + 3, 130, H + 6, WW2, H + 3, WW2, VB, 0, VB], "H"),
    ...Array.from({ length: 3 }, (_, i) => hline(0, H + 8 + i * 3, WW2, "q")),
    // path to the barn
    poly([97, VB, 104, VB, 101, H + 6, 99, H + 6], "x"),
    // farmhouse + barn
    poly([84, H + 7, 84, H - 4, 96, H - 12, 108, H - 4, 108, H + 7], "b"), poly([86, H - 4, 96, H - 10, 106, H - 4], "B"),
    rect(93, H + 1, 6, 6, "k"), line(93, H + 1, 98, H + 6, "B"), line(98, H + 1, 93, H + 6, "B"),
    rect(94, H - 7, 4, 3, "F"), vline(96, H - 7, 3, "k"),
    poly([110, H + 7, 110, H - 1, 118, H - 6, 126, H - 1, 126, H + 7], "k"), rect(114, H + 1, 3, 3, "f"), rect(119, H + 1, 3, 3, "F"),
    rect(122, H - 9, 2, 4, "k"),
    // windmill tower (blades animated)
    poly([139, H + 7, 141, H - 9, 145, H - 9, 147, H + 7], "k"), line(141, H + 4, 146, H - 5, "c"), rect(140, H - 12, 6, 3, "k"),
    // graveyard (left pane), dead tree
    stamp("_tomb", 22, H + 2), stamp("_tomb", 34, H + 4), stamp("_tomb", 46, H + 1), stamp("_tomb", 56, H + 5),
    vline(29, H + 3, 6, "k"), hline(27, H + 5, 5, "k"),
    line(16, VB, 19, H - 14, "k", 2), line(18, H - 4, 10, H - 14, "k"), line(18, H - 9, 26, H - 18, "k"), line(15, H - 12, 12, H - 17, "k"),
    // fence with crows, haystacks, scarecrow, pumpkins
    hline(60, H + 9, 120, "k"), hline(60, H + 12, 120, "k"), ...Array.from({ length: 11 }, (_, i) => vline(62 + i * 11, H + 7, 8, "k")),
    stamp("_crow", 73, H + 5), stamp("_crow", 128, H + 5, { flip: "x" }), stamp("_crow", 161, H + 5),
    stamp("_hay", 150, H + 6), stamp("_hay", 162, H + 8),
    vline(80, H - 1, 12, "k"), hline(75, H + 2, 11, "W"), circ(80, H - 2, 2, "v"), poly([77, H - 4, 83, H - 4, 81, H - 7, 79, H - 7], "k"), rect(78, H + 2, 5, 5, "b"),
    stamp("_pumpkin", 40, VB - 7), stamp("_pumpkin", 116, VB - 6), stamp("_jack_big", 170, VB - 11),
  ]
}

// stained glass: sectors around a trefoil in each lancet tip, lead lines between
const stainedGlass = (c) => {
  const cols = ["R", "G", "F", "n", "P", "E"]
  for (let y = 0; y < ARCH_BASE; y++) for (let x = 0; x < WW2; x++) {
    if (!inStained(x, y)) continue
    const cx = lancetOf(x), a = Math.atan2(y - (ARCH_BASE - 2), x + 0.5 - cx), sector = Math.floor(((a + Math.PI) / Math.PI) * 6)
    c.px(x, y, cols[(sector + LANCETS.indexOf(cx)) % cols.length])
  }
  for (const cx of LANCETS) {
    for (let k = 1; k < 6; k++) { const a = Math.PI + (k * Math.PI) / 6; c.line(cx, ARCH_BASE - 2, Math.round(cx + Math.cos(a) * 26), Math.round(ARCH_BASE - 2 + Math.sin(a) * 26), "k") }
    c.circ(cx, ARCH_BASE - 5, 4, "F"); c.ring(cx, ARCH_BASE - 5, 4, "k"); c.circ(cx, ARCH_BASE - 5, 1, "l")
    for (const [dx, dy] of [[-3, -2], [3, -2], [0, -6]]) c.px(cx + dx, ARCH_BASE - 5 + dy, "k")
  }
}

scene("hw_window", { w: WW2, h: WH2 },
  layer("casing", clip(rr(0, 0, WW2, WH2 + 2 * WCR, WCR), rect(0, 0, WW2, WH2, "W"),
    // cornice with rosettes and a skull keystone
    hline(0, 0, WW2, "w"), hline(0, 1, WW2, "V"), hline(0, 2, WW2, "v"), hline(0, 6, WW2, "w"),
    ...Array.from({ length: 12 }, (_, i) => [circ(9 + i * 16, 4, 1, "V"), px(9 + i * 16, 4, "j")]).flat(),
    // carved recess around each lancet
    (c) => { for (let x = 0; x < WW2; x++) { const cx = lancetOf(x); if (cx === undefined) continue
      const t = Math.round(archY(x, cx)); c.px(x, t - 1, "w"); c.px(x, t - 2, "V"); c.px(x, t - 3, "v") } },
    ...LANCETS.map((cx) => [vline(cx - LHW - 1, ARCH_BASE, VIEW_BOTTOM - ARCH_BASE, "V"), vline(cx + LHW, ARCH_BASE, VIEW_BOTTOM - ARCH_BASE, "w")]).flat())),
  layer("view", clip(inView, ...farm())),
  glow("m", { r: 6, strength: 0.3, bands: 3, where: inView }),
  glow("F", { r: 3, strength: 0.3, bands: 2, where: inView }),
  layer("stained", clip(inStained, stainedGlass)),
  layer("transom", ...LANCETS.map((cx) => [rect(cx - LHW, ARCH_BASE, 2 * LHW, 3, "w"), hline(cx - LHW, ARCH_BASE, 2 * LHW, "V")]).flat()),
  // twisted columns between lancets with capitals and bases
  layer("columns", ...[63, 121].map((x0) => [
    rect(x0, 12, 10, VIEW_BOTTOM - 12, "v"),
    (c) => { for (let y = 16; y < VIEW_BOTTOM - 4; y++) { const t = (y * 2) % 8; c.px(x0 + 2 + (t >> 1), y, "V"); c.px(x0 + 3 + (t >> 1), y, "j"); c.px(x0 + 7 - (t >> 1), y, "w") } },
    rect(x0 - 1, 12, 12, 4, "V"), hline(x0 - 1, 12, 12, "J"), hline(x0 - 1, 15, 12, "w"),
    rect(x0 - 1, VIEW_BOTTOM - 4, 12, 4, "V"), hline(x0 - 1, VIEW_BOTTOM - 4, 12, "j")]).flat()),
  layer("glassglint", { light: true, density: 0.3 }, clip(inView, ...LANCETS.map((cx) => poly([cx - 18, 30, cx - 14, 28, cx - 20, 50, cx - 22, 50], "Z")))),
  // ivy creeping over the right of the casing
  layer("ivy", (c) => {
    for (let i = 0; i < 40; i++) { const x = 190 - i * 2, y = 4 + Math.round(Math.sin(i * 0.5) * 2) + (i > 20 ? (i - 20) : 0)
      c.px(x, y, "g"); if (i % 3 === 0) { c.px(x - 1, y - 1, "n"); c.px(x, y - 1, "N"); c.px(x + 1, y - 1, "n") } }
  }),
  // sill: moulded ledge, candles with wax pools, cobweb
  layer("sill",
    rect(0, VIEW_BOTTOM, WW2, WH2 - VIEW_BOTTOM, "v"), hline(0, VIEW_BOTTOM, WW2, "J"), hline(0, VIEW_BOTTOM + 1, WW2, "V"),
    hline(0, VIEW_BOTTOM + 4, WW2, "w"), rect(0, VIEW_BOTTOM + 5, WW2, WH2 - VIEW_BOTTOM - 5, "W"), hline(0, WH2 - 1, WW2, "w"),
    ...Array.from({ length: 12 }, (_, i) => rect(6 + i * 16, VIEW_BOTTOM + 8, 8, 6, "v")),
    (c) => { candle(c, 20, VIEW_BOTTOM - 10, 10); candle(c, 26, VIEW_BOTTOM - 6, 6); c.ellipse(24, VIEW_BOTTOM, 7, 1, "t")
             candle(c, 176, VIEW_BOTTOM - 8, 8); c.ellipse(177, VIEW_BOTTOM, 4, 1, "t") },
    stamp("_cobweb", 4, 8)),
  glow("Fl", { r: 7, strength: 0.32, bands: 3, where: (x, y) => !inView(x, y) }))

// --- window animation (clipped to the clear glass) ---
const bat = (c, x, y, flap) => {
  x = Math.round(x); y = Math.round(y)
  c.rect(x - 1, y, 2, 2, "k")
  if (flap) { c.line(x - 1, y, x - 4, y - 2, "k"); c.line(x + 1, y, x + 4, y - 2, "k") }
  else { c.line(x - 1, y + 1, x - 4, y + 2, "k"); c.line(x + 1, y + 1, x + 4, y + 2, "k") }
}
const cloud = (c, x, y, w) => {
  x = Math.round(x)
  c.ellipse(x, y, w, 2, "c"); c.ellipse(x - w / 2, y - 1, w / 2, 2, "c"); c.ellipse(x + w / 3, y - 2, w / 2.5, 2, "C")
}
// the farm's moving things, for a view whose sky starts at AB and horizon is H
const farmFx = (c, AB, H) => {
    const p = c.phase, f = c.frame
    cloud(c, -30 + ((p + 0.2) % 1) * 255, AB + 10, 13)
    cloud(c, -30 + ((p * 2 + 0.65) % 1) * 255, AB + 18, 9)
    // windmill blades
    for (let b = 0; b < 4; b++) {
      const a = p * TAU * 2 + b * TAU / 4
      c.line(143, H - 11, Math.round(143 + Math.cos(a) * 11), Math.round(H - 11 + Math.sin(a) * 11), "k", 2)
    }
    c.px(143, H - 11, "v")
    // bats
    for (let i = 0; i < 3; i++) {
      const q = (p * (i + 1) + i * 0.37) % 1
      bat(c, -6 + q * 207, AB + 8 + i * 6 + Math.sin(q * TAU * 3) * 3, (f + i) % 2 === 0)
    }
    // ghost drifting over the graves
    const gx = Math.round(40 + Math.sin(p * TAU) * 16), gy = Math.round(H - 4 + Math.sin(p * TAU * 3) * 2)
    c.ellipse(gx, gy, 3, 3, "i"); c.rect(gx - 3, gy, 7, 4, "i")
    for (let k = 0; k < 7; k += 2) c.px(gx - 3 + k, gy + 4 + ((k + f) % 2), "i")
    c.px(gx - 1, gy - 1, "k"); c.px(gx + 1, gy - 1, "k"); c.px(gx, gy + 1, "C")
    // flickering farmhouse window + wisps
    const fl = [0, 1, 1, 0, 1, 2, 1, 1][f % 8]
    if (fl === 0) c.rect(94, H - 7, 2, 3, "f")
    if (fl === 2) c.rect(94, H - 7, 2, 2, "l")
    for (let i = 0; i < 2; i++) {
      const x = Math.round(120 + i * 30 + Math.sin((p + i * 0.4) * TAU) * 10), y = Math.round(H + 9 + Math.sin((p * 3 + i) * TAU) * 2)
      c.px(x, y, "U"); c.px(x - 1, y, "u"); c.px(x + 1, y, "u"); c.px(x, y - 1, "u")
    }
}
anim("hw_window_fx", { w: WW2, h: WH2, frames: 240, fps: 8 }, clip(inView, (c) => farmFx(c, ARCH_BASE, HZ)))

// ===================================================================== tall library window (LARGE widget, 195x195)
// A pointed Gothic arch: a stained-glass rose in the head, two clear lancets below looking out
// on the same animated farm, a deep carved casing and a sill. The casing is the widget edge.
const TS = 195, T_X0 = 22, T_X1 = 173, T_CX = 97.5, T_HW = 75.5, T_APEX = 10, T_SPRING = 84, T_SILL = 170
const T_GLASS = 90                                     // clear glass starts below the transom
const tArch = (x) => {                                 // pointed arch: two arcs meeting at the apex
  const t = Math.abs(x + 0.5 - T_CX) / T_HW
  return T_SPRING - (T_SPRING - T_APEX) * Math.sqrt(Math.max(0, 1 - t * t)) * (1 - 0.35 * t)
}
const inTOpen = (x, y) => x >= T_X0 && x < T_X1 && y < T_SILL && y >= tArch(x)
const onTMullion = (x, y) => Math.abs(x + 0.5 - T_CX) < 3 && y >= T_SPRING - 10
const inTStained = (x, y) => inTOpen(x, y) && y < T_GLASS - 3
const inTView = (x, y) => inTOpen(x, y) && y >= T_GLASS && !onTMullion(x, y)
const ROSE_X = 97, ROSE_Y = 48, ROSE_R = 22

const roseWindow = (c) => {
  const cols = ["R", "G", "F", "P", "n", "E", "R", "F", "G", "P", "n", "E"]
  for (let y = 0; y < T_GLASS; y++) for (let x = 0; x < TS; x++) {
    if (!inTStained(x, y)) continue
    const dx = x + 0.5 - ROSE_X, dy = y + 0.5 - ROSE_Y, r = Math.hypot(dx, dy)
    if (r < ROSE_R) {
      const sector = Math.floor(((Math.atan2(dy, dx) + Math.PI) / TAU) * 12)
      c.px(x, y, r < 6 ? "F" : r < 9 ? "l" : cols[sector])
    } else {
      // leaded diamond lattice in deep blues and purples around the rose
      const u = Math.floor((x + y) / 6), v = Math.floor((x - y + 200) / 6)
      c.px(x, y, (u + v) % 3 === 0 ? "p" : (u + v) % 3 === 1 ? "D" : "e")
      if ((x + y) % 6 === 0 || (x - y + 200) % 6 === 0) c.px(x, y, "k")
    }
  }
  c.ring(ROSE_X, ROSE_Y, ROSE_R, "k"); c.ring(ROSE_X, ROSE_Y, ROSE_R + 1, "V"); c.ring(ROSE_X, ROSE_Y, 9, "k")
  for (let k = 0; k < 12; k++) { const a = k * TAU / 12; c.line(Math.round(ROSE_X + Math.cos(a) * 9), Math.round(ROSE_Y + Math.sin(a) * 9), Math.round(ROSE_X + Math.cos(a) * ROSE_R), Math.round(ROSE_Y + Math.sin(a) * ROSE_R), "k") }
}

scene("hw_window_tall", { w: TS, h: TS },
  layer("casing", clip(rr(0, 0, TS, TS + 2 * WCR, WCR), rect(0, 0, TS, TS, "W"),
    hline(0, 0, TS, "w"), hline(0, 1, TS, "V"), hline(0, 2, TS, "v"),
    // carved arch mouldings following the opening, three steps deep
    (c) => { for (let x = T_X0 - 8; x < T_X1 + 8; x++) {
      const xx = Math.min(Math.max(x, T_X0), T_X1 - 1), t = Math.round(tArch(xx))
      c.px(x, t - 1, "w"); c.px(x, t - 2, "V"); c.px(x, t - 3, "j"); c.px(x, t - 5, "v"); c.px(x, t - 7, "V"); c.px(x, t - 8, "w") } },
    vline(T_X0 - 1, T_SPRING - 30, T_SILL - T_SPRING + 30, "w"), vline(T_X0 - 3, T_SPRING - 30, T_SILL - T_SPRING + 30, "j"), vline(T_X0 - 5, T_SPRING - 30, T_SILL - T_SPRING + 30, "V"),
    vline(T_X1, T_SPRING - 30, T_SILL - T_SPRING + 30, "w"), vline(T_X1 + 2, T_SPRING - 30, T_SILL - T_SPRING + 30, "v"), vline(T_X1 + 4, T_SPRING - 30, T_SILL - T_SPRING + 30, "w"),
    // corner rosettes and a carved skull keystone
    circ(9, 10, 5, "v"), circ(9, 10, 3, "j"), px(8, 9, "J"), circ(TS - 10, 10, 5, "v"), circ(TS - 10, 10, 3, "j"), px(TS - 11, 9, "J"),
    ...[9, TS - 10].map((x) => [vline(x, 20, 140, "v"), vline(x + 1, 20, 140, "w"), ...[40, 70, 100, 130].map((y) => circ(x, y, 2, "V"))]).flat())),
  layer("view", clip(inTView, ...farm(T_GLASS, 140, T_SILL))),
  glow("m", { r: 7, strength: 0.3, bands: 3, where: inTView }),
  glow("F", { r: 3, strength: 0.3, bands: 2, where: inTView }),
  layer("rose", clip(inTStained, roseWindow)),
  layer("transom", clip(inTOpen, rect(0, T_GLASS - 3, TS, 3, "w"), hline(0, T_GLASS - 3, TS, "V"))),
  // central mullion with capital, and two lancet heads
  layer("mullion", rect(Math.round(T_CX) - 3, T_SPRING - 10, 6, T_SILL - T_SPRING + 10, "v"), vline(Math.round(T_CX) - 3, T_SPRING - 10, T_SILL - T_SPRING + 10, "V"),
    vline(Math.round(T_CX) + 2, T_SPRING - 10, T_SILL - T_SPRING + 10, "w"), rect(Math.round(T_CX) - 5, T_GLASS - 1, 10, 3, "V"), hline(Math.round(T_CX) - 5, T_GLASS - 1, 10, "J"),
    (c) => { for (const cx of [60, 135]) for (let x = cx - 37; x < cx + 37; x++) {
      const t = Math.abs(x + 0.5 - cx) / 37, y = Math.round(T_GLASS + 12 * (1 - Math.sqrt(Math.max(0, 1 - (1 - t) * (1 - t)))))
      if (inTOpen(x, y)) { c.px(x, y, "w"); c.px(x, y - 1, "V") } } }),
  layer("glassglint", { light: true, density: 0.3 }, clip(inTView, poly([34, 100, 40, 96, 30, 140, 27, 140], "Z"), poly([112, 100, 117, 96, 108, 136, 105, 136], "Z"))),
  layer("ivy", (c) => {
    for (let i = 0; i < 40; i++) { const x = 190 - Math.round(i * 1.2), y = 3 + Math.round(Math.sin(i * 0.45) * 2)
      c.px(x, y, "g"); if (i % 3 === 0) { c.px(x - 1, y - 1, "n"); c.px(x, y - 1, "N"); c.px(x + 1, y - 1, "n") } }
  }),
  layer("sill",
    rect(0, T_SILL, TS, TS - T_SILL, "v"), hline(0, T_SILL, TS, "J"), hline(0, T_SILL + 1, TS, "V"), hline(0, T_SILL + 4, TS, "w"),
    rect(0, T_SILL + 5, TS, TS - T_SILL - 5, "W"), hline(0, TS - 1, TS, "w"),
    ...Array.from({ length: 12 }, (_, i) => rect(6 + i * 16, T_SILL + 9, 8, 8, "v")),
    (c) => { candle(c, 30, T_SILL - 12, 12); candle(c, 37, T_SILL - 7, 7); c.ellipse(34, T_SILL, 7, 1, "t")
             candle(c, 160, T_SILL - 9, 9); c.ellipse(161, T_SILL, 4, 1, "t") },
    stamp("_jack_big", 120, T_SILL - 16), stamp("_cobweb", 3, 18)),
  glow("Fl", { r: 7, strength: 0.32, bands: 3, where: (x, y) => !inTView(x, y) }))

anim("hw_window_tall_fx", { w: TS, h: TS, frames: 240, fps: 8 }, clip(inTView, (c) => farmFx(c, T_GLASS, 140)))

// ===================================================================== library wall (Haunted wallpaper)
// A frontal wall of bookshelves from floor to ceiling, so a window or a frame placed anywhere
// sits among the shelves. Ceiling beams with a chandelier on top, a floor with a rug below.
// The app pastes the window seat under the Large window and the hanging wire above the frame.
const RW2 = 220, RH2 = 478, SHELF_TOP = 40, FLOOR2 = 404
const BAY = 44                                        // bookcase bay width (5 bays)
sprite("hw_window_seat", { w: 205, h: 52 }, (c) => {
  // cushioned window seat with drawers, candles, a stack of books and a sleeping cat
  c.rect(0, 10, 205, 42, "W"); c.hline(0, 10, 205, "V"); c.hline(0, 11, 205, "v")
  for (let i = 0; i < 4; i++) { const x = 6 + i * 50; c.rect(x, 22, 44, 24, "v"); c.box(x, 22, 44, 24, "w"); c.hline(x + 1, 23, 42, "V"); c.ellipse(x + 22, 34, 3, 2, "Y"); c.px(x + 21, 33, "J") }
  c.rect(2, 2, 201, 9, "b"); c.hline(2, 2, 201, "A"); c.hline(2, 10, 201, "r")
  for (let x = 8; x < 200; x += 16) { c.px(x, 6, "r"); c.px(x + 1, 6, "A") }
  c.ellipse(30, 0, 14, 4, "A"); c.ellipse(28, -1, 10, 2, "R"); c.ellipse(170, 0, 14, 4, "p"); c.ellipse(168, -1, 10, 2, "P")
  for (const [x, w, col] of [[90, 26, "A"], [92, 22, "g"], [95, 18, "p"]]) { const y = [0, -3, -6][[90, 92, 95].indexOf(x)]; c.rect(x, y, w, 3, col); c.hline(x, y, w, "j") }
  c.ellipse(132, -1, 8, 4, "k"); c.ellipse(127, -3, 3, 3, "k"); c.px(125, -6, "k"); c.px(128, -6, "k"); c.line(140, 0, 145, -2, "k")
}, lamp(60, -10, { r: 40, color: "#ffb35c", power: 0.6 }))

sprite("hw_frame_hanger", { w: 60, h: 22 }, (c) => {
  // brass nail with a hanging wire to the frame's two eyelets
  c.circ(30, 3, 2, "Y"); c.px(29, 2, "J"); c.px(30, 5, "y")
  c.line(30, 4, 6, 21, "x"); c.line(30, 4, 54, 21, "x"); c.line(30, 5, 7, 21, "t")
})

scene("hw_library2", { w: RW2, h: RH2, bg: "k" },
  // ceiling: beams and boards
  layer("ceiling", rect(0, 0, RW2, SHELF_TOP, "w"), ...Array.from({ length: 12 }, (_, i) => vline(i * 20 + 6, 0, SHELF_TOP, "1")),
    rect(0, 10, RW2, 7, "W"), hline(0, 10, RW2, "v"), hline(0, 17, RW2, "k"), rect(0, 28, RW2, 6, "W"), hline(0, 28, RW2, "v"), hline(0, 34, RW2, "k"),
    rect(0, SHELF_TOP - 4, RW2, 4, "V"), hline(0, SHELF_TOP - 4, RW2, "j"), hline(0, SHELF_TOP - 1, RW2, "k")),
  // bookcases: bays with uprights, shelves every 34 px, books of varied height and colour
  layer("cases", (c) => {
    c.rect(0, SHELF_TOP, RW2, FLOOR2 - SHELF_TOP, "w")
    let i = 0
    for (let y = SHELF_TOP + 4; y < FLOOR2 - 30; y += 34) {
      for (let x = 0; x < RW2;) {
        if (x % BAY < 5) { x++; continue }
        const bw = 2 + Math.floor(rnd(i) * 4), bh = 18 + Math.floor(rnd(i + 999) * 12)
        if (rnd(i + 77) < 0.07) { x += 6; i++; continue }               // gap
        const col = BOOKS[Math.floor(rnd(i * 3 + 1) * BOOKS.length)], lean = rnd(i + 55) < 0.05
        if (lean) c.poly([x, y + 30, x + bw, y + 30, x + bw + 6, y + 30 - bh, x + 6, y + 30 - bh], col)
        else { c.rect(x, y + 30 - bh, bw, bh, col); c.vline(x + bw - 1, y + 30 - bh, bh, "k"); if (bw >= 3) { c.hline(x, y + 30 - bh + 3, bw, "j"); c.hline(x, y + 26, bw, "j") } }
        x += bw + (lean ? 6 : 0); i++
      }
      c.rect(0, y + 30, RW2, 4, "v"); c.hline(0, y + 30, RW2, "V"); c.hline(0, y + 33, RW2, "k")
    }
    for (let x = 0; x < RW2; x += BAY) { c.rect(x, SHELF_TOP, 5, FLOOR2 - SHELF_TOP, "W"); c.vline(x, SHELF_TOP, FLOOR2 - SHELF_TOP, "V"); c.vline(x + 4, SHELF_TOP, FLOOR2 - SHELF_TOP, "k")
      for (let y = SHELF_TOP + 20; y < FLOOR2; y += 34) c.circ(x + 2, y, 1, "j") }
  }),
  // curios between the books: skulls, potions, candles, an hourglass, a crystal ball
  layer("curios", (c) => {
    skull(c, 60, SHELF_TOP + 20); candle(c, 74, SHELF_TOP + 14, 18)
    bottle(c, 150, SHELF_TOP + 54, 7, 18, "Q", "R", "flask"); bottle(c, 160, SHELF_TOP + 50, 5, 22, "Q", "N", "tall")
    c.circ(30, SHELF_TOP + 130, 7, "G"); c.circ(28, SHELF_TOP + 128, 3, "T"); c.rect(26, SHELF_TOP + 136, 9, 2, "Y")
    skull(c, 186, SHELF_TOP + 156); candle(c, 200, SHELF_TOP + 150, 14)
    c.rect(110, SHELF_TOP + 210, 7, 2, "Y"); c.rect(110, SHELF_TOP + 222, 7, 2, "Y"); c.poly([111, SHELF_TOP + 212, 116, SHELF_TOP + 212, 114, SHELF_TOP + 217, 113, SHELF_TOP + 217], "i"); c.poly([113, SHELF_TOP + 218, 114, SHELF_TOP + 218, 116, SHELF_TOP + 222, 111, SHELF_TOP + 222], "i")
    candle(c, 50, SHELF_TOP + 282, 12); skull(c, 160, SHELF_TOP + 290); bottle(c, 176, SHELF_TOP + 288, 6, 16, "Q", "G", "flask")
    // more candles along the shelves so the whole wall is warmly lit
    for (const [x, y] of [[140, SHELF_TOP + 82], [20, SHELF_TOP + 218], [196, SHELF_TOP + 252], [96, SHELF_TOP + 150], [120, SHELF_TOP + 320], [176, SHELF_TOP + 14]]) candle(c, x, y, 10)
    for (const [x, y] of [[74, SHELF_TOP + 13], [200, SHELF_TOP + 149], [50, SHELF_TOP + 281], [141, SHELF_TOP + 81], [21, SHELF_TOP + 217],
                          [197, SHELF_TOP + 251], [97, SHELF_TOP + 149], [121, SHELF_TOP + 319], [177, SHELF_TOP + 13]])
      c.lamp(x + 1, y, { r: 58, color: "#ffb35c", power: 0.85 })
  }),
  layer("webs", stamp("_cobweb", 5, SHELF_TOP), stamp("_cobweb", RW2 - 27, SHELF_TOP, { flip: "x" }), stamp("_cobweb", 93, SHELF_TOP + 34)),
  // chandelier hanging from the beam
  layer("chandelier", (c) => {
    c.vline(110, 17, 6, "1"); c.ellipse(110, 26, 18, 3, "2"); c.ellipse(110, 26, 16, 2, "1")
    for (let k = 0; k < 7; k++) { const x = Math.round(110 + Math.cos(k * TAU / 7) * 16), y = Math.round(26 + Math.sin(k * TAU / 7) * 2)
      c.rect(x, y - 6, 2, 6, "t"); c.px(x, y - 7, "F"); c.px(x, y - 8, "l"); if (k % 2 === 0) c.lamp(x, y - 8, { r: 70, color: "#ffc070", power: 0.8 }) }
  }),
  layer("bats", ...[[24, 18], [176, 18], [60, 35]].map(([x, y]) => stamp("_bat_hang", x, y))),
  // floor: planks and a rug with jack-o'-lanterns, a cauldron
  layer("floor", rect(0, FLOOR2, RW2, RH2 - FLOOR2, "W"), hline(0, FLOOR2, RW2, "k"), hline(0, FLOOR2 + 1, RW2, "V"),
    ...Array.from({ length: 10 }, (_, i) => hline(0, FLOOR2 + 6 + i * 7, RW2, "w")),
    ...Array.from({ length: 10 }, (_, i) => Array.from({ length: 5 }, (_, j) => vline((j * 47 + i * 19) % RW2, FLOOR2 + i * 7, 6, "w"))).flat(),
    rect(30, FLOOR2 + 26, 160, 40, "b"), box(30, FLOOR2 + 26, 160, 40, "j"), rect(34, FLOOR2 + 30, 152, 32, "A"),
    ...Array.from({ length: 18 }, (_, i) => poly([36 + i * 8, FLOOR2 + 28, 39 + i * 8, FLOOR2 + 25, 42 + i * 8, FLOOR2 + 28, 39 + i * 8, FLOOR2 + 31], "j")),
    ellipse(110, FLOOR2 + 46, 24, 9, "b"), poly([110, FLOOR2 + 40, 116, FLOOR2 + 46, 110, FLOOR2 + 52, 104, FLOOR2 + 46], "j"),
    stamp("_jack_big", 8, FLOOR2 + 6), stamp("_jack_big", 190, FLOOR2 + 4, { flip: "x" }), stamp("_pumpkin", 176, FLOOR2 + 14, { flip: "x" }),
    lamp(21, FLOOR2 + 12, { r: 34, color: "#ff9a30", power: 0.7 }), lamp(202, FLOOR2 + 10, { r: 34, color: "#ff9a30", power: 0.7 })),
  lighting({ cell: 2, smooth: true, ambient: 0.34, ambientColor: "#8478c0", emit: "lFfI" }),
  glow("lF", { r: 7, strength: 0.4, bands: 4 }),
  post({ bloom: { above: 0.7, strength: 0.45 }, vignette: 0.25 }))

// ===================================================================== portrait (LARGE widget, 195x195)
// Baroque gilt frame with acanthus corners and a nameplate; the witch with a crow, a crystal
// ball and a candle, in a room with a curtain and a moonlit window.
const PS = 195, PCR = 13, FW = 15
const P0 = FW, P1 = PS - FW                         // painting box
const inPainting = (x, y) => x >= P0 && x < P1 && y >= P0 && y < P1
const PWX0 = 128, PWX1 = 168, PWY0 = 24, PWY1 = 88   // painted window
const inPaintedWindow = (x, y) => x >= PWX0 && x < PWX1 && y < PWY1 && y >= PWY0 + 12 * (1 - Math.sqrt(Math.max(0, 1 - ((x + 0.5 - 148) / 20) ** 2)))
const FX = 97, FY = 92                               // face centre

sprite("_acanthus", { w: 26, h: 26 }, (c) => {
  // corner ornament: scroll + leaves, drawn for the top-left corner
  c.circ(8, 8, 6, "j"); c.circ(8, 8, 4, "Y"); c.circ(8, 8, 2, "J"); c.px(7, 7, "l")
  for (const [x0, y0, x1, y1] of [[13, 6, 24, 3], [6, 13, 3, 24], [12, 12, 20, 20]]) { c.line(x0, y0, x1, y1, "j", 2); c.line(x0, y0, x1, y1, "J") }
  for (const [x, y] of [[18, 3], [22, 5], [3, 18], [5, 22], [17, 17], [20, 14], [14, 20]]) { c.px(x, y, "J"); c.px(x + 1, y + 1, "y") }
})

scene("hw_portrait", { w: PS, h: PS },
  layer("frame", clip(rr(0, 0, PS, PS, PCR),
    rect(0, 0, PS, PS, "Y"),
    box(0, 0, PS, PS, "y"), box(1, 1, PS - 2, PS - 2, "J"), box(2, 2, PS - 4, PS - 4, "j"),
    // ogee moulding bands
    ...[4, 5].map((d) => box(d, d, PS - 2 * d, PS - 2 * d, "Y")), box(6, 6, PS - 12, PS - 12, "y"),
    box(8, 8, PS - 16, PS - 16, "j"), box(9, 9, PS - 18, PS - 18, "J"), box(10, 10, PS - 20, PS - 20, "Y"),
    // bead line
    ...Array.from({ length: 23 }, (_, i) => [px(12 + i * 8, 7, "J"), px(12 + i * 8, PS - 8, "J"), px(7, 12 + i * 8, "J"), px(PS - 8, 12 + i * 8, "J")]).flat(),
    // velvet liner
    box(12, 12, PS - 24, PS - 24, "b"), box(13, 13, PS - 26, PS - 26, "A"), box(14, 14, PS - 28, PS - 28, "k"))),
  layer("corners", stamp("_acanthus", 0, 0), stamp("_acanthus", PS - 26, 0, { flip: "x" }),
    stamp("_acanthus", 0, PS - 26, { flip: "y" }), stamp("_acanthus", PS - 26, PS - 26, { flip: "xy" })),
  layer("crest", ellipse(PS / 2, 5, 12, 5, "j"), ellipse(PS / 2, 5, 9, 3, "Y"), circ(PS / 2, 5, 2, "R"), px(PS / 2 - 1, 4, "l")),
  layer("painting", clip(inPainting,
    // room behind her: dark wall, heavy curtain left, arched window right
    grad(P0, P0, P1 - P0, P1 - P0, "kdDd", "v", 0.6),
    ...Array.from({ length: 6 }, (_, i) => [rect(P0 + i * 6, P0, 6, 110, i % 2 ? "b" : "A"), vline(P0 + i * 6, P0, 110, "k")]).flat(),
    poly([P0, P0 + 110, P0 + 36, P0 + 110, P0 + 30, P0 + 120, P0, P0 + 124], "b"), ellipse(P0 + 34, P0 + 104, 3, 6, "j"),
    clip(inPaintedWindow, grad(PWX0, PWY0, 40, 64, "sSz", "v", 0.5), circ(154, 44, 9, "m"), circ(151, 42, 2, "M"), circ(157, 47, 2, "M"),
      scatter("_star_*", PWX0, PWY0, 40, 60, 10, {}), poly([PWX0, 80, 140, 74, 156, 79, PWX1, 72, PWX1, PWY1, PWX0, PWY1], "h")),
    (c) => { for (let x = PWX0 - 2; x < PWX1 + 2; x++) for (let y = PWY0 - 2; y < PWY1 + 2; y++)
      if (!inPaintedWindow(x, y) && (inPaintedWindow(x - 2, y) || inPaintedWindow(x + 2, y) || inPaintedWindow(x, y + 2))) c.px(x, y, "W") },
    rect(146, PWY0 + 4, 3, 60, "W"), rect(PWX0, 56, 40, 2, "W"),
    // candle on a holder (flame animated)
    rect(36, 150, 12, 3, "Y"), rect(40, 140, 4, 10, "y"), ellipse(42, 140, 6, 2, "Y"), rect(39, 112, 6, 28, "t"), vline(44, 112, 28, "x"),
    px(38, 116, "t"), px(38, 117, "x"), px(45, 120, "t"), rect(41, 110, 1, 2, "k"),
    // cloak and high collar
    poly([42, P1, 54, 140, 72, 124, 97, 120, 122, 124, 140, 140, 152, P1], "D"),
    poly([62, 132, 70, 104, 82, 118], "e"), poly([132, 132, 124, 104, 112, 118], "e"),
    poly([66, 128, 72, 108, 80, 120], "E"), poly([128, 128, 122, 108, 114, 120], "E"),
    line(97, 122, 97, P1, "k"), circ(97, 124, 3, "j"), circ(97, 124, 1, "R"),
    shade([120, 130, 32, 51], 1, 0.5),
    // hair falling over the shoulders
    poly([74, 72, 66, 128, 74, 136, 80, 98], "k"), poly([120, 72, 128, 128, 120, 136, 114, 98], "k"),
    line(70, 90, 68, 126, "d"), line(124, 90, 126, 126, "d"), line(76, 86, 73, 118, "Q"), line(118, 86, 121, 118, "Q"),
    // face: long, hollow cheeks, pointed chin, neck
    rect(91, 106, 13, 16, "g"), ellipse(FX, FY, 18, 22, "n"), poly([82, 100, 112, 100, 104, 116, 97, 120, 90, 116], "n"),
    ellipse(FX - 5, FY - 4, 10, 13, "N"), shade([FX + 6, FY - 16, 12, 40], 1, 0.6), shade([80, 98, 8, 10], 1, 0.6), shade([108, 98, 8, 10], 1, 0.6),
    // brows, eye sockets and whites (irises animated)
    line(80, 81, 92, 84, "k"), line(81, 82, 92, 85, "g"), line(114, 81, 102, 84, "k"), line(113, 82, 102, 85, "g"),
    ellipse(88, 89, 6, 3, "g"), ellipse(106, 89, 6, 3, "g"), ellipse(88, 89, 4, 2, "i"), ellipse(106, 89, 4, 2, "i"),
    hline(84, 87, 9, "k"), hline(102, 87, 9, "k"),
    // hooked nose with a wart, cheekbones
    poly([95, 88, 99, 88, 101, 100, 98, 106, 91, 108, 94, 103, 96, 96], "g"), line(96, 89, 97, 100, "N"), px(92, 106, "N"),
    circ(100, 99, 1, "g"), px(100, 98, "x"),
    line(82, 98, 86, 102, "g"), line(112, 98, 108, 102, "g"),
    // smirk with a tooth, chin crease
    line(88, 110, 96, 112, "k"), line(96, 112, 106, 108, "k"), line(106, 108, 108, 106, "k"), px(101, 111, "i"), px(102, 111, "i"),
    line(93, 116, 100, 116, "g"),
    // hat: wide brim, crumpled cone, band with buckle, charms
    ellipse(FX, 70, 46, 7, "k"), ellipse(FX, 69, 44, 5, "d"), hline(54, 70, 86, "Q"),
    poly([66, 68, 128, 68, 116, 44, 112, 30, 122, 18, 140, 14, 128, 22, 118, 34, 108, 28, 92, 40, 82, 52], "k"),
    line(84, 50, 108, 32, "d"), line(112, 30, 124, 19, "Q"), poly([128, 22, 140, 14, 134, 20], "d"),
    poly([70, 66, 124, 66, 121, 58, 74, 58], "e"), hline(74, 58, 48, "E"), rect(92, 57, 10, 10, "j"), rect(94, 59, 6, 6, "e"), hline(92, 57, 10, "J"),
    px(140, 15, "J"), line(140, 15, 142, 22, "y"), poly([140, 22, 144, 22, 142, 26], "J"),
    // moonlight rim on the hat (light comes from the window on the right)
    line(128, 68, 116, 44, "Q"), line(116, 44, 112, 31, "Q"), line(112, 31, 122, 18, "Q"), line(122, 18, 140, 14, "C"),
    hline(97, 75, 44, "Q"), line(66, 68, 82, 52, "d"), px(100, 46, "J"), px(88, 52, "J"), px(108, 38, "J"),
    // hands holding the crystal ball
    circ(97, 158, 13, "G"), circ(93, 154, 8, "T"), circ(90, 151, 3, "i"), ring(97, 158, 13, "k"),
    poly([78, 162, 86, 150, 90, 162, 86, 170], "n"), poly([116, 162, 108, 150, 104, 162, 108, 170], "n"),
    ...[0, 1, 2, 3].map((i) => [line(80 + i * 2, 160 - i, 85 + i, 149 + i, "g"), line(114 - i * 2, 160 - i, 109 - i, 149 + i, "g")]).flat(),
    ...[[84, 150], [87, 149], [107, 149], [110, 150]].map(([x, y]) => [px(x, y, "k"), px(x, y - 1, "k")]).flat(),
    line(78, 162, 86, 170, "N"), line(116, 162, 108, 170, "g"),
    rect(86, 171, 22, 4, "Y"), hline(86, 171, 22, "J"),
    // crow on her right shoulder (head animated)
    ellipse(146, 124, 10, 7, "k"), poly([136, 126, 124, 136, 140, 130], "k"), line(150, 120, 154, 112, "Q"), line(141, 121, 150, 118, "Q"),
    line(144, 131, 142, 136, "y"), line(149, 131, 149, 136, "y"))),
  glow("T", { r: 10, strength: 0.35, bands: 4, where: inPainting }),
  glow("m", { r: 6, strength: 0.25, bands: 3, where: inPainting }),
  // nameplate on the bottom rail
  layer("plate", rect(PS / 2 - 24, PS - 13, 48, 10, "j"), box(PS / 2 - 24, PS - 13, 48, 10, "y"), hline(PS / 2 - 23, PS - 12, 46, "J"),
    text(PS / 2, PS - 10, "MORGANA", "y", { align: "c" })))

anim("hw_portrait_fx", { w: PS, h: PS, frames: 240, fps: 8 },
  clip(inPainting, (c) => {
    const p = c.phase, f = c.frame
    // eyes: irises drift and follow, with blinks (one double blink)
    const g = Math.round(Math.sin(p * TAU * 2) * 2)
    const blink = [60, 61, 150, 151, 156, 157, 220].includes(f)
    if (blink) { for (const ex of [88, 106]) { c.ellipse(ex, 89, 5, 3, "n"); c.hline(ex - 4, 90, 9, "g"); c.hline(ex - 3, 91, 7, "k") } }
    else for (const ex of [88, 106]) { c.rect(ex - 1 + g, 88, 3, 3, "I"); c.rect(ex + g, 88, 1, 3, "k"); c.px(ex - 1 + g, 88, "l") }
    // crow head: looks around, blinks
    const turn = Math.sin(p * TAU * 3) > 0.3 ? 1 : Math.sin(p * TAU * 3) < -0.3 ? -1 : 0
    const hx = 152 + turn, hy = 113
    c.circ(hx, hy, 5, "k"); c.px(hx - 2, hy - 3, "Q")
    if (turn >= 0) { c.poly([hx + 4, hy, hx + 10, hy + 1, hx + 4, hy + 2], "y") } else { c.poly([hx - 4, hy, hx - 10, hy + 1, hx - 4, hy + 2], "y") }
    if (f % 40 !== 7) c.px(hx + (turn >= 0 ? 2 : -2), hy - 1, "I")
    // crystal ball swirl
    for (let k = 0; k < 6; k++) {
      const a = p * TAU * 2 + k * TAU / 6, r = 4 + (k % 3) * 2
      c.px(Math.round(97 + Math.cos(a) * r), Math.round(158 + Math.sin(a) * r * 0.8), k % 2 ? "T" : "i")
    }
    // candle flame
    const h = [0, 1, 1, 2, 1, 0, 1, 2][f % 8]
    c.rect(41, 107 - h, 2, 3 + h, "F"); c.px(41, 106 - h, "l"); c.px(42, 109, "f"); c.px(40, 109, "f")
    if (h === 2) c.px(42, 104, "F")
    // bat crossing the painted moon
    const bq = (p * 2) % 1, bx = Math.round(PWX0 - 6 + bq * 52), by = Math.round(40 + Math.sin(bq * TAU) * 4)
    if (inPaintedWindow(bx, by)) { c.rect(bx - 1, by, 2, 2, "k"); const up = f % 2 === 0; c.line(bx - 1, by + (up ? 0 : 1), bx - 4, by + (up ? -2 : 2), "k"); c.line(bx + 1, by + (up ? 0 : 1), bx + 4, by + (up ? -2 : 2), "k") }
    // spider on its thread
    const drop = Math.round(10 + 40 * (0.5 - 0.5 * Math.cos(p * TAU)))
    c.vline(60, P0, drop, "C")
    const sy = P0 + drop, leg = f % 4 < 2 ? 0 : 1
    c.circ(60, sy + 2, 2, "k"); c.px(60, sy + 5, "k"); c.px(59, sy + 1, "R"); c.px(61, sy + 1, "R")
    for (let k = 0; k < 3; k++) { c.line(58, sy + 1 + k, 55, sy + k + (k === 1 ? leg : 0), "k"); c.line(62, sy + 1 + k, 65, sy + k + (k === 1 ? leg : 0), "k") }
  }))

// ===================================================================== ghost frame (SMALL widget, 92x92)
// Carved dark-wood frame with a gilt oval; inside, a foggy graveyard where a ghost floats.
const GS = 92, GCR = 10, OCX = 46, OCY = 47, ORX = 33, ORY = 37
const inOval = (x, y) => ((x + 0.5 - OCX) / ORX) ** 2 + ((y + 0.5 - OCY) / ORY) ** 2 <= 1
const inOvalRing = (x, y, d) => ((x + 0.5 - OCX) / (ORX + d)) ** 2 + ((y + 0.5 - OCY) / (ORY + d)) ** 2 <= 1

sprite("_scroll", { w: 14, h: 14 }, (c) => {
  // small corner scroll (top-left), gilt on wood
  c.circ(4, 4, 3, "j"); c.circ(4, 4, 1, "W"); c.px(3, 3, "J")
  c.line(7, 3, 13, 2, "Y"); c.line(3, 7, 2, 13, "Y"); c.line(6, 6, 11, 11, "j")
  c.px(10, 2, "J"); c.px(2, 10, "J"); c.px(9, 9, "J")
})

scene("hw_ghost_frame", { w: GS, h: GS },
  layer("wood", clip(rr(0, 0, GS, GS, GCR),
    rect(0, 0, GS, GS, "W"),
    // carved grooves following the oval
    (c) => { for (let y = 0; y < GS; y++) for (let x = 0; x < GS; x++) {
      if (inOval(x, y)) continue
      const r = Math.sqrt(((x + 0.5 - OCX) / ORX) ** 2 + ((y + 0.5 - OCY) / ORY) ** 2)
      const band = Math.floor((r - 1) * 40)
      if (band === 3 || band === 9) c.px(x, y, "w"); else if (band === 4 || band === 10) c.px(x, y, "V"); else if (band > 12) c.px(x, y, band % 2 ? "v" : "W")
    } },
    box(0, 0, GS, GS, "w"), box(1, 1, GS - 2, GS - 2, "v"))),
  layer("corners", stamp("_scroll", 3, 3), stamp("_scroll", GS - 17, 3, { flip: "x" }),
    stamp("_scroll", 3, GS - 17, { flip: "y" }), stamp("_scroll", GS - 17, GS - 17, { flip: "xy" })),
  // gilt oval rim with beads
  layer("rim", (c) => { for (let y = 0; y < GS; y++) for (let x = 0; x < GS; x++) {
    if (inOval(x, y) || !inOvalRing(x, y, 3)) continue
    c.px(x, y, inOvalRing(x, y, 1) ? "J" : inOvalRing(x, y, 2) ? "j" : "y")
  }
    for (let k = 0; k < 24; k++) { const a = k * TAU / 24; c.px(Math.round(OCX + Math.cos(a) * (ORX + 5)), Math.round(OCY + Math.sin(a) * (ORY + 5)), "J") } }),
  // bat crest on top
  layer("crest", poly([OCX - 9, 4, OCX - 3, 6, OCX, 3, OCX + 3, 6, OCX + 9, 4, OCX + 5, 9, OCX, 7, OCX - 5, 9], "j"), px(OCX - 1, 5, "R"), px(OCX + 1, 5, "R")),
  // the scene inside
  layer("night", clip(inOval,
    grad(0, 8, GS, 80, "sSzZ", "v", 0.5),
    scatter("_star_*", 14, 12, 64, 30, 14, {}),
    circ(30, 24, 6, "m"), circ(28, 23, 1, "M"), circ(32, 26, 1, "M"),
    poly([0, 66, 20, 62, 46, 65, 70, 60, GS, 64, GS, GS, 0, GS], "h"),
    ...Array.from({ length: 9 }, (_, i) => stamp("_pine", 8 + i * 9, 50 + (i % 2) * 2)),
    poly([0, 72, 40, 70, GS, 73, GS, GS, 0, GS], "H"),
    stamp("_tomb", 20, 64), stamp("_tomb", 58, 66), stamp("_tomb", 40, 70),
    vline(31, 60, 9, "k"), hline(29, 62, 5, "k"),
    line(70, 76, 73, 52, "k", 2), line(72, 60, 64, 52, "k"), line(72, 56, 78, 48, "k"),
    // low fog bank (static part)
    ...Array.from({ length: 3 }, (_, i) => dither(0, 74 + i * 3, GS, 3, "H", "c", 0.25 + i * 0.2)))),
  glow("m", { r: 5, strength: 0.3, bands: 3, where: inOval }))

anim("hw_ghost_fx", { w: GS, h: GS, frames: 240, fps: 8 },
  clip(inOval, (c) => {
    const p = c.phase, f = c.frame
    // drifting fog wisps
    for (let i = 0; i < 3; i++) {
      const x = Math.round(-30 + ((p * (i % 2 ? 1 : 2) + i * 0.33) % 1) * 152), y = 70 + i * 4
      c.ellipse(x, y, 14, 1, i % 2 ? "C" : "c"); c.ellipse(x + 8, y - 1, 7, 1, "C")
    }
    // the ghost: lazy figure-eight, bobbing, hem waving
    const gx = Math.round(OCX + Math.sin(p * TAU) * 13), gy = Math.round(42 + Math.sin(p * TAU * 2) * 5)
    const lean = Math.round(Math.cos(p * TAU) * 1.5)
    // faint haze around it
    for (let dy = -14; dy <= 18; dy++) for (let dx = -14; dx <= 14; dx++) {
      const d = dx * dx / 196 + dy * dy / 324
      if (d < 1 && d > 0.55 && (dx + dy + f) % 3 === 0) c.px(gx + dx, gy + dy, "Z")
    }
    c.circ(gx, gy - 6, 8, "i")                                               // head
    c.poly([gx - 8, gy - 6, gx + 8, gy - 6, gx + 10 + lean, gy + 10, gx - 10 + lean, gy + 10], "i")  // body
    for (let k = 0; k < 5; k++) {                                            // wavy hem
      const hx = gx - 10 + lean + k * 5, wave = (k + Math.floor(f / 2)) % 2
      c.poly([hx, gy + 10, hx + 5, gy + 10, hx + 2 + wave, gy + 14 + wave], "i")
    }
    c.vline(gx + 6, gy - 10, 16, "t"); c.vline(gx + 7, gy - 6, 14, "t")    // shading
    // arms wave
    const arm = Math.round(Math.sin(p * TAU * 4) * 2)
    c.line(gx - 8, gy, gx - 13, gy - 3 + arm, "i", 2); c.line(gx + 8, gy, gx + 13, gy - 3 - arm, "i", 2)
    // face: eyes look where it drifts, blink, says "boo" now and then
    const look = Math.cos(p * TAU) > 0 ? 1 : -1
    const blink = [40, 41, 130, 131, 136, 137, 200].includes(f)
    if (blink) { c.hline(gx - 4 + look, gy - 7, 3, "k"); c.hline(gx + 2 + look, gy - 7, 3, "k") }
    else { c.rect(gx - 4 + look, gy - 9, 2, 3, "k"); c.rect(gx + 2 + look, gy - 9, 2, 3, "k"); c.px(gx - 4 + look, gy - 9, "Q"); c.px(gx + 2 + look, gy - 9, "Q") }
    const boo = (f % 80) >= 60 && (f % 80) < 72
    if (boo) { c.ellipse(gx + look, gy - 2, 2, 3, "k"); c.px(gx + look, gy - 3, "b") }
    else c.rect(gx - 1 + look, gy - 3, 2, 2, "k")
  }))

// ===================================================================== haunted library (Haunted theme wallpaper)
// One-point perspective: bookshelf walls converge on a stone fireplace. Lit by real lamps
// (fire, chandelier, sconces, candelabra, jack-o'-lanterns) with pxl's lighting(), then bloom.
const LW = 220, LH = 478, VPX = 110, VPY = 250
const BX0 = 62, BX1 = 158, BY0 = 168, BY1 = 330          // back wall
const CEIL_Y = 62, FLOOR_Y = 433                          // where ceiling / floor meet the screen edges
const wallTop = (x) => x <= BX0 ? CEIL_Y + (BY0 - CEIL_Y) * (x / BX0) : CEIL_Y + (BY0 - CEIL_Y) * ((LW - x) / (LW - BX1))
const wallBot = (x) => x <= BX0 ? FLOOR_Y + (BY1 - FLOOR_Y) * (x / BX0) : FLOOR_Y + (BY1 - FLOOR_Y) * ((LW - x) / (LW - BX1))
const floorX = (xb, y) => VPX + (xb - VPX) * (y - VPY) / (LH - VPY)   // floor line through VP and (xb, LH)
const ceilX = (xt, y) => VPX + (xt - VPX) * (VPY - y) / VPY          // ceiling line through VP and (xt, 0)
const BOOKS = ["A", "b", "B", "p", "P", "g", "n", "e", "E", "y", "r", "Q"]
const rnd = (i) => { const v = Math.sin(i * 12.9898) * 43758.5453; return v - Math.floor(v) }

// a side wall of shelves; near = screen edge (x 0 or 220), far = back-wall edge
function shelfWall(c, side) {
  const xs = side < 0 ? [0, BX0] : [BX1, LW]
  const near = side < 0 ? xs[0] : xs[1], far = side < 0 ? xs[1] : xs[0]
  const t = (x) => Math.abs(x - near) / (BX0)                  // 0 near .. 1 far
  for (let x = xs[0]; x < xs[1]; x++) { c.vline(x, Math.round(wallTop(x)), Math.round(wallBot(x) - wallTop(x)), "w") }
  const SH = [0.06, 0.24, 0.42, 0.60, 0.78, 0.96]
  // books: columns narrow toward the far end
  let x = near, i = side < 0 ? 0 : 500
  while (side < 0 ? x < far : x > far) {
    const tt = t(x), bw = Math.max(1, Math.round(6 * (1 - tt) + 1))
    for (let k = 0; k < SH.length - 1; k++) {
      const top = wallTop(x), h = wallBot(x) - top
      const y0 = top + h * SH[k], y1 = top + h * SH[k + 1]
      const bh = (y1 - y0) * (0.62 + 0.3 * rnd(i * 7 + k))
      const col = BOOKS[Math.floor(rnd(i * 13 + k * 3) * BOOKS.length)]
      if (rnd(i * 5 + k) < 0.08) continue                     // a gap on the shelf
      const bx = side < 0 ? x : x - bw + 1
      c.rect(bx, Math.round(y1 - bh), bw, Math.round(bh), col)
      if (bw >= 3) { c.hline(bx, Math.round(y1 - bh * 0.8), bw, "j"); c.hline(bx, Math.round(y1 - bh * 0.25), bw, "j") }
      if (bw >= 2) c.vline(side < 0 ? bx + bw - 1 : bx, Math.round(y1 - bh), Math.round(bh), "k")
    }
    x += side < 0 ? bw : -bw; i++
  }
  // shelf boards and uprights in perspective
  for (const f of SH) {
    const y = (xx) => wallTop(xx) + (wallBot(xx) - wallTop(xx)) * f
    c.line(xs[0], Math.round(y(xs[0])), xs[1] - 1, Math.round(y(xs[1] - 1)), "V")
    c.line(xs[0], Math.round(y(xs[0])) + 1, xs[1] - 1, Math.round(y(xs[1] - 1)) + 1, "W")
  }
  for (const f of [0, 0.5, 0.97]) {
    const ux = Math.round(near + (far - near) * f)
    c.line(ux, Math.round(wallTop(ux)), ux, Math.round(wallBot(ux)), "v")
  }
  // crown moulding along the top edge
  c.line(xs[0], Math.round(wallTop(xs[0])), xs[1] - 1, Math.round(wallTop(xs[1] - 1)), "V")
  c.line(xs[0], Math.round(wallTop(xs[0])) + 2, xs[1] - 1, Math.round(wallTop(xs[1] - 1)) + 2, "j")
}

sprite("_bat_hang", { w: 7, h: 6 }, rect(2, 0, 3, 1, "k"), rect(2, 1, 3, 3, "k"), px(1, 2, "k"), px(5, 2, "k"), px(1, 3, "k"), px(5, 3, "k"), px(2, 4, "k"), px(4, 4, "k"), px(3, 5, "k"), px(2, 2, "R"))

sprite("_wingchair", { w: 34, h: 40, outline: "k" }, (c) => {
  c.rect(4, 2, 26, 26, "b"); c.ellipse(17, 3, 13, 3, "b")
  c.rect(0, 10, 7, 22, "A"); c.rect(27, 10, 7, 22, "A"); c.ellipse(3, 10, 3, 3, "A"); c.ellipse(30, 10, 3, 3, "A")
  c.rect(6, 22, 22, 8, "A"); c.hline(7, 22, 20, "R")
  for (const [x, y] of [[10, 8], [17, 8], [24, 8], [13, 14], [21, 14]]) c.px(x, y, "r")
  c.rect(2, 30, 30, 4, "b"); c.line(4, 34, 3, 39, "v", 2); c.line(30, 34, 31, 39, "v", 2)
  c.vline(5, 3, 20, "R")
})

sprite("_table", { w: 40, h: 46 }, (c) => {
  // round reading table with candelabra and an open grimoire
  c.ellipse(20, 28, 18, 5, "v"); c.ellipse(20, 27, 17, 4, "V"); c.ellipse(20, 30, 18, 3, "W")
  c.rect(18, 32, 4, 10, "W"); c.line(20, 41, 12, 45, "W", 2); c.line(20, 41, 28, 45, "W", 2)
  c.poly([8, 26, 19, 24, 19, 28, 9, 30], "t"); c.poly([21, 24, 31, 26, 30, 30, 21, 28], "i"); c.vline(20, 24, 5, "x")
  for (let k = 0; k < 3; k++) { c.hline(10 + k, 26 + k, 7, "x"); c.hline(22, 26 + k, 7, "x") }
  c.ellipse(32, 23, 3, 1, "Y"); c.vline(32, 10, 13, "Y"); c.line(32, 14, 27, 11, "Y"); c.line(32, 14, 37, 11, "Y")
  for (const x of [26, 31, 36]) { c.rect(x, 3 + (x === 31 ? -2 : 0), 2, 8, "t"); c.px(x, 1 + (x === 31 ? -2 : 0), "F"); c.px(x, 0 + (x === 31 ? -2 : 0), "l") }
}, lamp(31, 1, { r: 40, color: "#ffb35c", power: 0.9 }))

sprite("_bust_raven", { w: 20, h: 28 }, (c) => {
  // Pallas bust with a raven on top (Poe)
  c.rect(4, 22, 12, 6, "3"); c.hline(3, 22, 14, "4"); c.ellipse(10, 18, 6, 5, "3"); c.ellipse(10, 12, 4, 5, "4"); c.px(8, 11, "2"); c.px(12, 11, "2")
  c.ellipse(10, 5, 5, 3, "k"); c.ellipse(13, 2, 2, 2, "k"); c.poly([15, 2, 19, 3, 15, 3], "y"); c.px(13, 1, "I")
  c.poly([5, 5, 1, 9, 6, 7], "k"); c.line(7, 4, 12, 3, "Q")
})

scene("hw_library", { w: LW, h: LH, bg: "k" },
  // ceiling: dark boards, beams converging on the back wall, cross beams
  layer("ceiling", (c) => {
    c.poly([0, 0, LW, 0, LW, CEIL_Y, BX1, BY0, BX0, BY0, 0, CEIL_Y], "w")
    for (let xt = -60; xt <= 280; xt += 12) c.line(Math.round(ceilX(xt, 0)), 0, Math.round(ceilX(xt, BY0)), BY0, "1")
    for (const xt of [-40, 40, 110, 180, 260]) {
      for (let d = -1; d <= 1; d++) c.line(Math.round(ceilX(xt, 0)) + d, 0, Math.round(ceilX(xt, BY0)), BY0, d === -1 ? "v" : "W")
    }
    for (const g of [0.08, 0.3, 0.52, 0.72, 0.88]) {
      const y = Math.round(BY0 * g), x0 = y < CEIL_Y ? 0 : Math.round(BX0 * (y - CEIL_Y) / (BY0 - CEIL_Y)), x1 = LW - x0
      c.rect(x0, y, x1 - x0, Math.max(2, Math.round(6 * (1 - g))), "W"); c.hline(x0, y, x1 - x0, "v"); c.hline(x0, y + Math.max(2, Math.round(6 * (1 - g))), x1 - x0, "k")
    }
  }),
  layer("bats", ...[[30, 18], [76, 38], [150, 18], [184, 38], [120, 72]].map(([x, y]) => stamp("_bat_hang", x, y))),
  // back wall: damask above, panelling below, stone fireplace, sconces, portraits
  layer("backwall",
    rect(BX0, BY0, BX1 - BX0, BY1 - BY0, "D"), pattern("_damask", BX0, BY0 + 4, BX1 - BX0, 100),
    rect(BX0, BY0 + 104, BX1 - BX0, BY1 - BY0 - 104, "W"), hline(BX0, BY0 + 104, BX1 - BX0, "j"), hline(BX0, BY0 + 105, BX1 - BX0, "v"),
    ...[0, 1, 2, 3].map((i) => box(BX0 + 3 + i * 24, BY0 + 110, 20, 44, "w")),
    rect(BX0, BY0, BX1 - BX0, 3, "V"), hline(BX0, BY0 + 3, BX1 - BX0, "k"),
    // portraits flanking the chimney
    ...[BX0 + 6, BX1 - 22].map((x) => [rect(x, BY0 + 18, 16, 22, "Y"), rect(x + 2, BY0 + 20, 12, 18, "d"), ellipse(x + 8, BY0 + 27, 3, 4, "x"), rect(x + 5, BY0 + 31, 6, 6, "k")]).flat()),
  layer("fireplace", (c) => {
    const fx0 = 84, fx1 = 136, fy0 = 262
    c.rect(96, BY0 + 6, 28, fy0 - BY0 - 6, "2")                                        // chimney breast
    for (let y = BY0 + 8; y < fy0; y += 5) for (let x = 96 + ((y / 5) % 2) * 4; x < 124; x += 8) c.box(x, y, 8, 5, "1")
    c.rect(fx0, fy0, fx1 - fx0, BY1 - fy0, "3")
    for (let y = fy0; y < BY1; y += 5) for (let x = fx0 + ((y / 5) % 2) * 4; x < fx1; x += 8) c.box(x, y, 8, 5, "2")
    c.rect(fx0 - 4, fy0 - 6, fx1 - fx0 + 8, 6, "4"); c.hline(fx0 - 4, fy0 - 6, fx1 - fx0 + 8, "i"); c.hline(fx0 - 4, fy0 - 1, fx1 - fx0 + 8, "1")
    c.poly([96, BY1, 96, 286, 102, 278, 110, 275, 118, 278, 124, 286, 124, BY1], "k")   // firebox
    c.rect(98, 320, 24, 4, "W"); c.line(99, 323, 120, 318, "v", 2); c.line(100, 318, 121, 323, "W", 2)
    c.flame(110, 320, 22, "lFfo", { seed: 3, wind: 0.08 }); c.flame(103, 321, 12, "lFfo", { seed: 7, wind: -0.1 }); c.flame(117, 321, 12, "lFfo", { seed: 9, wind: 0.12 })
    c.lamp(110, 312, { r: 150, color: "#ff8c3a", power: 1.3 })
    // mantel dressing: candles, skull, raven on a bust
    for (const x of [86, 92, 130]) { c.rect(x, fy0 - 14, 2, 8, "t"); c.px(x, fy0 - 15, "F"); c.px(x, fy0 - 16, "l"); c.lamp(x, fy0 - 16, { r: 30, color: "#ffc070", power: 0.6 }) }
    c.ellipse(101, fy0 - 9, 4, 3, "t"); c.rect(98, fy0 - 9, 6, 3, "t"); c.px(99, fy0 - 9, "k"); c.px(102, fy0 - 9, "k")
  }),
  layer("bust", stamp("_bust_raven", 112, 228)),
  // side walls of books
  layer("walls", (c) => { shelfWall(c, -1); shelfWall(c, 1) }),
  layer("sconces", ...[[30, 230], [190, 230]].map(([x, y]) => [rect(x - 1, y, 3, 10, "Y"), ellipse(x, y, 4, 1, "j"), rect(x - 1, y - 8, 3, 8, "t"),
    px(x, y - 9, "F"), px(x, y - 10, "l"), lamp(x, y - 10, { r: 60, color: "#ffb35c", power: 0.85 })]).flat()),
  // floor: planks converging, staggered joints, long rug runner
  layer("floor", (c) => {
    c.poly([0, FLOOR_Y, BX0, BY1, BX1, BY1, LW, FLOOR_Y, LW, LH, 0, LH], "W")
    for (let xb = -400; xb <= 620; xb += 26) c.line(Math.round(floorX(xb, LH)), LH, Math.round(floorX(xb, BY1)), BY1, "w")
    let k = 0
    for (let y = BY1 + 2, dy = 3; y < LH; y += dy, dy += 1.4, k++) {
      for (let xb = -400 + (k % 2) * 13; xb <= 620; xb += 52) {
        const xa = Math.round(floorX(xb, y)), xb2 = Math.round(floorX(xb + 26, y))
        if (xa >= 0 || xb2 >= 0) c.hline(Math.max(0, xa), Math.round(y), Math.max(1, Math.min(LW, xb2) - Math.max(0, xa)), "w")
      }
    }
    // rug runner toward the hearth
    const rug = (y) => [Math.round(floorX(48, y)), Math.round(floorX(172, y))]
    for (let y = BY1 + 6; y < LH; y++) {
      const [a, b] = rug(y); c.hline(a, y, b - a, "b")
      const [ia, ib] = [Math.round(floorX(60, y)), Math.round(floorX(160, y))]; c.hline(ia, y, ib - ia, "A")
      c.px(a, y, "j"); c.px(b - 1, y, "j"); c.px(ia, y, "y"); c.px(ib - 1, y, "y")
    }
    for (let y = BY1 + 14, dy = 6; y < LH; y += dy, dy += 3) { const x = Math.round(floorX(110, y)), w = Math.max(1, Math.round((y - VPY) / 26)); c.poly([x, y - w, x + w, y, x, y + w, x - w, y], "j") }
  }),
  layer("props", stamp("_wingchair", 6, 392), stamp("_table", 168, 386),
    stamp("_jack_big", 72, 318), stamp("_pumpkin", 138, 322), stamp("_jack_big", 190, 446, { flip: "x" }),
    lamp(85, 326, { r: 26, color: "#ff9a30", power: 0.6 }), lamp(203, 454, { r: 30, color: "#ff9a30", power: 0.6 }),
    // books and papers on the floor
    ...[[60, 452, "A"], [64, 449, "p"], [150, 470, "g"]].map(([x, y, col]) => [rect(x, y, 12, 3, col), hline(x, y, 12, "j")]).flat(),
    poly([92, 462, 104, 458, 108, 464, 96, 468], "t"), poly([120, 440, 128, 438, 130, 443, 122, 445], "i")),
  // chandelier: iron ring with candles, hung from the middle cross beam
  layer("chandelier", (c) => {
    c.vline(110, 37, 40, "1"); c.ellipse(110, 82, 22, 4, "2"); c.ellipse(110, 82, 20, 3, "1"); c.ellipse(110, 86, 6, 3, "2")
    for (let k = 0; k < 7; k++) {
      const x = Math.round(110 + Math.cos(k * TAU / 7) * 20), y = Math.round(82 + Math.sin(k * TAU / 7) * 3)
      c.rect(x, y - 7, 2, 7, "t"); c.px(x, y - 8, "F"); c.px(x, y - 9, "l")
      if (k % 2 === 0) c.lamp(x, y - 9, { r: 70, color: "#ffc070", power: 0.7 })
    }
    c.line(92, 84, 110, 37, "1"); c.line(128, 84, 110, 37, "1")
  }),
  layer("webs", stamp("_cobweb", BX0, BY0 + 4), stamp("_cobweb", BX1 - 22, BY0 + 4, { flip: "x" }), stamp("_cobweb", 0, CEIL_Y), stamp("_cobweb", LW - 22, CEIL_Y, { flip: "x" })),
  lighting({ cell: 2, smooth: true, ambient: 0.17, ambientColor: "#6a72c8", emit: "lFfI" }),
  glow("lF", { r: 8, strength: 0.4, bands: 4 }),
  post({ bloom: { above: 0.7, strength: 0.5 }, vignette: 0.35 }))

// ===================================================================== ghost run (two SMALL widgets, 92x92 each)
// One ghost travels between two paintings on the bookshelf wall. Both widgets share the clock,
// so the loop is one 30 s sequence (frame = 1/8 s):
//   A, top left (graveyard):   0-12 rises from behind the tombstone, 12-84 flies loops,
//                              84-100 dives behind the dead tree.
//   B, bottom right (parlour): 124-140 slides out from behind the clock, 140-172 spins 360,
//                              172-196 glides behind the armchair, 196-212 pops up and waves,
//                              212-236 flies into the fireplace and up the chimney.
// Each painting = background (behind the ghost) + ghost layer + foreground (in front of it).
const QS = 92, QF = 8                                     // size, frame width
const inPic = (x, y) => x >= QF && x < QS - QF && y >= QF && y < QS - QF
const easeIO = (t) => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t)
const lerp = (a, b, t) => a + (b - a) * t

// The ghost, drawn about 22 px tall at s = 1. `turn` 0..1 is a full spin: 0 front, .25 right,
// .5 back, .75 left. Its hem waves with the frame.
// Box round the ghost drawn last (set by ghost(), read by the occluder clip of the same frame):
// each frame only needs the furniture pixels that can cover the ghost, the still image below
// shows the rest, which keeps the frame fonts small.
let GHOST_BOX = null
const nearGhost = (x, y) => GHOST_BOX !== null && x >= GHOST_BOX[0] && x <= GHOST_BOX[2] && y >= GHOST_BOX[1] && y <= GHOST_BOX[3]
function ghost(c, x, y, f, { s = 1, turn = 0, wave = false, peek = 0 } = {}) {
  GHOST_BOX = [Math.floor(x - 14 * s), Math.floor(y - 13 * s), Math.ceil(x + 14 * s), Math.ceil(y + 13 * s)]
  const a = turn * TAU, sx = Math.max(0.35, Math.abs(Math.cos(a))), side = Math.sin(a)   // side > 0: facing right
  const hw = Math.round(7 * s * (0.55 + 0.45 * sx)), top = Math.round(y - 11 * s), mid = Math.round(y - 4 * s), hem = Math.round(y + 8 * s)
  c.ellipse(Math.round(x), top + Math.round(6 * s), hw, Math.round(6 * s), "i")
  c.poly([x - hw, mid, x + hw, mid, x + hw + 2 * s, hem, x - hw - 2 * s, hem].map(Math.round), "i")
  const n = 4
  for (let k = 0; k < n; k++) {
    const hx = x - hw - 2 * s + k * (2 * hw + 4 * s) / n, w = (2 * hw + 4 * s) / n, d = (k + Math.floor(f / 2)) % 2
    c.poly([hx, hem, hx + w, hem, hx + w / 2 + (d ? 1 : -1), hem + 3 * s + d].map(Math.round), "i")
  }
  // shading on the side away from the moon/candles
  c.vline(Math.round(x + hw - 1), top + 4, hem - top - 4, "t")
  // arms
  const arm = wave ? Math.round(Math.sin(f * 1.6) * 3) : Math.round(Math.sin(f * 0.4))
  if (sx > 0.5 || side < 0) c.line(Math.round(x - hw), mid + 2, Math.round(x - hw - 4 * s), mid - 1 + arm, "i", 2)
  if (sx > 0.5 || side > 0) c.line(Math.round(x + hw), mid + 2, Math.round(x + hw + 4 * s), mid - 1 - (wave ? arm : 0), "i", 2)
  // face: front shows two eyes and a mouth, a side shows one eye, the back shows none
  const facing = Math.cos(a)
  if (facing > -0.2) {
    const off = Math.round(side * 3 * s), ey = top + Math.round(5 * s)
    const blink = f % 37 === 0
    for (const dx of facing > 0.6 ? [-2.5, 2.5] : [side > 0 ? 2 : -2]) {
      const ex = Math.round(x + dx * s + off)
      if (blink) c.hline(ex - 1, ey + 1, 2, "k"); else { c.rect(ex - 1, ey, 2, 3, "k"); c.px(ex - 1, ey, "Q") }
    }
    if (facing > 0.6) { const mx = Math.round(x + off); peek ? c.ellipse(mx, ey + 6, 1, 2, "k") : c.rect(mx - 1, ey + 5, 2, 2, "k") }
  }
}

// No frames: each widget shows the bookshelf wall itself (cut from the calibrated wallpaper by
// the app) with these objects drawn over it at widget scale. Objects stay clear of the widget's
// edges so the edges stay pure wallpaper. Art = what sits behind the ghost; *_fg = the parts in
// front of it (the ghost goes behind them).
const inQ = (x, y) => x >= 0 && y >= 0 && x < QS && y < QS

// --- A, top left: a secret bookcase door standing ajar onto a dark passage
const DOOR_X0 = 50, DOOR_X1 = 72, DOOR_Y0 = 16, DOOR_Y1 = 84
const bookStripes = (c, x0, y0, w, h, seed) => {
  for (let y = y0 + 3; y < y0 + h - 4; y += 12) {
    for (let x = x0, i = 0; x < x0 + w; i++) { const bw = 2 + Math.floor(rnd(seed + i * 3 + y) * 3), bh = 8 + Math.floor(rnd(seed + i + y * 7) * 3)
      c.rect(x, y + 10 - bh, Math.min(bw, x0 + w - x), bh, BOOKS[Math.floor(rnd(seed * 5 + i + y) * BOOKS.length)]); x += bw }
    c.hline(x0, y + 10, w, "V"); c.hline(x0, y + 11, w, "w")
  }
}
scene("hw_ghost_a", { w: QS, h: QS },
  // dark passage behind the door: stone arch receding into blackness
  rect(DOOR_X0 - 2, DOOR_Y0 - 2, DOOR_X1 - DOOR_X0 + 4, DOOR_Y1 - DOOR_Y0 + 4, "W"),
  grad(DOOR_X0, DOOR_Y0, DOOR_X1 - DOOR_X0, DOOR_Y1 - DOOR_Y0, "kd", "h", 0.5),
  ...Array.from({ length: 5 }, (_, i) => hline(DOOR_X0 + 2, DOOR_Y1 - 4 - i * 3, DOOR_X1 - DOOR_X0 - 6 - i * 2, i % 2 ? "1" : "2")),
  rect(DOOR_X0 + 9, DOOR_Y0 + 20, 2, 6, "t"), px(DOOR_X0 + 9, DOOR_Y0 + 19, "F"), px(DOOR_X0 + 9, DOOR_Y0 + 18, "l"),
  lamp(DOOR_X0 + 9, DOOR_Y0 + 18, { r: 40, color: "#ffb35c", power: 0.8 }), lighting({ cell: 2, smooth: true, ambient: 0.42, ambientColor: "#8478c0", emit: "lFfI" }),
  glow("lF", { r: 6, strength: 0.4, bands: 3 }))
scene("hw_ghost_a_fg", { w: QS, h: QS },
  // jambs and lintel of the opening
  rect(DOOR_X0 - 3, DOOR_Y0 - 3, DOOR_X1 - DOOR_X0 + 6, 3, "v"), hline(DOOR_X0 - 3, DOOR_Y0 - 3, DOOR_X1 - DOOR_X0 + 6, "V"),
  rect(DOOR_X0 - 3, DOOR_Y0, 3, DOOR_Y1 - DOOR_Y0, "v"), vline(DOOR_X0 - 3, DOOR_Y0, DOOR_Y1 - DOOR_Y0, "V"),
  // the door: a bookcase section swung open towards us on its right hinge (seen at an angle)
  (c) => {
    const hx = DOOR_X1, w = 14
    c.poly([hx, DOOR_Y0 - 2, hx + w, DOOR_Y0 - 6, hx + w, DOOR_Y1 + 4, hx, DOOR_Y1], "W")
    for (let y = DOOR_Y0 + 2; y < DOOR_Y1 - 2; y += 11) {
      for (let x = hx + 1; x < hx + w - 1; x++) {
        const t = (x - hx) / w, top = Math.round(y - 4 * t), col = BOOKS[Math.floor(rnd(x * 7 + y) * BOOKS.length)]
        c.vline(x, top, 8 + Math.round(t), col)
      }
      c.line(hx, y + 9, hx + w - 1, y + 9 - 4 + 1, "V"); c.line(hx, y + 10, hx + w - 1, y + 10 - 4 + 1, "k")
    }
    c.line(hx, DOOR_Y0 - 2, hx + w, DOOR_Y0 - 6, "V"); c.line(hx, DOOR_Y1, hx + w, DOOR_Y1 + 4, "k")
    c.vline(hx, DOOR_Y0 - 2, DOOR_Y1 - DOOR_Y0 + 2, "k"); c.vline(hx + w, DOOR_Y0 - 6, DOOR_Y1 - DOOR_Y0 + 10, "V")
    c.circ(hx + 2, DOOR_Y0 + 32, 1, "J")
  }, lamp(DOOR_X0 + 9, DOOR_Y0 + 18, { r: 40, color: "#ffb35c", power: 0.8 }), lighting({ cell: 2, smooth: true, ambient: 0.42, ambientColor: "#8478c0", emit: "lFfI" }))
anim("hw_ghost_a_fx", { w: QS, h: QS, frames: 240, fps: 8 }, clip(inQ, (c) => {
  const f = c.frame
  GHOST_BOX = null
  if (f < 12) { const t = easeIO(f / 12); ghost(c, 60, lerp(70, 44, t), f, { peek: f > 8, s: 0.8 + 0.2 * t }) }              // drifts out of the passage
  else if (f < 84) {                                                                                                         // two loops over the shelves
    const t = (f - 12) / 72, a = -Math.PI / 2 + t * TAU * 2
    const x = 34 + Math.cos(a) * 18, y = 40 + Math.sin(a) * 14 + Math.sin(t * TAU * 4) * 2
    ghost(c, x, y, f, { turn: Math.sin(a + Math.PI / 2) > 0 ? 0.75 : 0.25 })
  }
  else if (f < 100) { const t = easeIO((f - 84) / 16); ghost(c, lerp(34, 74, t), lerp(26, 50, t), f, { turn: 0.25, s: 1 - 0.25 * t }) } // into the passage, behind the door
}),
  // iOS draws the animated layer above every image, so what the ghost goes behind is part of it
  clip(nearGhost, stamp("hw_ghost_a_fg", 0, 0)))
scene("hw_ghost_a_preview", { w: QS, h: QS, bg: "w" }, stamp("hw_ghost_a", 0, 0), stamp("hw_ghost_a_fx", 0, 0), stamp("hw_ghost_a_fg", 0, 0))

// --- B, bottom right: fireplace and wingback chair standing on the floor (widget's bottom edge)
scene("hw_ghost_b", { w: QS, h: QS },
  // fireplace body and firebox (the ghost comes out from behind its right side)
  rect(6, 40, 40, 52, "3"), (c) => { for (let y = 40; y < 92; y += 5) for (let x = 6 + ((y / 5) % 2) * 4; x < 46; x += 8) c.box(x, y, 8, 5, "2") },
  poly([14, 92, 14, 64, 20, 58, 26, 56, 32, 58, 38, 64, 38, 92], "k"),
  rect(16, 84, 20, 3, "W"), line(17, 86, 35, 82, "v", 2),
  (c) => { c.flame(26, 84, 12, "lFfo", { seed: 5, wind: 0.05 }); c.flame(20, 85, 7, "lFfo", { seed: 8 }); c.flame(31, 85, 7, "lFfo", { seed: 11 }) },
  rect(2, 34, 48, 6, "4"), hline(2, 34, 48, "i"), hline(2, 39, 48, "1"),
  rect(8, 26, 2, 8, "t"), px(8, 25, "F"), px(8, 24, "l"), rect(40, 28, 2, 6, "t"), px(40, 27, "F"), px(40, 26, "l"),
  ellipse(24, 31, 4, 3, "t"), rect(21, 31, 6, 3, "t"), px(22, 31, "k"), px(25, 31, "k"),
  lamp(26, 78, { r: 70, color: "#ff8c3a", power: 1.1 }), lamp(8, 24, { r: 30, color: "#ffc070", power: 0.6 }), lighting({ cell: 2, smooth: true, ambient: 0.42, ambientColor: "#8478c0", emit: "lFfI" }),
  glow("lF", { r: 8, strength: 0.4, bands: 3 }))
scene("hw_ghost_b_fg", { w: QS, h: QS },
  // the whole stone surround and mantel, the firebox opening cut out: the ghost slides out from
  // behind its right side and at the end flies into the firebox and up the chimney
  rect(6, 40, 40, 52, "3"), (c) => { for (let y = 40; y < 92; y += 5) for (let x = 6 + ((y / 5) % 2) * 4; x < 46; x += 8) c.box(x, y, Math.min(8, 46 - x), 5, "2") },
  poly([14, 92, 14, 64, 20, 58, 26, 56, 32, 58, 38, 64, 38, 92], "_"),
  rect(2, 34, 48, 6, "4"), hline(2, 34, 48, "i"), hline(2, 39, 48, "1"),
  rect(8, 26, 2, 8, "t"), px(8, 25, "F"), px(8, 24, "l"), rect(40, 28, 2, 6, "t"), px(40, 27, "F"), px(40, 26, "l"),
  ellipse(24, 31, 4, 3, "t"), rect(21, 31, 6, 3, "t"), px(22, 31, "k"), px(25, 31, "k"),
  // wingback chair (right)
  rect(56, 56, 28, 22, "b"), ellipse(70, 56, 14, 5, "b"), rect(52, 64, 7, 18, "A"), rect(81, 64, 7, 18, "A"),
  ellipse(55, 64, 3, 3, "A"), ellipse(84, 64, 3, 3, "A"), rect(58, 74, 24, 7, "A"), hline(58, 74, 24, "R"),
  ...[[62, 60], [70, 60], [78, 60]].map(([x, y]) => px(x, y, "r")), vline(57, 57, 18, "R"),
  rect(54, 81, 32, 4, "b"), line(56, 85, 55, 90, "v", 2), line(84, 85, 85, 90, "v", 2),
  lamp(26, 78, { r: 70, color: "#ff8c3a", power: 1.1 }), lamp(40, 26, { r: 30, color: "#ffc070", power: 0.6 }), lighting({ cell: 2, smooth: true, ambient: 0.42, ambientColor: "#8478c0", emit: "lFfI" }))
anim("hw_ghost_b_fx", { w: QS, h: QS, frames: 240, fps: 8 }, clip(inQ, (c) => {
  const f = c.frame
  GHOST_BOX = null
  if (f >= 124 && f < 140) { const t = easeIO((f - 124) / 16); ghost(c, lerp(36, 52, t), lerp(58, 30, t), f, { turn: 0.25 }) }       // out from behind the fireplace
  else if (f >= 140 && f < 172) { const t = (f - 140) / 32; ghost(c, 52, 30 + Math.sin(t * TAU) * 2, f, { turn: easeIO(t) }) }      // 360 spin
  else if (f >= 172 && f < 196) { const t = easeIO((f - 172) / 24); ghost(c, lerp(52, 70, t), lerp(30, 70, t), f, { turn: 0.25 }) }  // behind the chair
  else if (f >= 196 && f < 212) { const t = easeIO((f - 196) / 8); ghost(c, 70, lerp(70, 40, t), f, { wave: true, peek: f > 204 }) } // pops up, waves
  else if (f >= 212 && f < 236) {                                                                                          // into the fire and up the chimney
    const t = easeIO((f - 212) / 24), s2 = lerp(1, 0.45, t)
    ghost(c, lerp(70, 26, t), lerp(40, 72, t) - Math.sin(t * Math.PI) * 10, f, { s: s2, turn: 0.75 })
  }
}),
  clip(nearGhost, stamp("hw_ghost_b_fg", 0, 0)))
scene("hw_ghost_b_preview", { w: QS, h: QS, bg: "w" }, stamp("hw_ghost_b", 0, 0), stamp("hw_ghost_b_fx", 0, 0), stamp("hw_ghost_b_fg", 0, 0))

// the floor the app lays under the bottom-right widget, wide enough for any screen position
sprite("hw_floor_strip", { w: 440, h: 140 }, (c) => {
  c.rect(0, 0, 440, 140, "W"); c.hline(0, 0, 440, "k"); c.hline(0, 1, 440, "V"); c.hline(0, 2, 440, "j")
  for (let i = 0; i < 20; i++) c.hline(0, 7 + i * 7, 440, "w")
  for (let i = 0; i < 20; i++) for (let j = 0; j < 10; j++) c.vline((j * 47 + i * 19) % 440, i * 7 + 1, 6, "w")
  c.rect(120, 24, 200, 46, "b"); c.box(120, 24, 200, 46, "j"); c.rect(124, 28, 192, 38, "A")
  for (let i = 0; i < 23; i++) c.poly([126 + i * 8, 26, 129 + i * 8, 23, 132 + i * 8, 26, 129 + i * 8, 29], "j")
  c.ellipse(220, 47, 30, 11, "b"); c.poly([220, 40, 227, 47, 220, 54, 213, 47], "j")
})

// brass sconce with two candles, hung above each ghost widget: its light is the warm glow the
// app paints round the widget's edge (which hides the light rim iOS draws round widgets)
sprite("hw_sconce", { w: 22, h: 18 }, (c) => {
  c.ellipse(11, 14, 4, 3, "Y"); c.ellipse(11, 14, 2, 2, "j"); c.px(10, 13, "J")
  c.line(11, 14, 4, 10, "Y"); c.line(11, 14, 18, 10, "Y"); c.ellipse(4, 10, 2, 1, "j"); c.ellipse(18, 10, 2, 1, "j")
  for (const x of [3, 17]) { c.rect(x, 3, 2, 7, "t"); c.vline(x + 1, 3, 7, "x"); c.px(x, 2, "k"); c.px(x, 1, "F"); c.px(x, 0, "l"); c.px(x + 1, 1, "f") }
})

// rows of books for the app's adaptive bookcase wall (it cuts these to fit each shelf):
// bottom-aligned on a transparent strip, unlit (the app lights the wall), now and then a prop
for (let v = 1; v <= 3; v++) {
  sprite("lib_books_" + v, { w: 440, h: 36 }, (c) => {
    let x = 0, i = v * 1000
    while (x < 440) {
      const r = rnd(i)
      if (r < 0.03) { skull(c, x, 23); x += 12 }
      else if (r < 0.06) { bottle(c, x, 18, 7, 18, "Q", ["R", "G", "N", "P"][i % 4], i % 2 ? "flask" : "tall"); x += 10 }
      else if (r < 0.1) { x += 4 + Math.floor(rnd(i + 3) * 6) }                                  // gap
      else if (r < 0.13) {                                                                       // a leaning book
        const col = BOOKS[Math.floor(rnd(i + 5) * BOOKS.length)]
        c.poly([x, 36, x + 4, 36, x + 12, 12, x + 8, 12], col); c.line(x + 4, 36, x + 12, 12, "k"); x += 13
      } else {
        const bw = 2 + Math.floor(rnd(i + 1) * 4), bh = 18 + Math.floor(rnd(i + 2) * 17), col = BOOKS[Math.floor(rnd(i + 4) * BOOKS.length)]
        c.rect(x, 36 - bh, bw, bh, col); c.vline(x + bw - 1, 36 - bh, bh, "k")
        if (bw >= 3) { c.hline(x, 36 - bh + 3, bw, "j"); c.hline(x, 32, bw, "j") }
        if (bw >= 4 && rnd(i + 9) < 0.4) c.rect(x + 1, 36 - bh + Math.floor(bh / 2) - 1, bw - 2, 2, "k")
        x += bw
      }
      i++
    }
  })
}

// the whole run: A at the top left, B at the bottom right, on the bookshelf wall
scene("hw_ghost_run_preview", { w: 220, h: 400, bg: "k" },
  stamp("hw_library2", 0, 0), stamp("hw_floor_strip", -110, 349),
  stamp("hw_ghost_a", 12, 47), stamp("hw_ghost_a_fx", 12, 47), stamp("hw_ghost_a_fg", 12, 47),
  stamp("hw_ghost_b", 116, 257), stamp("hw_ghost_b_fx", 116, 257), stamp("hw_ghost_b_fg", 116, 257))

// previews (static + animated layer)
scene("hw_window_preview", { w: WW2, h: WH2 }, stamp("hw_window", 0, 0), stamp("hw_window_fx", 0, 0))
scene("hw_portrait_preview", { w: PS, h: PS }, stamp("hw_portrait", 0, 0), stamp("hw_portrait_fx", 0, 0))
scene("hw_ghost_preview", { w: GS, h: GS }, stamp("hw_ghost_frame", 0, 0), stamp("hw_ghost_fx", 0, 0))
scene("hw_window_tall_preview", { w: TS, h: TS }, stamp("hw_window_tall", 0, 0), stamp("hw_window_tall_fx", 0, 0))
