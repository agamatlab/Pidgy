import CoreGraphics
import Foundation

/// A floor-to-ceiling bookcase wall laid out around the calibrated widgets, at art resolution.
/// Every widget becomes a compartment of the bookcase: shelf boards run exactly along its top
/// and bottom edges and uprights along its sides, with brass brackets at its corners. The light
/// rim iOS draws round every widget then sits on the lit edges of boards and uprights instead of
/// on open wall. Elsewhere shelves and bays repeat at their usual spacing, filled with books.
enum BookshelfRoom {
    struct Pieces {
        /// Room art whose top `ceiling` rows (beams, chandelier) are kept.
        var room: PixelBuffer
        var ceiling: Int
        /// Bottom-aligned rows of books on transparent strips.
        var books: [PixelBuffer]
        /// Floor laid from `floorY` down.
        var floor: PixelBuffer
    }

    static let board = 4, upright = 5, shelfPitch = 34, bayPitch = 44

    // palette (art colours, unlit)
    static let woodDark = RGBA(r: 23, g: 14, b: 11), wood = RGBA(r: 42, g: 26, b: 19), woodMid = RGBA(r: 67, g: 42, b: 29)
    static let woodLight = RGBA(r: 99, g: 64, b: 41), gilt = RGBA(r: 180, g: 138, b: 44), giltLight = RGBA(r: 236, g: 201, b: 106)
    static let back = RGBA(r: 16, g: 10, b: 9), black = RGBA(r: 10, g: 7, b: 16)

    /// `widgets` are widget rectangles in art pixels. `floorY` is where the floor starts.
    static func render(_ p: Pieces, size: PixelSize, widgets: [CGRect], floorY: Int) -> PixelBuffer {
        var img = PixelBuffer(width: size.width, height: size.height, fill: back)
        let top = p.ceiling
        let boxes = widgets.map { PixelRect(x: Int($0.minX.rounded()), y: Int($0.minY.rounded()), width: Int($0.width.rounded()), height: Int($0.height.rounded())) }
        func inWidget(_ x: Int, _ y: Int) -> Bool { boxes.contains { x >= $0.x && x < $0.maxX && y >= $0.y && y < $0.maxY } }

        // Shelf boards: one just above and one just below every widget, the rest spread evenly.
        var boards = boxes.flatMap { [$0.y - board, $0.maxY] }
        boards = fill(fixed: boards, from: top + 2, to: floorY - board, pitch: shelfPitch)
        // Uprights: one either side of every widget, the rest spread evenly.
        var posts = boxes.flatMap { [$0.x - upright, $0.maxX] }
        posts = fill(fixed: posts, from: -2, to: size.width - upright + 2, pitch: bayPitch)

        // books on every shelf (between boards), outside the widgets
        var row = 0
        let ys = ([top] + boards + [floorY]).sorted()
        for (a, b) in zip(ys, ys.dropFirst()) where b - a > 10 {
            let strip = p.books[row % p.books.count], offset = (row * 97) % max(1, strip.width - size.width)
            let shelfTop = a + (a == top ? 0 : board), height = b - shelfTop
            for y in shelfTop..<b {
                let sy = strip.height - (b - y)                     // bottom-aligned on the shelf
                guard sy >= 0, height > 6 else { continue }
                for x in 0..<size.width where !inWidget(x, y) {
                    let c = strip.pixel((x + offset) % strip.width, sy)
                    if c.a >= 128 { img.set(x, y, RGBA(r: c.r, g: c.g, b: c.b)) }
                }
            }
            row += 1
        }
        // compartment backs inside the widgets: lit plank panelling (a near-black back made iOS's
        // light rim stand out), each plank with a lit edge and a dark seam
        for r in boxes { for y in max(0, r.y)..<min(size.height, r.maxY) { for x in max(0, r.x)..<min(size.width, r.maxX) {
            let k = (x - r.x) % 9
            img.set(x, y, k == 0 ? woodDark : k == 1 ? woodLight : woodMid)
        } } }
        // boards (front lip lit along the top, shadow under) and uprights (lit left edge)
        // The wood row/column touching a widget's edge is always the lit one: iOS's light rim lands
        // on it and reads as the lit lip of the shelf.
        let tops = Set(boxes.map { $0.y }), lefts = Set(boxes.map { $0.x })
        for y0 in boards {
            let profile: [RGBA] = tops.contains(y0 + board) ? [woodDark, woodMid, woodMid, woodLight] : [woodLight, woodMid, woodMid, woodDark]
            for x in 0..<size.width {
                for (dy, c) in profile.enumerated() where y0 + dy >= top && y0 + dy < floorY && !inWidget(x, y0 + dy) { img.set(x, y0 + dy, c) }
                if y0 + board < floorY, !inWidget(x, y0 + board) { img.set(x, y0 + board, black) }
            }
        }
        for x0 in posts {
            let profile: [RGBA] = lefts.contains(x0 + upright) ? [woodDark, wood, wood, woodMid, woodLight] : [woodLight, woodMid, wood, wood, woodDark]
            for y in top..<floorY {
                for (dx, c) in profile.enumerated() where x0 + dx >= 0 && x0 + dx < size.width && !inWidget(x0 + dx, y) { img.set(x0 + dx, y, c) }
            }
        }
        // brass brackets where board meets upright at each widget corner (the rim's corners land here)
        for r in boxes {
            for (cx, cy, sx, sy) in [(r.x - 1, r.y - 1, -1, -1), (r.maxX, r.y - 1, 1, -1), (r.x - 1, r.maxY, -1, 1), (r.maxX, r.maxY, 1, 1)] {
                for k in 0..<5 {
                    for (x, y) in [(cx + sx * k, cy), (cx, cy + sy * k)] where !inWidget(x, y) && x >= 0 && y >= 0 && x < size.width && y < size.height {
                        img.set(x, y, k == 0 ? giltLight : gilt)
                    }
                }
                let kx = cx + sx * 2, ky = cy + sy * 2
                if !inWidget(kx, ky), kx >= 0, ky >= 0, kx < size.width, ky < size.height { img.set(kx, ky, giltLight) }
            }
        }
        // rounded inner corners: pixel-art quarter circles of wood inside each compartment's corners,
        // far wider than the curve iOS cuts (~12 art px), so that curve always falls on wood
        for r in boxes { roundCorners(&img, r, radius: 20) }
        // ceiling from the room art, floor below
        for y in 0..<min(top, p.room.height) { for x in 0..<min(size.width, p.room.width) { img.set(x, y, p.room.pixel(x, y)) } }
        img.blit(p.floor, x: (size.width - p.floor.width) / 2, y: floorY - 2)
        light(&img, top: top, floorY: floorY, boards: boards, widgets: boxes)
        return img
    }

