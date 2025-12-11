import WidgetKit
import SwiftUI

struct Provider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        var config = ConfigurationAppIntent()
        config.selectedPeriod = "today"
        return SimpleEntry(date: Date(), configuration: config, selectedPeriod: "today")
    }

    func snapshot(for configuration: ConfigurationAppIntent, in context: Context) async -> SimpleEntry {
        let period = getSelectedPeriod(from: configuration)
        return SimpleEntry(date: Date(), configuration: configuration, selectedPeriod: period)
    }
    
    func timeline(for configuration: ConfigurationAppIntent, in context: Context) async -> Timeline<SimpleEntry> {
        var entries: [SimpleEntry] = []

        // Generate a timeline consisting of five entries an hour apart, starting from the current date.
        let currentDate = Date()
        let period = getSelectedPeriod(from: configuration)
        for hourOffset in 0 ..< 5 {
            let entryDate = Calendar.current.date(byAdding: .hour, value: hourOffset, to: currentDate)!
            let entry = SimpleEntry(date: entryDate, configuration: configuration, selectedPeriod: period)
            entries.append(entry)
        }

        return Timeline(entries: entries, policy: .atEnd)
    }
    
    private func getSelectedPeriod(from configuration: ConfigurationAppIntent) -> String {
        // Check UserDefaults first (for button interactions), then fall back to configuration
        if let storedPeriod = UserDefaults(suiteName: "group.widget.com.suzukibusinesscloud.SalesQA-3.0")?.string(forKey: "selectedPeriod") {
            return storedPeriod
        }
        return configuration.selectedPeriod.isEmpty ? "today" : configuration.selectedPeriod
    }

//    func relevances() async -> WidgetRelevances<ConfigurationAppIntent> {
//        // Generate a list containing the contexts this widget is relevant in.
//    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
    let configuration: ConfigurationAppIntent
    let selectedPeriod: String
}

struct SpendData: Codable {
  let todaySpent: String
  let thisWeekSpent: String
  let thisMonthSpent: String
  let dailyAverage: String
  let projectSpendForMonth: String
  let totalDays: Int
  let totalDaysCompleted: Int
  let currencySymbol: String
}

// App Group identifier - must match the one in app.json and React Native code
let APP_GROUP_ID = "group.widget.com.suzukibusinesscloud.SalesQA-3.0"
let WIDGET_DATA_KEY = "widgetSpendData"

// Default fallback data
var defaultData: SpendData = SpendData(
    todaySpent: "0",
    thisWeekSpent: "0",
    thisMonthSpent: "0",
    dailyAverage: "0",
    projectSpendForMonth: "0",
    totalDays: 30,
    totalDaysCompleted: 0,
    currencySymbol: "$"
)

// Load widget data from UserDefaults
func loadWidgetData() -> SpendData {
    let defaults = UserDefaults(suiteName: APP_GROUP_ID)
    
    // Try to get as Data first (if stored as Data)
    if let data = defaults?.data(forKey: WIDGET_DATA_KEY),
       let spendData = try? JSONDecoder().decode(SpendData.self, from: data) {
        return spendData
    }
    
    // Fallback: Try to get as string and convert to Data
    if let dataString = defaults?.string(forKey: WIDGET_DATA_KEY),
       let data = dataString.data(using: .utf8),
       let spendData = try? JSONDecoder().decode(SpendData.self, from: data) {
        return spendData
    }
    
    return defaultData
}

func formatWithCurrency(_ amount: String, symbol: String) -> String {
    return "\(symbol)\(amount)"
}

struct widgetEntryView : View {
  var entry: Provider.Entry
  @Environment(\.widgetFamily) var family
  var body: some View {
    switch family {
    case .systemMedium:
      MediumWidgetView(entry: entry)
    default:
      SmallWidgetView(entry: entry)
    }
  }
}

struct MediumWidgetView: View {
  var entry: Provider.Entry
  let data = loadWidgetData()
  
  var body: some View {
    VStack(spacing: 0) {
      // Top portion: Spending Velocity
      SpendingVelocitySection(data: data)
        .frame(maxHeight: .infinity)
      
      // Divider
      Rectangle()
        .fill(Color.gray.opacity(0.2))
        .frame(height: 1)
        .padding(.vertical, 6)
      
      // Bottom portion: Spending Insights
      SpendingInsightsSection(data: data)
        .frame(maxHeight: .infinity)
    }
    .padding(.horizontal, 8)
    .padding(.vertical, 10)
    .background(
      LinearGradient(
        colors: [
          Color(red: 0.96, green: 0.98, blue: 1.0),
          Color.white
        ],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
      )
    )
  }
}

