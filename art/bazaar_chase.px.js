// Bird's-eye bazaar at noon: a brown bear chomps at a panda's backside as she flails in laps
// around the fountain. Shoppers turn their heads to follow; awnings and wires cast shadows.
pal({
  k: "#1a1220",
  Z: "#7a5a38", z: "#a07a4a", S: "#c9a46e", s: "#e2c48e",          // sandstone plaza
  r: "#c8363e", R: "#7e1f2a", c: "#f2e4c4", C: "#c4ad86",            // awning red / cream
  t: "#2f9a90", T: "#1d5a5e", n: "#4058a8", N: "#26306a",            // teal / indigo
  y: "#eab030", Y: "#a86c1a", g: "#6aa040", G: "#3a6428",            // mustard / green
  v: "#9a50a8", V: "#58306a", o: "#e8782e", O: "#a4461a",            // purple / orange
  w: "#9a6438", W: "#5e3a22",                                        // wood
  a: "#62cce0", A: "#2e86a8", f: "#f2fcff",                          // water / white
  e: "#e4d6b8", E: "#ae9c7c",                                        // fountain stone
  h: "#8e5830", H: "#583218", j: "#c08650",                          // brown bear
  b: "#f6f6fa", B: "#c6c6d4", K: "#26232c",                          // panda
  p: "#ee6c80", P: "#8e2440", u: "#c88a5a",                          // mouth / skin
})
ramps("kZzSs", "kRr", "kCc", "kTt", "kNn", "kYy", "kGg", "kVv", "kOo", "kWw", "kAaf", "kEe", "kHhj", "kBb", "kPp")

const W = 256, H = 176, FRAMES = 60, TAU = Math.PI * 2
const CX = 128, CY = 88, RX = 80, RY = 38                    // the race track around the fountain

// ------------------------------------------------------------------ ground
sprite("_slab", { w: 16, h: 16 },
  rect(0, 0, 16, 16, "S"), hline(0, 15, 16, "z"), vline(15, 0, 16, "z"), hline(0, 0, 15, "s"), vline(0, 0, 15, "s"))
sprite("_slab_half", { w: 8, h: 16 },
  rect(0, 0, 8, 16, "S"), hline(0, 15, 8, "z"), vline(7, 0, 16, "z"), hline(0, 0, 7, "s"), vline(0, 0, 15, "s"))

// ------------------------------------------------------------------ stall goods (8x8, seen from above)
sprite("_spice", { w: 8, h: 8 }, circ(3, 4, 3, "Y"), circ(3, 4, 3, "W"), circ(3, 4, 2, "o"), circ(3, 3, 1, "y"), px(2, 2, "s"))
sprite("_pot", { w: 8, h: 8 }, circ(3, 4, 3, "O"), circ(3, 4, 2, "o"), circ(3, 4, 1, "k"), px(1, 2, "s"))
sprite("_fruit", { w: 8, h: 8 }, circ(2, 3, 1, "o"), circ(5, 3, 1, "y"), circ(3, 6, 1, "g"), circ(6, 6, 1, "o"), px(2, 2, "s"), px(5, 2, "s"))
sprite("_cloth", { w: 8, h: 8 }, rect(0, 1, 7, 6, "v"), hline(0, 2, 7, "y"), hline(0, 4, 7, "V"), hline(0, 5, 7, "c"))
sprite("_lamp", { w: 8, h: 8 }, ellipse(3, 4, 3, 2, "Y"), ellipse(3, 4, 2, 1, "y"), px(6, 3, "y"), px(7, 2, "y"), px(2, 3, "s"))
group("goods", ["_spice", "_spice", "_pot", "_fruit", "_cloth", "_lamp"])

// ------------------------------------------------------------------ stall: awning seen from above, front edge south
sprite("stall", { w: 44, h: 30, outline: "k" },
  rect(1, 17, 42, 12, "W"), rect(2, 18, 40, 10, "w"), hline(2, 18, 40, "j"),
  (c) => {
    const r = c.rng(5), goods = ["_spice", "_pot", "_fruit", "_cloth", "_lamp"], tints = [{}, { o: "r", y: "o" }, { o: "g", y: "y" }, { o: "y", Y: "O" }]
    for (let i = 0; i < 5; i++) c.stamp(goods[Math.floor(r() * 5)], 3 + i * 8, 19, { swap: tints[Math.floor(r() * 4)] })
  },
  (c) => { for (let x = 0; x < 44; x += 8) { c.rect(x, 0, 4, 17, "r"); c.rect(x + 4, 0, 4, 17, "c") } },
  (c) => { for (let x = 0; x < 44; x += 4) c.circ(x + 2, 16, 2, (x % 8) ? "c" : "r") },
  hline(0, 8, 44, "k"),                                     // ridge of the pitched awning
  shade([0, 9, 44, 10]), light([0, 0, 44, 3], 1, 0.5),
  px(0, 0, "W"), px(43, 0, "W"))
