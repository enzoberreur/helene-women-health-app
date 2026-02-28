import SwiftData
import Foundation

// MARK: - MRS (Menopause Rating Scale) Entry
// 11 items, 3 domains, each item scored 0–4
// 0 = None  1 = Mild  2 = Moderate  3 = Severe  4 = Very Severe

@Model
final class MRSEntry {

    var id:   UUID
    var date: Date

    // ── Somatic domain (items 1–4, range 0–16) ──────────────────────────
    /// Hot flushes / sweating — episodes of sudden warmth or perspiration
    var hotFlashes:      Int

    /// Heart discomfort — unusual heartbeat awareness, skipping, racing, tightness
    var heartDiscomfort: Int

    /// Sleep problems — difficulty falling asleep, sleeping through, waking early
    var sleepProblems:   Int

    /// Joint & muscle discomfort — pain in joints, rheumatic complaints
    var jointPain:       Int

    // ── Psychological domain (items 5–8, range 0–16) ─────────────────────
    /// Depressive mood — feeling down, sad, on the verge of tears, mood swings
    var depressiveMood:  Int

    /// Irritability — feeling nervous, inner tension, feeling aggressive
    var irritability:    Int

    /// Anxiety — inner restlessness, feeling panicky
    var anxiety:         Int

    /// Physical & mental exhaustion — decreased performance, memory, concentration
    var exhaustion:      Int

    // ── Urogenital domain (items 9–11, range 0–12) ───────────────────────
    /// Sexual problems — change in sexual desire, activity and satisfaction
    var sexualProblems:  Int

    /// Bladder problems — difficulty urinating, increased need, incontinence
    var bladderProblems: Int

    /// Vaginal dryness — sensation of dryness or burning, difficulty with intercourse
    var vaginalDryness:  Int

    // MARK: - Init

    init(
        hotFlashes:      Int = 0,
        heartDiscomfort: Int = 0,
        sleepProblems:   Int = 0,
        jointPain:       Int = 0,
        depressiveMood:  Int = 0,
        irritability:    Int = 0,
        anxiety:         Int = 0,
        exhaustion:      Int = 0,
        sexualProblems:  Int = 0,
        bladderProblems: Int = 0,
        vaginalDryness:  Int = 0
    ) {
        self.id              = UUID()
        self.date            = Date()
        self.hotFlashes      = hotFlashes
        self.heartDiscomfort = heartDiscomfort
        self.sleepProblems   = sleepProblems
        self.jointPain       = jointPain
        self.depressiveMood  = depressiveMood
        self.irritability    = irritability
        self.anxiety         = anxiety
        self.exhaustion      = exhaustion
        self.sexualProblems  = sexualProblems
        self.bladderProblems = bladderProblems
        self.vaginalDryness  = vaginalDryness
    }

    // MARK: - Computed Domain Scores

    var somaticScore:       Int { hotFlashes + heartDiscomfort + sleepProblems + jointPain }
    var psychologicalScore: Int { depressiveMood + irritability + anxiety + exhaustion }
    var urogenitalScore:    Int { sexualProblems + bladderProblems + vaginalDryness }
    var totalScore:         Int { somaticScore + psychologicalScore + urogenitalScore }

    // MARK: - Severity (validated MRS cutoffs)

    var severityLabel: String {
        switch totalScore {
        case 0...4:  return "No / Little"
        case 5...8:  return "Mild"
        case 9...15: return "Moderate"
        default:     return "Severe"
        }
    }

    var severityShort: String {
        switch totalScore {
        case 0...4:  return "Low"
        case 5...8:  return "Mild"
        case 9...15: return "Moderate"
        default:     return "Severe"
        }
    }

    // MARK: - Helpers

    /// True if this entry was completed in the current calendar week
    var isThisWeek: Bool {
        Calendar.current.isDate(date, equalTo: Date(), toGranularity: .weekOfYear)
    }

    /// Per-item severity label
    static func label(for score: Int) -> String {
        switch score {
        case 0: return "None"
        case 1: return "Mild"
        case 2: return "Moderate"
        case 3: return "Severe"
        default: return "Very Severe"
        }
    }
}
