import XCTest

/// Simulator helper: puts the app in animated mode and adds the large widget to the Home
/// Screen through SpringBoard, so the real WidgetKit renderer can be recorded with
/// `xcrun simctl io <device> recordVideo`. Not a substitute for the physical-device gates.
final class HomeScreenWidgetUITests: XCTestCase {
    func testAddAnimatedWidgetToHomeScreen() throws {
        let app = XCUIApplication()
        app.launch()
        app.buttons["Animated aquarium (experimental)"].firstMatch.tap()
        let code = app.switches["Frame-index barcode"].firstMatch
        if code.value as? String == "0" { code.switches.firstMatch.tap() }

        XCUIDevice.shared.press(.home)
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        XCTAssertTrue(springboard.wait(for: .runningForeground, timeout: 10))

        // Enter edit mode by long-pressing empty wallpaper.
        springboard.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.62)).press(forDuration: 1.5)
        let edit = springboard.buttons["Edit"].firstMatch
        if edit.waitForExistence(timeout: 5) {
            edit.tap()
            let add = springboard.buttons.matching(NSPredicate(format: "label CONTAINS[c] 'Add Widget'")).firstMatch
            XCTAssertTrue(add.waitForExistence(timeout: 5))
            add.tap()
        } else {
            let plus = springboard.buttons.matching(NSPredicate(format: "label CONTAINS[c] 'Add Widget'")).firstMatch
            XCTAssertTrue(plus.waitForExistence(timeout: 5))
            plus.tap()
        }

        let search = springboard.searchFields.firstMatch
        XCTAssertTrue(search.waitForExistence(timeout: 5))
        search.tap()
        search.typeText("Pixel Aquarium")
        let result = springboard.cells.containing(.staticText, identifier: "Pixel Aquarium").firstMatch
        if result.waitForExistence(timeout: 5) {
            result.tap()
        } else {
            springboard.staticTexts["Pixel Aquarium"].firstMatch.tap()
        }

        let addWidget = springboard.buttons.matching(NSPredicate(format: "label CONTAINS[c] 'Add Widget'")).firstMatch
        XCTAssertTrue(addWidget.waitForExistence(timeout: 5))
        addWidget.tap()

        let done = springboard.buttons["Done"].firstMatch
        if done.waitForExistence(timeout: 5) { done.tap() }
        add(XCTAttachment(screenshot: XCUIScreen.main.screenshot()))
    }
}