for (const [n, sw] of [["t", { r: "t", R: "T" }], ["n", { r: "n", c: "y", C: "Y" }], ["g", { r: "g", R: "G" }],
                       ["v", { r: "v", c: "o", C: "O" }], ["o", { r: "o", c: "c" }]])
  sprite("stall_" + n, { base: "stall", swap: sw })
group("stalls", ["stall", "stall_t", "stall_n", "stall_g", "stall_v", "stall_o"])

// ------------------------------------------------------------------ props
sprite("palm", { w: 22, h: 22 }, (c) => {
  c.circ(11, 11, 4, "k"), c.circ(11, 11, 3, "O"), c.circ(11, 11, 2, "Z")
  for (let i = 0; i < 7; i++) {
    const th = i / 7 * TAU + 0.3, x1 = 11 + Math.cos(th) * 10, y1 = 11 + Math.sin(th) * 10
    c.line(11, 11, Math.round(x1), Math.round(y1), "k", 3)
  }
  for (let i = 0; i < 7; i++) {
    const th = i / 7 * TAU + 0.3, x1 = 11 + Math.cos(th) * 9, y1 = 11 + Math.sin(th) * 9
    c.line(11, 11, Math.round(x1), Math.round(y1), "g")
    c.px(Math.round(11 + Math.cos(th + 0.25) * 6), Math.round(11 + Math.sin(th + 0.25) * 6), "G")
  }
  c.circ(11, 11, 1, "W")
})
sprite("rug", { w: 26, h: 16, outline: "k" },
  rect(0, 0, 26, 16, "R"), box(1, 1, 24, 14, "y"), rect(3, 3, 20, 10, "r"),
  poly([13, 4, 19, 8, 13, 12, 7, 8], "n"), poly([13, 6, 16, 8, 13, 10, 10, 8], "c"),
  (c) => { for (let y = 1; y < 16; y += 2) { c.px(-0, y, "c"); c.px(25, y, "c") } })
sprite("rug_b", { base: "rug", swap: { R: "N", r: "n", n: "o", y: "c" } })
sprite("crate", { w: 14, h: 12, outline: "k" },
  rect(0, 0, 14, 12, "w"), box(0, 0, 14, 12, "W"), hline(1, 6, 12, "W"),
  circ(3, 3, 1, "o"), circ(7, 3, 1, "o"), circ(10, 3, 1, "y"), circ(3, 9, 1, "g"), circ(7, 9, 1, "g"), circ(10, 9, 1, "o"))
sprite("jars", { w: 16, h: 10 },
  circ(3, 4, 3, "k"), circ(3, 4, 2, "O"), circ(3, 4, 1, "k"),
  circ(9, 5, 3, "k"), circ(9, 5, 2, "o"), circ(9, 5, 1, "k"),
  circ(13, 3, 2, "k"), circ(13, 3, 1, "n"), px(2, 3, "s"), px(8, 4, "s"))

sprite("_bulb_r", "r"), sprite("_bulb_y", "y"), sprite("_bulb_t", "a"), sprite("_bulb_v", "v")
group("bulbs", ["_bulb_r", "_bulb_y", "_bulb_t", "_bulb_v"])

// ------------------------------------------------------------------ stall placements: [group pick, x, y, rot]
const STALLS = [
  ...[0, 1, 2, 3, 4].map((i) => [6 + i * 50, 0, 0]),                     // north row, fronts face south
  ...[0, 1, 2, 3, 4].map((i) => [6 + i * 50, H - 30, 180]),              // south row
  [0, 40, 270], [0, 92, 270],                                           // west, fronts face east
  [W - 30, 40, 90], [W - 30, 92, 90],                                   // east
]
const stallBox = ([x, y, rot]) => rot % 180 ? [x, y, 32, 46] : [x, y, 46, 32]

// ------------------------------------------------------------------ the chase
const trackAt = (a) => [CX + RX * Math.cos(a), CY + RY * Math.sin(a)]
const heading = (a) => Math.atan2(RY * Math.cos(a), -RX * Math.sin(a))
const pandaA = (p) => p * TAU
const gap = (p) => 30 + 7 * Math.sin(p * TAU * 3)                         // lunges in, falls back, lunges again
const bearA = (p) => {
  const a0 = pandaA(p), [px, py] = trackAt(a0)
  let a = a0
  while (Math.hypot(...trackAt(a).map((v, i) => v - [px, py][i])) < gap(p)) a -= 0.01
  return a
}

