// Pixel Aquarium fish. Facing right, 2 tail frames each; outline adds 1px all round.
// Strips land in out/anims/fish_a.png (28x9) and fish_b.png (24x8).
pal({
  K: "#3b1608", O: "#f08a24", o: "#b84e18", Y: "#ffcd6e", // goldfish
  N: "#101a40", B: "#3a78de", b: "#1c3a8c", y: "#ffd23f", // blue tang
  w: "#fafafa", k: "#14142a",
})

// Goldfish: 12x7 body + outline = 14x9.
anim("fish_a", { outline: "K", fps: 3 }, `
  oo..OOOO....
  .o.OYYOOOO..
  ..oOYOOOOwkO
  ..oOOOOOOOOO
  ..oOOOOOOOO.
  .o.OOOOOOO..
  oo..oOOo....`,
  frame(),
  frame(grid(0, 0, `
    ___
    _o_
    ooo
    ooo
    ooo
    _o_
    ___`)))

// Blue tang: 10x6 body + outline = 12x8.
anim("fish_b", { outline: "N", fps: 4 }, `
  y..bBBBb..
  yy.bBBBBwk
  .yybBbbBBB
  .yybBBBbbB
  yy.bBBBBb.
  y..bbbb...`,
  frame(),
  frame(grid(0, 0, `
    ___
    _y_
    yyy
    yyy
    _y_
    ___`)))
