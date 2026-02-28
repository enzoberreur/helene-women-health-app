import SwiftData
import Foundation

@Model
final class CheckInEntry {
    var id:           UUID
    var date:         Date
    var mood:         Int       // 1–5  (1=Hard … 5=Great)
    var symptoms:     [String]
    var note:         String
    var sleepQuality: Int       // 1–5  (0 = not logged)
    var energyLevel:  Int       // 1–5  (0 = not logged)
    var stressLevel:  Int       // 1–5  (5=Calm, 0 = not logged)
    var triggers:     [String] = []

    init(mood: Int, symptoms: [String], note: String = "",
         sleepQuality: Int = 0, energyLevel: Int = 0, stressLevel: Int = 0,
         triggers: [String] = []) {
        self.id           = UUID()
        self.date         = Date()
        self.mood         = mood
        self.symptoms     = symptoms
        self.note         = note
        self.sleepQuality = sleepQuality
        self.energyLevel  = energyLevel
        self.stressLevel  = stressLevel
        self.triggers     = triggers
    }

    // MARK: - Helpers

    var moodLabel: String {
        switch mood {
        case 1: return "Hard"
        case 2: return "Low"
        case 3: return "Okay"
        case 4: return "Good"
        case 5: return "Great"
        default: return ""
        }
    }

    var isToday: Bool {
        Calendar.current.isDateInToday(date)
    }
}
