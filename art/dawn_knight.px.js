// Dawn on a medieval street: a brown bear knight rides an armoured polar bear past
// cloaked townsfolk who don't look up from their chores. Loops seamlessly.
pal({
  k: "#16111f",                                              // ink
  N: "#221f3d", n: "#3a3360", s: "#7a4a72", S: "#c86f6a", y: "#f2b07a", Y: "#ffe0a8", // dawn sky
  q: "#2c2640", Q: "#3d3352",                                // far rooftops
  D: "#2e2638", d: "#463a4e", e: "#64546a", E: "#83707f",    // stone / slate
  T: "#2e1e1c", t: "#55372a", u: "#7a5238",                  // timber
  p: "#8a7680", P: "#a8949a",                                // plaster in blue dawn light
  C: "#2a2532", c: "#433c4a", x: "#5e5462",                  // cobbles
  A: "#8a4416", a: "#d9822a", l: "#ffc85a", w: "#fff4c8",    // amber light
  b: "#eef0f6", B: "#c2c6d6", i: "#8a8ea6",                  // polar bear
  h: "#8a5630", H: "#5a341c", j: "#b07a48",                  // brown bear
  m: "#a8b2c2", M: "#626a80", z: "#e4eaf2",                  // steel
  r: "#b0303c", R: "#6a1a28", o: "#e0b040",                  // heraldry
  g: "#3c4a3c", G: "#262e28",                                // cloak green
  v: "#4a3a5c", V: "#2c223a",                                // cloak plum
  f: "#5a4434", F: "#382a20",                                // cloak brown
  K: "#c89878",                                              // skin / hands
})
ramps("kNnsSyY", "kqQ", "kDdeE", "kTtu", "kpP", "kCcx", "kAalw", "kiBb", "kHhj", "kMmz", "kRr", "kGg", "kVv", "kFf")

const W = 224, H = 128, FRAMES = 64, TAU = Math.PI * 2
const STREET = 98                                          // back edge of the road

// ------------------------------------------------------------------ parts
sprite("_cobble_a", "xc\ncC")
sprite("_cobble_b", "xxc\nccC")
sprite("_cobble_c", "c")
sprite("_lantern", { outline: "k" }, `
  .MMM.
  MlwlM
  MlwlM
  MalaM
  .MMM.`)
sprite("_bracket", "MMMMM\n...M.\n..M..")
sprite("_shutter_win", { w: 10, h: 12 },
  rect(0, 0, 10, 12, "T"), rect(1, 1, 8, 10, "a"), rect(2, 2, 6, 8, "l"), px(3, 3, "w"), px(4, 3, "w"),
  vline(5, 1, 10, "T"), hline(1, 6, 8, "T"))
sprite("_dark_win", { w: 10, h: 12 },
  rect(0, 0, 10, 12, "T"), rect(1, 1, 8, 10, "N"), vline(5, 1, 10, "T"), hline(1, 6, 8, "T"), px(2, 2, "n"))
group("win", ["_shutter_win", "_shutter_win", "_dark_win"])

// ------------------------------------------------------------------ buildings
// timber-framed house; lit or dark windows chosen per placement
const house = (name, w, h, roof) => sprite(name, { w: w + 4, h: h + 1 }, (c) => {
  const top = 18
  c.poly([0, top + 1, (w + 4) / 2, 0, w + 4, top + 1], roof)
  c.poly([4, top, (w + 4) / 2, 3, w, top], roof === "d" ? "e" : "t")
  for (let y = 6; y < top; y += 4) for (let x = 0; x < w + 4; x++) if (c.is(x, y, "*")) c.px(x, y, roof === "d" ? "D" : "T")
  c.rect(2, top, w, h - top, "p")
  c.rect(2, top + 1, w, 2, "P")
  for (const x of [2, 2 + Math.floor(w / 3), 1 + Math.floor((2 * w) / 3), w + 1]) c.vline(x, top, h - top, "t")
  for (const y of [top, top + 24, h - 1]) c.hline(2, y, w, "t")
  c.line(3, top + 23, 2 + Math.floor(w / 3) - 1, top + 1, "t")
  c.line(w, top + 23, 2 + Math.floor((2 * w) / 3), top + 1, "t")
  c.stamp("win", 2 + Math.floor(w / 3) + 2, top + 6, { seed: w })
  c.rect(Math.floor(w / 2) - 3, h - 16, 10, 16, "T"), c.rect(Math.floor(w / 2) - 2, h - 15, 8, 15, "u")
  c.vline(Math.floor(w / 2) + 2, h - 15, 15, "t"), c.px(Math.floor(w / 2) + 4, h - 8, "o")
})
house("house_a", 40, 64, "d")
house("house_b", 34, 56, "t")
sprite("house_c", { base: "house_a", swap: { p: "e", P: "E" } })     // stone-faced neighbour

