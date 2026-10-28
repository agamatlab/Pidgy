import UIKit
import WidgetKit

struct AquariumEntry: TimelineEntry {
    let date: Date
    let role: WidgetRole
    let settings: WidgetSettings
    let background: UIImage?
    let foreground: UIImage?
    let posterFrame: CGImage?
    let engine: AquariumAnimationEngine?
    let error: String?
}

/// One entry, no scheduled refresh. Animation never comes from timeline reloads (PRD FR-07);
/// the app requests a reload only when settings or calibration change.
struct AquariumTimelineProvider: TimelineProvider {
    let role: WidgetRole
    private let store = SharedConfigurationStore.shared

    func placeholder(in context: Context) -> AquariumEntry {
        makeEntry(context: context, recordHeartbeat: false)
    }

    func getSnapshot(in context: Context, completion: @escaping (AquariumEntry) -> Void) {
        completion(makeEntry(context: context, recordHeartbeat: false))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<AquariumEntry>) -> Void) {
        completion(Timeline(entries: [makeEntry(context: context, recordHeartbeat: true)], policy: .never))
    }

    private func makeEntry(context: Context, recordHeartbeat: Bool) -> AquariumEntry {
        let settings = store.settings
        var loadError: String?
        var engine: AquariumAnimationEngine?
        var poster: CGImage?
        do {
            let e = try AquariumAnimationEngine.load()
            engine = e
            poster = try PixelArtRenderer(clip: e.clip).frameImage(e.clip.posterFrame)
        } catch {
            loadError = error.localizedDescription
        }
        // Calibrated background for this widget, else the theme's own art for it.
        let themeArt = settings.theme.theme.art(for: role).flatMap { SceneBundle.image($0.staticArt) }
        let fgArt = settings.theme.theme.art(for: role)?.foreground.flatMap { SceneBundle.image($0) }
        let foreground = settings.mode == .calibration ? nil :
            (UIImage(contentsOfFile: store.foregroundURL(role).path) ?? fgArt.flatMap { UIImage(contentsOfFile: $0.path) })
        let background = settings.mode == .calibration ? nil :
            (UIImage(contentsOfFile: store.backgroundURL(role).path) ?? themeArt.flatMap { UIImage(contentsOfFile: $0.path) })
        if recordHeartbeat {
            store.setHeartbeat(WidgetHeartbeat(renderedAt: Date(), mode: settings.mode,
                                               displayWidthPoints: context.displaySize.width,
                                               displayHeightPoints: context.displaySize.height,
                                               backgroundLoaded: background != nil, error: loadError), role: role)
        }
        return AquariumEntry(date: Date(), role: role, settings: settings, background: background, foreground: foreground,
                             posterFrame: poster, engine: engine, error: loadError)
    }
}