// draw a creature from [u (forward), v (side), r, colour, detail?] parts: outlines first, then fills
const creature = (c, x, y, th, parts, k = 1) => {
  const cs = Math.cos(th) * k, sn = Math.sin(th) * k
  const pt = ([u, v]) => [Math.round(x + u * cs - v * sn), Math.round(y + u * sn + v * cs)]
  for (const p of parts) if (!p[4]) { const [px, py] = pt(p); c.circ(px, py, Math.round(p[2] * k) + 1, "k") }
  for (const p of parts) { const [px, py] = pt(p); p[2] < 1 ? c.px(px, py, p[3]) : c.circ(px, py, Math.round(p[2] * k), p[3]) }
}

const bearParts = (f) => {
  const g = Math.sin(f / 4 * TAU) * 2.5, open = f % 4 < 2
  return [
    [-7 + g, -7, 2, "H"], [-7 - g, 7, 2, "H"], [5 - g, -7, 2, "H"], [5 + g, 7, 2, "H"],
    [-5, 0, 6, "h"], [1, 0, 6, "h"], [9, 0, 5, "h"], [6, -4, 2, "H"], [6, 4, 2, "H"], [13, 0, 3, "j"],
    [-3, 0, 3, "j", 1], [-6, 2, 1, "j", 1],
    [10, -2, 0, "k", 1], [10, 2, 0, "k", 1],
    ...(open
      ? [[15, 0, 2, "P", 1], [14, 0, 1, "p", 1], [16, -2, 0, "f", 1], [16, 2, 0, "f", 1], [17, -1, 0, "f", 1], [17, 1, 0, "f", 1]]
      : [[16, 0, 0, "k", 1], [15, -1, 0, "f", 1], [15, 1, 0, "f", 1]]),
  ]
}
const pandaParts = (f) => {
  const s = Math.sin(f / 4 * TAU), sway = Math.round(s * 2)            // butt swings one way, head the other
  const flap = Math.abs(Math.round(Math.cos(f / 4 * TAU) * 2))           // arms flung out sideways
  // each limb is a chain shoulder -> elbow -> paw, so it stays attached as it flails
  const limb = (u0, v0, u1, v1) => [[u0, v0, 2, "K"], [(u0 + u1) / 2, (v0 + v1) / 2, 2, "K"], [u1, v1, 2, "K"]]
  return [
    ...limb(-5, -3 + sway, -6 + s * 3, -6 + sway), ...limb(-5, 3 + sway, -6 - s * 3, 6 + sway),
    ...limb(2, -3, 4 + s, -6 - flap), ...limb(2, 3, 4 - s, 6 + flap),
    [-10, sway, 1, "b"],
    [-5, sway, 5, "b"], [0, 0, 5, "b"], [3, 0, 4, "K"], [7, -sway, 4, "b"],
    [6, -3 - sway, 1, "K"], [6, 3 - sway, 1, "K"],
    [-6, sway - 2, 2, "B", 1], [-1, -2, 2, "B", 1], [-4, sway + 1, 1, "f", 1],
    [9, -2 - sway, 1, "K", 1], [9, 2 - sway, 1, "K", 1], [9, -2 - sway, 0, "f", 1], [9, 2 - sway, 0, "f", 1],
    [11, -sway, 0, "K", 1], [12, -sway, 0, "p", 1],
  ]
}

// shoppers: [x, y, robe, head]
const FOLK = [
  [40, 33, "t", "c"], [90, 33, "v", "y"], [168, 33, "n", "c"], [216, 34, "o", "r"],
  [42, 143, "g", "c"], [100, 144, "r", "n"], [160, 144, "y", "v"], [214, 142, "c", "t"],
  [104, 74, "N", "c"], [154, 100, "R", "y"], [118, 108, "G", "o"],      // sitting on the fountain rim
]

