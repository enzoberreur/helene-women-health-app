import SwiftData
import Foundation

@Model
final class TreatmentEntry {
    var id:       UUID   = UUID()
    var date:     Date   = Date()
    var category: String = "hrt"      // hrt | supplement | lifestyle | medication
    var name:     String = ""
    var status:   String = "started"  // started | stopped | adjusted | paused
    var note:     String = ""

    init(category: String = "hrt", name: String = "", status: String = "started",
         date: Date = Date(), note: String = "") {
        self.id       = UUID()
        self.date     = date
        self.category = category
        self.name     = name
        self.status   = status
        self.note     = note
    }
}