sprite("tower", { w: 30, h: 82 },
  rect(2, 14, 26, 68, "d"), rect(2, 14, 26, 2, "e"),
  (c) => { for (let y = 18; y < 82; y += 6) { c.hline(2, y, 26, "D"); for (let x = (y / 6) % 2 ? 4 : 8; x < 28; x += 8) c.vline(x, y - 5, 5, "D") } },
  poly([0, 15, 15, 0, 30, 15], "D"), poly([3, 14, 15, 2, 15, 14], "e"),
  rect(11, 26, 8, 12, "k"), circ(15, 26, 4, "k"), rect(12, 27, 6, 11, "a"), circ(15, 27, 3, "a"), rect(13, 29, 4, 9, "l"),
  rect(9, 60, 12, 22, "T"), circ(15, 60, 6, "T"), rect(10, 61, 10, 21, "t"), circ(15, 61, 5, "t"), vline(15, 56, 26, "T"))

// distant castle silhouette and rooftops
sprite("skyline", { w: W, h: 50 }, (c) => {
  const r = c.rng(4)
  for (let x = -6; x < W; x += 12 + Math.floor(r() * 10)) {
    const hh = 14 + Math.floor(r() * 14), ww = 14 + Math.floor(r() * 8)
    c.rect(x, 50 - hh, ww, hh, "q"), c.poly([x - 2, 51 - hh, x + ww / 2, 42 - hh, x + ww + 2, 51 - hh], "q")
  }
  c.rect(150, 6, 10, 44, "q"), c.poly([148, 7, 155, -4, 162, 7], "q")                           // keep spire
  c.rect(160, 18, 30, 32, "q"), c.rect(184, 10, 10, 40, "q"), c.poly([182, 11, 189, 2, 196, 11], "q")
  for (let x = 160; x < 184; x += 4) c.rect(x, 15, 2, 3, "q")
  c.px(154, 20, "a"), c.px(188, 22, "a"), c.px(168, 28, "a")
})

