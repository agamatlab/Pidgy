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
})
ramps("kdDeE", "wWvV", "yYjJ", "fFl", "oO", "gnN", "sSzZ", "Mm", "cC", "bBA", "hHq", "rR", "pP", "xti", "dQ", "GT")

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

function farm() {
  return [
    grad(0, ARCH_BASE, WW2, HZ - ARCH_BASE, "sSzZ", "v", 0.5),
    scatter("_star_*", 14, ARCH_BASE + 2, 168, 22, 40, {}),
    circ(155, 38, 8, "m"), circ(152, 36, 2, "M"), circ(158, 41, 2, "M"), px(156, 35, "M"),
    // far forest line and hills
    ...Array.from({ length: 26 }, (_, i) => stamp("_pine", 12 + i * 7 + (i % 3), HZ - 13 + (i % 2) * 2)),
    poly([0, HZ, 40, HZ - 3, 90, HZ, 140, HZ - 4, WW2, HZ - 1, WW2, VIEW_BOTTOM, 0, VIEW_BOTTOM], "h"),
    poly([0, HZ + 5, 70, HZ + 3, 130, HZ + 6, WW2, HZ + 3, WW2, VIEW_BOTTOM, 0, VIEW_BOTTOM], "H"),
    ...Array.from({ length: 3 }, (_, i) => hline(0, HZ + 8 + i * 3, WW2, "q")),
    // path to the barn
    poly([97, VIEW_BOTTOM, 104, VIEW_BOTTOM, 101, HZ + 6, 99, HZ + 6], "x"),
    // farmhouse + barn
    poly([84, HZ + 7, 84, HZ - 4, 96, HZ - 12, 108, HZ - 4, 108, HZ + 7], "b"), poly([86, HZ - 4, 96, HZ - 10, 106, HZ - 4], "B"),
    rect(93, HZ + 1, 6, 6, "k"), line(93, HZ + 1, 98, HZ + 6, "B"), line(98, HZ + 1, 93, HZ + 6, "B"),
    rect(94, HZ - 7, 4, 3, "F"), vline(96, HZ - 7, 3, "k"),
    poly([110, HZ + 7, 110, HZ - 1, 118, HZ - 6, 126, HZ - 1, 126, HZ + 7], "k"), rect(114, HZ + 1, 3, 3, "f"), rect(119, HZ + 1, 3, 3, "F"),
    rect(122, HZ - 9, 2, 4, "k"),
    // windmill tower (blades animated)
    poly([139, HZ + 7, 141, HZ - 9, 145, HZ - 9, 147, HZ + 7], "k"), line(141, HZ + 4, 146, HZ - 5, "c"), rect(140, HZ - 12, 6, 3, "k"),
    // graveyard (left pane), dead tree
    stamp("_tomb", 22, HZ + 2), stamp("_tomb", 34, HZ + 4), stamp("_tomb", 46, HZ + 1), stamp("_tomb", 56, HZ + 5),
    vline(29, HZ + 3, 6, "k"), hline(27, HZ + 5, 5, "k"),
    line(16, VIEW_BOTTOM, 19, HZ - 14, "k", 2), line(18, HZ - 4, 10, HZ - 14, "k"), line(18, HZ - 9, 26, HZ - 18, "k"), line(15, HZ - 12, 12, HZ - 17, "k"),
    // fence with crows, haystacks, scarecrow, pumpkins
    hline(60, HZ + 9, 120, "k"), hline(60, HZ + 12, 120, "k"), ...Array.from({ length: 11 }, (_, i) => vline(62 + i * 11, HZ + 7, 8, "k")),
    stamp("_crow", 73, HZ + 5), stamp("_crow", 128, HZ + 5, { flip: "x" }), stamp("_crow", 161, HZ + 5),
    stamp("_hay", 150, HZ + 6), stamp("_hay", 162, HZ + 8),
    vline(80, HZ - 1, 12, "k"), hline(75, HZ + 2, 11, "W"), circ(80, HZ - 2, 2, "v"), poly([77, HZ - 4, 83, HZ - 4, 81, HZ - 7, 79, HZ - 7], "k"), rect(78, HZ + 2, 5, 5, "b"),
    stamp("_pumpkin", 40, VIEW_BOTTOM - 7), stamp("_pumpkin", 116, VIEW_BOTTOM - 6), stamp("_jack_big", 170, VIEW_BOTTOM - 11),
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
anim("hw_window_fx", { w: WW2, h: WH2, frames: 240, fps: 8 },
  clip(inView, (c) => {
    const p = c.phase, f = c.frame
    cloud(c, -30 + ((p + 0.2) % 1) * 255, 34, 13)
    cloud(c, -30 + ((p * 2 + 0.65) % 1) * 255, 42, 9)
    // windmill blades
    for (let b = 0; b < 4; b++) {
      const a = p * TAU * 2 + b * TAU / 4
      c.line(143, HZ - 11, Math.round(143 + Math.cos(a) * 11), Math.round(HZ - 11 + Math.sin(a) * 11), "k", 2)
    }
    c.px(143, HZ - 11, "v")
    // bats
    for (let i = 0; i < 3; i++) {
      const q = (p * (i + 1) + i * 0.37) % 1
      bat(c, -6 + q * 207, 32 + i * 6 + Math.sin(q * TAU * 3) * 3, (f + i) % 2 === 0)
    }
    // ghost drifting over the graves
    const gx = Math.round(40 + Math.sin(p * TAU) * 16), gy = Math.round(HZ - 4 + Math.sin(p * TAU * 3) * 2)
    c.ellipse(gx, gy, 3, 3, "i"); c.rect(gx - 3, gy, 7, 4, "i")
    for (let k = 0; k < 7; k += 2) c.px(gx - 3 + k, gy + 4 + ((k + f) % 2), "i")
    c.px(gx - 1, gy - 1, "k"); c.px(gx + 1, gy - 1, "k"); c.px(gx, gy + 1, "C")
    // flickering farmhouse window + wisps
    const fl = [0, 1, 1, 0, 1, 2, 1, 1][f % 8]
    if (fl === 0) c.rect(94, HZ - 7, 2, 3, "f")
    if (fl === 2) c.rect(94, HZ - 7, 2, 2, "l")
    for (let i = 0; i < 2; i++) {
      const x = Math.round(120 + i * 30 + Math.sin((p + i * 0.4) * TAU) * 10), y = Math.round(HZ + 9 + Math.sin((p * 3 + i) * TAU) * 2)
      c.px(x, y, "U"); c.px(x - 1, y, "u"); c.px(x + 1, y, "u"); c.px(x, y - 1, "u")
    }
  }))

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

// previews (static + animated layer)
scene("hw_window_preview", { w: WW2, h: WH2 }, stamp("hw_window", 0, 0), stamp("hw_window_fx", 0, 0))
scene("hw_portrait_preview", { w: PS, h: PS }, stamp("hw_portrait", 0, 0), stamp("hw_portrait_fx", 0, 0))
