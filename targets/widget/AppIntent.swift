import WidgetKit
import AppIntents

struct ConfigurationAppIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource { "Configuration" }
    static var description: IntentDescription { "This is an example widget." }

    // An example configurable parameter.
    @Parameter(title: "Favorite Emoji", default: "😃")
    var favoriteEmoji: String
    
    @Parameter(title: "Selected Period", default: "today")
    var selectedPeriod: String
}

struct SelectPeriodIntent: AppIntent {
    static var title: LocalizedStringResource = "Select Period"
    static var openAppWhenRun: Bool = false
    
    @Parameter(title: "Period")
    var period: String
    
    func perform() async throws -> some IntentResult {
        // Store selected period in UserDefaults
        UserDefaults(suiteName: "group.widget.com.suzukibusinesscloud.SalesQA-3.0")?.set(period, forKey: "selectedPeriod")
        
        // Reload widget timeline
        WidgetCenter.shared.reloadTimelines(ofKind: "widget")
        
        return .result()
    }
}