// ------------------------------------------------------------------ the riders
// Armoured polar bear steed + brown bear knight. Procedural 8-frame walk cycle.
anim("knight", { w: 60, h: 52, frames: 8, fps: 10, outline: "k" }, (c) => {
  const t = c.phase * TAU, bob = Math.round(Math.sin(t * 2) * 0.8 + 0.2)
  const leg = (x, ph, col, dark) => {
    const s = Math.sin(t + ph), lift = Math.max(0, Math.round(Math.cos(t + ph) * 2))
    const fx = x + Math.round(s * 2)
    c.rect(fx, 38 + bob, 5, 11 - lift, col), c.rect(fx, 38 + bob, 2, 11 - lift, dark)
    c.rect(fx - 1, 47 - lift, 7, 2, dark)                                // paw
    c.rect(fx, 42 + bob, 5, 2, "M")                                       // greave band
  }
  // far legs (darker)
  leg(12, Math.PI, "i", "i"), leg(37, 0, "i", "i")
  // body
  c.ellipse(26, 33 + bob, 18, 9, "B")
  c.ellipse(26, 30 + bob, 16, 5, "b")
  // tail
  c.circ(8, 30 + bob, 2, "B")
  // head
  c.circ(46, 27 + bob, 7, "B"), c.circ(44, 25 + bob, 5, "b")
  c.rect(49, 27 + bob, 6, 5, "b"), c.rect(50, 30 + bob, 5, 2, "B"), c.px(55, 27 + bob, "k"), c.px(54, 27 + bob, "k")
  c.circ(42, 20 + bob, 2, "B"), c.px(42, 20 + bob, "i")
  // chanfron (head armour) and eye slit
  c.poly([41, 20 + bob, 52, 22 + bob, 54, 26 + bob, 44, 26 + bob, 40, 24 + bob], "m")
  c.hline(41, 21 + bob, 9, "z"), c.px(47, 24 + bob, "k"), c.px(48, 24 + bob, "k"), c.vline(46, 16 + bob, 5, "r")
  // caparison: red cloth with gold hem and a white bear-paw device
  c.poly([10, 26 + bob, 40, 26 + bob, 42, 40 + bob, 36, 42 + bob, 26, 40 + bob, 16, 42 + bob, 9, 38 + bob], "r")
  c.poly([10, 26 + bob, 40, 26 + bob, 40, 29 + bob, 10, 29 + bob], "R")
  c.line(9, 38 + bob, 16, 41 + bob, "o"), c.line(16, 41 + bob, 26, 39 + bob, "o"), c.line(26, 39 + bob, 36, 41 + bob, "o"), c.line(36, 41 + bob, 41, 39 + bob, "o")
  c.circ(25, 34 + bob, 3, "o"), c.px(22, 30 + bob, "o"), c.px(25, 29 + bob, "o"), c.px(28, 30 + bob, "o")
  // near legs
  leg(16, 0, "B", "i"), leg(40, Math.PI, "B", "i")
  // saddle
  c.rect(19, 23 + bob, 14, 4, "t"), c.hline(19, 23 + bob, 14, "u"), c.rect(18, 21 + bob, 3, 4, "t")

  // ---- brown bear knight (rides with an extra half-step of bob)
  const k = bob + Math.round(Math.sin(t * 2 + 0.8) * 0.6)
  // cape streaming back, flutters
  const fl = Math.round(Math.sin(t * 2) * 1.5)
  c.poly([22, 8 + k, 25, 9 + k, 22, 26 + k, 10, 28 + fl + k, 13, 20 + k], "R")
  c.poly([22, 8 + k, 24, 10 + k, 20, 24 + k, 13, 25 + fl + k], "r")
  // body in breastplate
  c.rect(22, 9 + k, 10, 13, "m"), c.vline(22, 9 + k, 13, "M"), c.vline(30, 10 + k, 11, "z"), c.hline(22, 16 + k, 10, "M")
  // tabard
  c.rect(24, 14 + k, 6, 9, "b"), c.vline(26, 14 + k, 9, "r"), c.hline(24, 17 + k, 6, "r")
  // leg on stirrup
  c.rect(27, 22 + k, 4, 6, "M"), c.rect(27, 27 + k, 6, 2, "m")
  // head: brown fur with a steel kettle-helm
  c.circ(28, 4 + k, 5, "h"), c.rect(31, 4 + k, 5, 3, "h"), c.px(36, 5 + k, "k"), c.px(32, 3 + k, "k")
  c.circ(24, 0 + k, 2, "h"), c.px(24, 0 + k, "H")
  c.poly([22, 1 + k, 27, -3 + k, 33, 1 + k, 35, 2 + k, 21, 2 + k], "m"), c.hline(20, 2 + k, 17, "z")
  c.vline(27, -6 + k, 4, "r"), c.px(28, -6 + k, "r")
  // shield on the far arm side
  c.poly([16, 12 + k, 23, 12 + k, 23, 19 + k, 19, 23 + k, 16, 19 + k], "R"), c.line(17, 13 + k, 21, 20 + k, "o")
  // arm couching the lance; lance with pennant
  c.rect(30, 13 + k, 6, 3, "m"), c.rect(35, 12 + k, 3, 3, "h")
  c.line(10, 16 + k, 59, 6 + k, "u"), c.line(10, 17 + k, 59, 7 + k, "t")
  c.poly([33, 10 + k, 36, 10 + k, 36, 16 + k, 33, 16 + k], "M")          // vamplate
  const pf = c.frame % 2
  c.poly([51, 8 + k, 58, 6 + k, 56, 2 + k - pf, 47, 3 + k + pf], "r"), c.px(52, 6 + k, "o")
})