anim("bazaar_chase", { w: W, h: H, frames: FRAMES, fps: 12 },
  layer("ground",
    pattern("_slab", 0, 0, W, H, { rswap: [{}, {}, { S: "s" }, { S: "z", s: "S" }] }),
    // mosaic ring around the fountain
    circ(CX, CY, 30, "N"), circ(CX, CY, 29, "t"), circ(CX, CY, 27, "c"),
    (c) => { for (let i = 0; i < 24; i++) { const th = i / 24 * TAU; c.circ(Math.round(CX + Math.cos(th) * 28), Math.round(CY + Math.sin(th) * 28), 1, i % 2 ? "n" : "y") } },
    circ(CX, CY, 25, "S"), ring(CX, CY, 25, "z")),

  layer("rugs", stamp("rug", 6, 136 - 0 - 20), stamp("rug_b", 222, 116), stamp("crate", 58, 132), stamp("crate", 188, 34),
    stamp("jars", 64, 36), stamp("jars", 186, 134)),

  // fountain: stone basin, water with ripples, spout spraying droplets
  layer("fountain",
    circ(CX + 2, CY + 3, 21, "k"),
    circ(CX, CY, 21, "k"), circ(CX, CY, 20, "E"), circ(CX, CY, 19, "e"), ring(CX, CY, 17, "E"), circ(CX, CY, 16, "A"),
    (c) => {
      for (let k = 0; k < 3; k++) {
        const r = Math.round(((c.phase * 3 + k / 3) % 1) * 11) + 5
        c.ring(CX, CY, r, r > 13 ? "A" : "a")
      }
      c.circ(CX, CY, 5, "k"), c.circ(CX, CY, 4, "E"), c.circ(CX, CY, 3, "e"), c.circ(CX, CY, 1, "a"), c.px(CX, CY, "f")
      for (let i = 0; i < 8; i++) {
        const th = i / 8 * TAU + c.phase * TAU, d = 6 + ((c.frame + i * 3) % 6)
        c.px(Math.round(CX + Math.cos(th) * d), Math.round(CY + Math.sin(th) * d), "f")
      }
    }),

  // dust kicked up behind both runners
  (c) => {
    for (const [A, lag] of [[pandaA(c.phase), 0], [bearA(c.phase), 0]]) {
      for (let k = 1; k <= 3; k++) {
        const [x, y] = trackAt(A - 0.07 * k - lag), r = 4 - k + (c.frame % 2)
        c.circ(Math.round(x), Math.round(y), r, k === 1 ? "s" : "S"), c.px(Math.round(x) - 1, Math.round(y) - 1, "s")
      }
    }
  },

  // cast shadows: stalls (tall), palms, shoppers and the runners (panda's hops lift her)
  layer("shadows", { shade: true },
    ...STALLS.map((s) => { const [x, y, w, h] = stallBox(s); return rect(x + 3, y + 4, w - 2, h - 2, "k") }),
    (c) => {
      for (const [x, y] of FOLK) c.ellipse(x + 2, y + 3, 6, 5, "k")
      const [px, py] = trackAt(pandaA(c.phase)), hop = c.frame % 4 === 1 ? 2 : 0
      const [bx, by] = trackAt(bearA(c.phase))
      c.ellipse(Math.round(px) + 3 + hop, Math.round(py) + 4 + hop, 11, 8, "k")
      c.ellipse(Math.round(bx) + 3, Math.round(by) + 4, 13, 10, "k")
    }),

  layer("stalls", ...STALLS.map(([x, y, rot], i) => stamp("stalls", x, y, { rot, seed: i * 7 + 1, reseed: true }))),

  // shoppers seen from above: shoulders, arms, headwrap; each turns to watch the panda go by
  (c) => {
    const [px, py] = trackAt(pandaA(c.phase))
    for (const [x, y, robe, head] of FOLK) {
      const th = Math.atan2(py - y, px - x)
      creature(c, x, y, th, [[0, -4, 2, robe], [0, 4, 2, robe], [-1, 0, 3, robe], [2, -4, 1, "u", 1], [2, 4, 1, "u", 1],
        [0, 0, 2, head], [-1, -1, 0, "f", 1], [2, 0, 0, "u", 1], [3, 0, 0, "u", 1]], 1.2)
    }
  },

  // the runners
  (c) => {
    const pa = pandaA(c.phase), ba = bearA(c.phase)
    const [bx, by] = trackAt(ba), [px, py] = trackAt(pa)
    creature(c, px, py - (c.frame % 4 === 1 ? 2 : 0), heading(pa), pandaParts(c.frame), 1.35)
    creature(c, bx, by, Math.atan2(py - by, px - bx), bearParts(c.frame), 1.4)
    // panic: sweat drops spray off her head, and a "!" when the jaws get close
    const th = heading(pa)
    for (let i = 0; i < 3; i++) {
      const t = ((c.frame + i * 2) % 6) / 6, side = i % 2 ? 1 : -1
      const u = 6 - t * 8, v = side * (5 + t * 8)
      c.px(Math.round(px + u * Math.cos(th) - v * Math.sin(th)), Math.round(py + u * Math.sin(th) + v * Math.cos(th)), "a")
    }
    if (gap(c.phase) < 27) c.text(Math.round(px) - 1, Math.round(py) - 18, "!", "f", { shadow: "k" })
  },

  // string lights over the aisles, with their shadows on the ground
  layer("light_shadow", { shade: true }, wire(0, 44, W, 44, 10, "k"), wire(0, 136, W, 136, 10, "k")),
  layer("lights",
    wire(-4, 38, W + 4, 38, 10, "W", { hang: "bulbs", every: 7, seed: 2 }),
    wire(-4, 130, W + 4, 130, 10, "W", { hang: "bulbs", every: 7, seed: 5 })),
)