    /// Fills a compartment's four inner corners with wood cut to a quarter circle, the cut edge a
    /// lit lip with a dark line inside it, and a brass stud in each corner piece.
    static func roundCorners(_ img: inout PixelBuffer, _ r: PixelRect, radius R: Int) {
        let rad = Double(R)
        for (cx, cy, sx, sy) in [(r.x, r.y, 1, 1), (r.maxX - 1, r.y, -1, 1), (r.x, r.maxY - 1, 1, -1), (r.maxX - 1, r.maxY - 1, -1, -1)] {
            for ly in 0..<R { for lx in 0..<R {
                let x = cx + sx * lx, y = cy + sy * ly
                guard x >= 0, y >= 0, x < img.width, y < img.height else { continue }
                let d = hypot(rad - (Double(lx) + 0.5), rad - (Double(ly) + 0.5))   // from the circle's centre
                if d > rad + 1 { img.set(x, y, (lx + ly) % 7 == 0 ? wood : woodMid) }
                else if d > rad { img.set(x, y, woodLight) }                       // lit lip along the curve
                else if d > rad - 1 { img.set(x, y, woodDark) }                    // shadow just inside it
            } }
            img.set(cx + sx * 3, cy + sy * 3, giltLight); img.set(cx + sx * 4, cy + sy * 3, gilt); img.set(cx + sx * 3, cy + sy * 4, gilt)
        }
    }

    /// Fixed positions kept as they are; gaps between them filled at about `pitch`.
    static func fill(fixed: [Int], from lo: Int, to hi: Int, pitch: Int) -> [Int] {
        let anchors = ([lo] + fixed.filter { $0 > lo && $0 < hi } + [hi]).sorted()
        var out: [Int] = []
        for (a, b) in zip(anchors, anchors.dropFirst()) {
            out.append(a)
            let n = Int((Double(b - a) / Double(pitch)).rounded())
            if n > 1 { for i in 1..<n { out.append(a + (b - a) * i / n) } }
        }
        out.append(hi)
        return Array(Set(out)).sorted()
    }

    /// Candle light: dim blue ambient, warm pools round the chandelier and a candle on every
    /// third shelf, strongest along the widgets' boards so their edges read as lit wood.
    static func light(_ img: inout PixelBuffer, top: Int, floorY: Int, boards: [Int], widgets: [PixelRect]) {
        var lamps: [(x: Double, y: Double, r: Double, p: Double)] = [(110, 26, 90, 0.9)]
        for (i, y) in boards.enumerated() where i % 3 == 1 {
            let x = 20 + (i * 53) % 180
            guard !widgets.contains(where: { x >= $0.x - 8 && x < $0.maxX + 8 && y >= $0.y - 14 && y < $0.maxY + 8 }) else { continue }
            drawCandle(&img, x: x, baseY: y)
            lamps.append((Double(x), Double(y - 10), 56, 0.85))
        }
        for r in widgets {
            lamps.append((Double(r.x + r.width / 2), Double(r.y - 12), Double(max(r.width, r.height)) * 0.9, 0.8))   // the sconce above
            lamps.append((Double(r.x + r.width / 2), Double(r.y + r.height / 2), Double(max(r.width, r.height)) * 0.8, 0.75)) // inside the compartment
        }
        let amb = (r: 0.33, g: 0.31, b: 0.5), warm = (r: 1.0, g: 0.72, b: 0.42)
        for y in top..<floorY + 60 where y < img.height {
            for x in 0..<img.width {
                var l = amb
                for lamp in lamps {
                    let d = hypot(Double(x) - lamp.x, Double(y) - lamp.y)
                    guard d < lamp.r else { continue }
                    let f = (1 - d / lamp.r) * (1 - d / lamp.r) * lamp.p
                    l = (max(l.r, amb.r + warm.r * f), max(l.g, amb.g + warm.g * f), max(l.b, amb.b + warm.b * f))
                }
                let c = img.pixel(x, y)
                if c == flame || c == flameTip { continue }
                img.set(x, y, RGBA(r: UInt8(min(255, Double(c.r) * l.r * 1.25)), g: UInt8(min(255, Double(c.g) * l.g * 1.25)),
                                   b: UInt8(min(255, Double(c.b) * l.b * 1.25))))
            }
        }
    }

    static let flame = RGBA(r: 255, g: 176, b: 58), flameTip = RGBA(r: 255, g: 240, b: 176)
    static func drawCandle(_ img: inout PixelBuffer, x: Int, baseY: Int) {
        img.fillRect(x: x, y: baseY - 8, width: 2, height: 8, RGBA(r: 232, g: 220, b: 192))
        img.set(x, baseY - 9, black); img.set(x, baseY - 10, flame); img.set(x, baseY - 11, flameTip)
    }
}