// ------------------------------------------------------------------ townsfolk (cloaked, faces hidden)
// shared hooded figure; `col`/`dark` cloak colours. Draw the body, arms are per-character.
const hood = (c, x, y, col, dark, lean = 0) => {
  c.poly([x + 1, y + 18, x + 3 + lean, y + 4, x + 6 + lean, y + 1, x + 9 + lean, y + 4, x + 11, y + 18], col)
  c.poly([x + 6 + lean, y + 1, x + 9 + lean, y + 4, x + 11, y + 18, x + 8, y + 18], dark)
  c.circ(x + 6 + lean, y + 3, 3, col), c.rect(x + 5 + lean, y + 3, 3, 3, "k")       // hood opening
  c.px(x + 6 + lean, y + 4, "k"), c.hline(x + 1, y + 18, 11, dark)
}
anim("sweeper", { w: 18, h: 21, frames: 8, fps: 10, outline: "k" }, (c) => {
  const s = Math.round(Math.sin(c.phase * TAU) * 3)
  hood(c, 4, 1, "g", "G", 1)
  c.line(10, 10, 6 + s, 19, "u"), c.poly([3 + s, 18, 9 + s, 18, 10 + s, 20, 2 + s, 20], "o")   // broom
  c.rect(9, 9, 3, 3, "g"), c.px(10, 12, "K")
})
anim("drawer", { w: 16, h: 22, frames: 8, fps: 10, outline: "k" }, (c) => {        // hauls a well bucket
  const s = Math.round(Math.sin(c.phase * TAU) * 1.5)
  hood(c, 1, 3, "v", "V", 1)
  c.rect(10, 7 + s, 3, 3, "v"), c.px(12, 9 + s, "K")
})
anim("pipe_smoker", { w: 14, h: 30, frames: 16, fps: 10, outline: "k" }, (c) => {    // leans by a door
  hood(c, 0, 11, "f", "F")
  c.rect(8, 16, 3, 2, "f"), c.px(10, 15, "t"), c.px(11, 15, "t"), c.px(11, 14, "A")
  const p = c.phase
  for (let i = 0; i < 3; i++) {
    const tt = (p + i / 3) % 1, yy = 13 - Math.round(tt * 12), xx = 11 + Math.round(Math.sin(tt * 6 + i) * 1.5)
    if (yy >= 0) c.px(xx, yy, tt < 0.5 ? "P" : "p")
  }
})
anim("vendor", { w: 16, h: 22, frames: 8, fps: 8, outline: "k" }, (c) => {           // arranges wares
  const s = c.frame < 4 ? 0 : 2
  hood(c, 1, 3, "V", "k")
  c.rect(9, 9 + s, 4, 2, "V"), c.px(12, 10 + s, "K")
})
anim("walker", { w: 14, h: 22, frames: 8, fps: 10, outline: "k" }, (c) => {          // walks with a basket
  const b = c.frame % 4 < 2 ? 0 : 1
  hood(c, 1, 2 + b, "F", "k", 1)
  c.rect(10, 11 + b, 3, 2, "F"), c.rect(9, 13 + b, 5, 4, "u"), c.hline(9, 13 + b, 5, "t"), c.px(10, 12 + b, "l"), c.px(12, 12 + b, "j")
  c.vline(4 + (c.frame % 4 < 2 ? 0 : 3), 21, 1, "k")
})
anim("sitter", { w: 14, h: 14, frames: 16, fps: 8, outline: "k" }, (c) => {          // hunched on the step
  const b = c.frame < 8 ? 0 : 1
  c.poly([1, 13, 3, 4 + b, 6, 1 + b, 9, 4 + b, 12, 13], "v"), c.poly([6, 1 + b, 9, 4 + b, 12, 13, 9, 13], "V")
  c.circ(6, 3 + b, 3, "v"), c.rect(5, 3 + b, 3, 3, "k")
})

// ------------------------------------------------------------------ props
sprite("well", { w: 24, h: 30, outline: "k" },
  rect(2, 18, 20, 12, "d"), rect(2, 18, 20, 2, "e"),
  (c) => { for (let y = 22; y < 30; y += 4) { c.hline(2, y, 20, "D"); for (let x = (y / 4) % 2 ? 4 : 8; x < 22; x += 8) c.vline(x, y + 1, 3, "D") } },
  vline(3, 3, 15, "t"), vline(20, 3, 15, "t"), poly([0, 4, 12, -3, 24, 4, 24, 6, 0, 6], "T"), hline(4, 9, 16, "u"),
  vline(12, 10, 6, "B"), rect(10, 14, 5, 4, "u"))
sprite("stall", { w: 34, h: 28, outline: "k" },
  rect(0, 0, 34, 4, "r"), (c) => { for (let x = 0; x < 34; x += 8) c.rect(x, 0, 4, 4, "P") },
  (c) => { for (let x = 0; x < 34; x += 4) c.poly([x, 4, x + 4, 4, x + 2, 6], x % 8 ? "P" : "r") },
  vline(2, 4, 24, "t"), vline(31, 4, 24, "t"),
  rect(0, 17, 34, 4, "u"), hline(0, 17, 34, "j"), rect(1, 21, 32, 7, "t"),
  circ(6, 15, 2, "S"), circ(10, 15, 2, "r"), circ(8, 13, 2, "S"), rect(16, 13, 6, 4, "o"), circ(27, 15, 2, "y"), circ(25, 14, 2, "o"))