struct SpendingVelocitySection: View {
  let data: SpendData
  
  var progress: Double {
    guard data.totalDays > 0 else { return 0 }
    return Double(data.totalDaysCompleted) / Double(data.totalDays)
  }
  
  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      // Daily Average and Projected
      HStack(spacing: 12) {
        // Daily Average
        VStack(alignment: .leading, spacing: 2) {
          Text("Daily Avg")
            .font(.system(size: 10, weight: .medium))
            .foregroundColor(.secondary)
          Text(formatWithCurrency(data.dailyAverage, symbol: data.currencySymbol))
            .font(.system(size: 18, weight: .bold))
            .foregroundColor(Color(red: 0.15, green: 0.45, blue: 0.85))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        
        // Projected
        VStack(alignment: .trailing, spacing: 2) {
          Text("Projected")
            .font(.system(size: 10, weight: .medium))
            .foregroundColor(.secondary)
          Text(formatWithCurrency(data.projectSpendForMonth, symbol: data.currencySymbol))
            .font(.system(size: 18, weight: .bold))
            .foregroundColor(Color(red: 0.85, green: 0.25, blue: 0.35))
        }
        .frame(maxWidth: .infinity, alignment: .trailing)
      }
      
      // Progress Bar
      VStack(alignment: .leading, spacing: 4) {
        GeometryReader { geometry in
          ZStack(alignment: .leading) {
            // Background
            RoundedRectangle(cornerRadius: 8)
              .fill(Color.gray.opacity(0.15))
              .frame(height: 12)
            
            // Progress
            RoundedRectangle(cornerRadius: 8)
              .fill(
                LinearGradient(
                  colors: [
                    Color(red: 0.35, green: 0.65, blue: 1.0),
                    Color(red: 0.25, green: 0.55, blue: 0.95)
                  ],
                  startPoint: .leading,
                  endPoint: .trailing
                )
              )
              .frame(width: geometry.size.width * progress, height: 12)
          }
        }
        .frame(height: 12)
        
        // Progress Text
        HStack {
          Text("Day \(data.totalDaysCompleted) of \(data.totalDays)")
            .font(.system(size: 9, weight: .medium))
            .foregroundColor(.secondary)
          Spacer()
          Text("\(Int(progress * 100))%")
            .font(.system(size: 9, weight: .bold))
            .foregroundColor(Color(red: 0.25, green: 0.55, blue: 0.95))
        }
      }
    }
  }
}

struct SpendingInsightsSection: View {
  let data: SpendData
  
  var body: some View {
    // Insight Cards
    HStack(spacing: 8) {
      // Today
      InsightCard(
        title: "Today",
        amount: data.todaySpent,
        currencySymbol: data.currencySymbol,
        color: Color(red: 0.95, green: 0.35, blue: 0.25)
      )
      
      // This Week
      InsightCard(
        title: "This Week",
        amount: data.thisWeekSpent,
        currencySymbol: data.currencySymbol,
        color: Color(red: 0.25, green: 0.75, blue: 0.45)
      )
      
      // This Month
      InsightCard(
        title: "This Month",
        amount: data.thisMonthSpent,
        currencySymbol: data.currencySymbol,
        color: Color(red: 0.55, green: 0.35, blue: 0.95)
      )
    }
  }
}

struct InsightCard: View {
  let title: String
  let amount: String
  let currencySymbol: String
  let color: Color
  
