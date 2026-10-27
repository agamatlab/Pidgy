import SwiftUI
import WidgetKit

struct AquariumWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: SharedConfigurationStore.widgetKind, provider: AquariumTimelineProvider()) { entry in
            AquariumWidgetView(entry: entry)
        }
        .configurationDisplayName("Pixel Aquarium")
        .description("Large aquarium that blends into the Pixel Aquarium wallpaper.")
        .supportedFamilies([.systemLarge])
        .contentMarginsDisabled()
    }
}

@main
struct AquariumWidgetBundle: WidgetBundle {
    var body: some Widget {
        AquariumWidget()
    }
}