sprite("barrel", { w: 9, h: 11, outline: "k" },
  rect(0, 1, 9, 9, "t"), rect(1, 0, 7, 11, "t"), hline(0, 2, 9, "M"), hline(0, 8, 9, "M"), vline(2, 0, 11, "u"), vline(7, 1, 9, "T"))
sprite("street_lamp", { w: 9, h: 44, outline: "k" },
  vline(4, 8, 36, "T"), vline(3, 8, 36, "t"), rect(1, 40, 7, 4, "T"),
  rect(1, 1, 7, 7, "M"), rect(2, 2, 5, 5, "l"), rect(3, 3, 3, 3, "w"), poly([0, 1, 4, -2, 9, 1], "M"))

// ------------------------------------------------------------------ the street
const knightX = (p) => Math.round(-62 + p * (W + 62))
const walkerX = (p) => Math.round(W - p * (W + 16))

anim("dawn_street", { w: W, h: H, frames: FRAMES, fps: 10 },
  layer("sky", grad(0, 0, W, 72, "NnsSyY", "v", 0.6), rect(0, 72, W, H - 72, "q"), circ(40, 64, 10, "Y"), circ(40, 64, 7, "w")),
  layer("far", stamp("skyline", 0, 18)),
  layer("haze", { light: true, density: 0.4 }, rect(0, 52, W, 16, "k")),

  layer("houses",
    stamp("house_b", -8, 34, { seed: 1 }),
    stamp("house_a", 28, 26, { seed: 2 }),
    stamp("tower", 74, 16),
    stamp("house_c", 104, 28, { seed: 3 }),
    stamp("house_b", 150, 36, { seed: 4, swap: { t: "d", d: "t" } }),
    stamp("house_a", 186, 26, { seed: 5 })),

  layer("sidewalk",
    rect(0, STREET - 4, W, 4, "c"), hline(0, STREET - 4, W, "x"), hline(0, STREET - 1, W, "C"),
    (c) => { for (let x = 3; x < W; x += 9) c.vline(x, STREET - 4, 3, "C") },
    rect(0, STREET, W, H - STREET, "c"),
    scatter("_cobble_*", 0, STREET, W, H - STREET, 260, { rflip: "x", seed: 9 })),

  layer("street_props",
    stamp("_bracket", 58, 72), stamp("_lantern", 60, 74),
    stamp("_bracket", 140, 72), stamp("_lantern", 142, 74),
    stamp("_bracket", 216, 72), stamp("_lantern", 218, 74),
    stamp("street_lamp", 92, STREET - 43),
    stamp("well", 158, STREET - 29),
    stamp("stall", 2, STREET - 27),
    stamp("barrel", 136, STREET - 10), stamp("barrel", 144, STREET - 10)),

  // lantern pools of amber on walls and cobbles
  layer("amber", { light: true },
    circ(63, 77, 7, "k"), circ(145, 77, 7, "k"), circ(221, 77, 7, "k"), circ(96, 16 + STREET - 43, 6, "k"),
    ellipse(96, STREET + 3, 14, 3, "k"), ellipse(63, STREET - 2, 12, 2, "k"), ellipse(145, STREET - 2, 12, 2, "k"), ellipse(221, STREET - 2, 12, 2, "k")),
  layer("amber_soft", { light: true, density: 0.5 },
    circ(63, 77, 16, "k"), circ(145, 77, 16, "k"), circ(221, 77, 16, "k"), circ(96, STREET - 27, 14, "k"),
    ellipse(96, STREET + 5, 24, 6, "k")),

  // townsfolk behind the road
  layer("folk_back",
    stamp("vendor", 12, STREET - 23, { rdelay: true }),
    stamp("pipe_smoker", 63, STREET - 31, { rdelay: true }),
    stamp("sitter", 118, STREET - 15, { rdelay: true }),
    stamp("drawer", 176, STREET - 23, { rdelay: true, flip: "x" })),

  // knight's cast shadow first, then the walker on the far lane and the riders on the near lane
  layer("road_shadows", { shade: true },
    (c) => { const kx = knightX(c.phase); c.ellipse(kx + 30, 119, 24, 2, "k") }),
  (c) => {
    c.stamp("walker", walkerX((c.phase + 0.3) % 1), STREET - 19, { frame: c.frame % 8, flip: "x" })
    c.stamp("knight", knightX(c.phase), 70, { frame: c.frame % 8 })
  },

  // foreground: sweeper by the lamp post on the near side
  layer("folk_front", stamp("sweeper", 150, H - 22, { rdelay: true })),

  glow("lw", { r: 6, strength: 0.35, bands: 3, color: "#ffa040" }),
)
