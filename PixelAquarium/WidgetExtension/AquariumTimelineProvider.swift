import UIKit
import WidgetKit

struct AquariumEntry: TimelineEntry {
    let date: Date
    let settings: WidgetSettings
    let background: UIImage?
    let posterFrame: CGImage?
    let engine: AquariumAnimationEngine?
    let error: String?
}

/// One entry, no scheduled refresh. Animation never comes from timeline reloads (PRD FR-07);
/// the app requests a reload only when settings or calibration change.
struct AquariumTimelineProvider: TimelineProvider {
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
        let background = settings.mode == .calibration ? nil :
            (UIImage(contentsOfFile: store.widgetBackgroundURL.path) ?? SceneBundle.staticBackgroundURL().flatMap { UIImage(contentsOfFile: $0.path) })
        if recordHeartbeat {
            store.heartbeat = WidgetHeartbeat(renderedAt: Date(), mode: settings.mode,
                                              displayWidthPoints: context.displaySize.width,
                                              displayHeightPoints: context.displaySize.height,
                                              backgroundLoaded: background != nil, error: loadError)
        }
        return AquariumEntry(date: Date(), settings: settings, background: background,
                             posterFrame: poster, engine: engine, error: loadError)
    }
}
