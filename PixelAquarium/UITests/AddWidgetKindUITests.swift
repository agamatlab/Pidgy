import XCTest

/// Simulator helper: adds the Nth widget of the app from the gallery (0 = first card, 1 = next
/// after one swipe, ...). Pass `WIDGET_PAGE` in the test environment.
final class AddWidgetKindUITests: XCTestCase {
    func testAddWidgetPage() throws {
        let page = Int(ProcessInfo.processInfo.environment["WIDGET_PAGE"] ?? "1") ?? 1
        XCUIDevice.shared.press(.home)
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        XCTAssertTrue(springboard.wait(for: .runningForeground, timeout: 10))
        springboard.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.75)).press(forDuration: 1.5)
        let edit = springboard.buttons["Edit"].firstMatch
        if edit.waitForExistence(timeout: 5) { edit.tap() }
        let addMenu = springboard.buttons.matching(NSPredicate(format: "label CONTAINS[c] 'Add Widget'")).firstMatch
        XCTAssertTrue(addMenu.waitForExistence(timeout: 5)); addMenu.tap()
        let search = springboard.searchFields.firstMatch
        XCTAssertTrue(search.waitForExistence(timeout: 5)); search.tap(); search.typeText("Pixel Aquarium")
        let result = springboard.cells.containing(.staticText, identifier: "Pixel Aquarium").firstMatch
        if result.waitForExistence(timeout: 5) { result.tap() } else { springboard.staticTexts["Pixel Aquarium"].firstMatch.tap() }
        sleep(2)
        for _ in 0..<page { springboard.swipeLeft(); sleep(1) }
        add(XCTAttachment(screenshot: XCUIScreen.main.screenshot()))
        let addWidget = springboard.buttons.matching(NSPredicate(format: "label CONTAINS[c] 'Add Widget'")).firstMatch
        XCTAssertTrue(addWidget.waitForExistence(timeout: 5)); addWidget.tap()
        let done = springboard.buttons["Done"].firstMatch
        if done.waitForExistence(timeout: 5) { done.tap() }
    }
}
