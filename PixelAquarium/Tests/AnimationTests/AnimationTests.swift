import XCTest
@testable import PixelAquarium

final class AnimationTests: XCTestCase {
    private var engine: AquariumAnimationEngine!

    override func setUpWithError() throws {
        engine = try AquariumAnimationEngine.load()
    }

    func testGeneratedDataMatchesManifest() {
        XCTAssertEqual(engine.validate(), [])
        XCTAssertEqual(engine.clip.fps, 8)
        XCTAssertEqual(engine.clip.loopDuration, 30)
        XCTAssertEqual(engine.clip.frameCount, 240)
        XCTAssertEqual(engine.clip.elements.count, 2)
    }

    func testFrameIndexFormula() {
        XCTAssertEqual(engine.frameIndex(elapsed: 0), 0)
        XCTAssertEqual(engine.frameIndex(elapsed: 0.124), 0)
        XCTAssertEqual(engine.frameIndex(elapsed: 0.125), 1)
        XCTAssertEqual(engine.frameIndex(elapsed: 29.99), 239)
        XCTAssertEqual(engine.frameIndex(elapsed: 30), 0)
        XCTAssertEqual(engine.frameIndex(elapsed: 3600 + 1), 8)
    }

    /// Fish never leave the canvas (no clipping at the widget's invisible edge), move at most
    /// one art pixel per frame, loop seamlessly, and always face the way they swim.
    func testFishPatrolInsideCanvasSmoothlyFacingTheirMotion() {
        let clip = engine.clip
        for el in clip.elements {
            for f in 0..<clip.frameCount {
                let n = (f + 1) % clip.frameCount
                XCTAssertGreaterThanOrEqual(el.x[f], 0, "\(el.id) clipped left at \(f)")
                XCTAssertLessThanOrEqual(el.x[f] + el.frameWidth, clip.canvasWidth, "\(el.id) clipped right at \(f)")
                XCTAssertGreaterThanOrEqual(el.y[f], 0)
                XCTAssertLessThanOrEqual(el.y[f] + el.frameHeight, clip.canvasHeight)
                XCTAssertLessThanOrEqual(abs(el.x[n] - el.x[f]), 1, "\(el.id) jump at \(f)")
                XCTAssertLessThanOrEqual(abs(el.y[n] - el.y[f]), 1, "\(el.id) vertical jump at \(f)")
                if el.x[n] > el.x[f] { XCTAssertFalse(el.flip[f], "\(el.id) swims right facing left at \(f)") }
                if el.x[n] < el.x[f] { XCTAssertTrue(el.flip[f], "\(el.id) swims left facing right at \(f)") }
            }
        }
    }

    func testFishMoveInOppositeDirectionsAtDifferentSpeeds() {
        let a = engine.clip.elements[0], b = engine.clip.elements[1]
        let opposite = (0..<engine.clip.frameCount).filter { a.flip[$0] != b.flip[$0] }.count
        XCTAssertGreaterThan(Double(opposite) / Double(engine.clip.frameCount), 0.9)
        let range = { (el: AnimationClip.Element) in el.x.max()! - el.x.min()! }
        XCTAssertNotEqual(range(a), range(b))
        XCTAssertNotEqual(a.baseYish, b.baseYish)
    }

    func testDriverLayoutCoversEveryFrameOnce() {
        let s = engine.schedule
        var seen = Set<Int>()
        for font in 0..<s.fontCount {
            for glyph in 0..<s.glyphsPerFont { seen.insert(s.frame(font: font, glyph: glyph)) }
        }
        XCTAssertEqual(seen, Set(0..<s.frameCount))
    }

    func testAnchorIsLoopAlignedAndInThePast() {
        let s = engine.schedule
        let now = Date(timeIntervalSince1970: 1_800_000_017.4)
        let anchor = s.anchor(for: now)
        XCTAssertEqual(anchor.timeIntervalSince1970.truncatingRemainder(dividingBy: 30), 0)
        XCTAssertGreaterThanOrEqual(now.timeIntervalSince(anchor), 60)
        XCTAssertLessThan(now.timeIntervalSince(anchor), 90)
        // Same anchor for every render inside one loop window.
        XCTAssertEqual(s.anchor(for: now.addingTimeInterval(5)), anchor)
    }

    func testPredictedFrameLagsIdealClockByTwoSeconds() {
        let s = engine.schedule
        let t = Date(timeIntervalSince1970: 1_800_000_010) // 10 s into a 30 s loop
        XCTAssertEqual(s.predictedFrame(at: t), 80 - 16)
        XCTAssertEqual(s.predictedFrame(at: Date(timeIntervalSince1970: 1_800_000_000)), 240 - 16)
    }

    /// Transparent frames need one visible layer at every instant (two only during the short
    /// hand-off overlap), showing the predicted frame; sampled at 1/64 s across two full loops.
    func testExactlyOneLayerVisibleAndShowsPredictedFrame() {
        let s = engine.schedule
        let start = Date(timeIntervalSince1970: 1_800_000_003.3)
        let anchor = s.anchor(for: start)
        var shown: [Int] = []
        for i in 0..<(64 * 60) {
            let date = start.addingTimeInterval(Double(i) / 64 + 0.001)
            let intoSlot = (date.timeIntervalSince(anchor) * Double(s.fps)).truncatingRemainder(dividingBy: 1) / Double(s.fps)
            let visible = (0..<s.fontCount).filter { s.isLayerVisible($0, anchor: anchor, at: date) }
            XCTAssertEqual(visible.count, intoSlot < s.handoffOverlap ? 2 : 1, "layers \(visible) at +\(Double(i) / 64)s")
            // The layer whose slot is current must be among them.
            let j = Int((date.timeIntervalSince(anchor) * Double(s.fps)).rounded(.down)) % s.fontCount
            XCTAssertTrue(visible.contains(j))
            let frame = s.layerFrame(j, anchor: anchor, at: date)
            XCTAssertEqual(frame, s.predictedFrame(at: date))
            if shown.last != frame { shown.append(frame) }
        }
        // Every displayed change advances by exactly one logical frame.
        for (a, b) in zip(shown, shown.dropFirst()) { XCTAssertEqual((b - a + 240) % 240, 1) }
        XCTAssertGreaterThanOrEqual(shown.count, 8 * 60 - 1)
    }

    func testPosterFrameShowsBothFish() {
        let clip = engine.clip
        for el in clip.elements {
            let x = el.x[clip.posterFrame]
            XCTAssertGreaterThanOrEqual(x, 0)
            XCTAssertLessThanOrEqual(x + el.frameWidth, clip.canvasWidth)
        }
    }
}

private extension AnimationClip.Element {
    var baseYish: Int { y.reduce(0, +) / max(1, y.count) }
}