  var body: some View {
    VStack(alignment: .leading, spacing: 4) {
      Text(title)
        .font(.system(size: 10, weight: .medium))
        .foregroundColor(.secondary)
      
      Text(formatWithCurrency(amount, symbol: currencySymbol))
        .font(.system(size: 16, weight: .bold))
        .foregroundColor(color)
        .lineLimit(1)
        .minimumScaleFactor(0.7)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(.vertical, 8)
    .padding(.horizontal, 6)
    .background(
      RoundedRectangle(cornerRadius: 12)
        .fill(
          LinearGradient(
            colors: [
              color.opacity(0.12),
              color.opacity(0.08)
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
          )
        )
    )
    .overlay(
      RoundedRectangle(cornerRadius: 12)
        .stroke(color.opacity(0.2), lineWidth: 1)
    )
  }
}

struct SmallWidgetView: View {
  var entry: Provider.Entry
  let data = loadWidgetData()
  
  var selectedPeriod: String {
    entry.selectedPeriod.isEmpty ? "today" : entry.selectedPeriod
  }
  
  var currentInsight: (title: String, amount: String, color: Color) {
    switch selectedPeriod {
    case "week":
      return ("This Week", data.thisWeekSpent, Color(red: 0.25, green: 0.75, blue: 0.45))
    case "month":
      return ("This Month", data.thisMonthSpent, Color(red: 0.55, green: 0.35, blue: 0.95))
    default:
      return ("Today", data.todaySpent, Color(red: 0.95, green: 0.35, blue: 0.25))
    }
  }
  
  var body: some View {
    VStack(spacing: 8) {
      // Period selector buttons
      HStack(spacing: 4) {
        PeriodButton(
          title: "Today",
          period: "today",
          isSelected: selectedPeriod == "today",
          color: Color(red: 0.95, green: 0.35, blue: 0.25)
        )
        
        PeriodButton(
          title: "Week",
          period: "week",
          isSelected: selectedPeriod == "week",
          color: Color(red: 0.25, green: 0.75, blue: 0.45)
        )
        
        PeriodButton(
          title: "Month",
          period: "month",
          isSelected: selectedPeriod == "month",
          color: Color(red: 0.55, green: 0.35, blue: 0.95)
        )
      }
      .padding(.horizontal, 4)
      .padding(.top, 4)
      
      Spacer()
      
      // Display selected insight
      VStack(spacing: 4) {
        Text(formatWithCurrency(currentInsight.amount, symbol: data.currencySymbol))
          .font(.system(size: 64, weight: .bold))
          .foregroundColor(currentInsight.color)
          .lineLimit(1)
          .minimumScaleFactor(0.01)
      }
      .frame(maxWidth: .infinity)
      
      Spacer()
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .padding(0)
    .background(
      LinearGradient(
        colors: [
          Color(red: 0.96, green: 0.98, blue: 1.0),
          Color.white
        ],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
      )
    )
  }
}

struct PeriodButton: View {
  let title: String
  let period: String
  let isSelected: Bool
  let color: Color
  
  var intent: SelectPeriodIntent {
    let intent = SelectPeriodIntent()
    intent.period = period
    return intent
  }
  
  var body: some View {
    Button(intent: intent) {
      Text(title)
        .font(.system(size: 10, weight: .semibold))
        .foregroundColor(isSelected ? .white : color)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 6)
        .background(
          RoundedRectangle(cornerRadius: 6)
            .fill(isSelected ? color : color.opacity(0.1))
        )
    }
    .buttonStyle(.plain)
  }
}

struct widget: Widget {
    let kind: String = "widget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(
            kind: kind,
            intent: ConfigurationAppIntent.self,
            provider: Provider()
        ) { entry in
            widgetEntryView(entry: entry)
                .containerBackground(
                    LinearGradient(
                        colors: [
                            Color(red: 0.96, green: 0.98, blue: 1.0),
                            Color.white
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    for: .widget
                )
        }
        .configurationDisplayName("Budget Insights")
        .description("Shows your daily, weekly and monthly spends.")
        .supportedFamilies([.systemSmall,.systemMedium])
    }
}

extension ConfigurationAppIntent {
    fileprivate static var smiley: ConfigurationAppIntent {
        let intent = ConfigurationAppIntent()
        intent.favoriteEmoji = "??"
        return intent
    }
    
    fileprivate static var starEyes: ConfigurationAppIntent {
        let intent = ConfigurationAppIntent()
        intent.favoriteEmoji = "??"
        return intent
    }
}

#Preview(as: .systemSmall) {
    widget()
} timeline: {
    SimpleEntry(date: .now, configuration: .smiley, selectedPeriod: "today")
    SimpleEntry(date: .now, configuration: .starEyes, selectedPeriod: "week")
  SimpleEntry(date: .now, configuration: .starEyes, selectedPeriod: "month")
}

#Preview(as: .systemMedium) {
    widget()
} timeline: {
    SimpleEntry(date: .now, configuration: .smiley, selectedPeriod: "today")
}

