import SwiftUI

@Observable
final class UserProfile {

    var firstName:          String      = ""
    var journeyStage:       String      = ""
    var ageRange:           String      = ""   // "under40" | "40-44" | "45-50" | "51-55" | "55+"
    var hrtStatus:          String      = ""   // "none" | "hrt" | "natural" | "considering"
    var exerciseFrequency:  String      = ""   // "rarely" | "sometimes" | "regularly" | "daily"
    var smokingStatus:      String      = ""   // "never" | "former" | "current"
    var alcoholFrequency:   String      = ""   // "rarely" | "occasionally" | "regularly" | "daily"
    var caffeineIntake:     String      = ""   // "none" | "low" | "moderate" | "high"
    var selectedSymptoms:   Set<String> = []
    var primaryGoal:        String      = ""
    var medicalFollowUp:    String      = ""
    var communityPseudonym:  String     = ""
    var communityAvatarSeed: Int        = 0
    /// Set once at first launch — never overwritten
    private(set) var accountCreatedAt: Date = Date()

    private enum Keys {
        static let firstName        = "helene.profile.firstName"
        static let journey          = "helene.profile.journeyStage"
        static let ageRange         = "helene.profile.ageRange"
        static let hrtStatus        = "helene.profile.hrtStatus"
        static let exerciseFreq     = "helene.profile.exerciseFrequency"
        static let smokingStatus    = "helene.profile.smokingStatus"
        static let alcoholFreq      = "helene.profile.alcoholFrequency"
        static let caffeineIntake   = "helene.profile.caffeineIntake"
        static let symptoms         = "helene.profile.symptoms"
        static let goal             = "helene.profile.goal"
        static let medical          = "helene.profile.medical"
        static let pseudonym        = "helene.profile.communityPseudonym"
        static let avatarSeed       = "helene.profile.communityAvatarSeed"
        static let accountCreatedAt = "helene.profile.accountCreatedAt"
    }

    init() {
        let d = UserDefaults.standard
        firstName          = d.string(forKey: Keys.firstName) ?? ""
        journeyStage       = d.string(forKey: Keys.journey) ?? ""
        ageRange           = d.string(forKey: Keys.ageRange) ?? ""
        hrtStatus          = d.string(forKey: Keys.hrtStatus) ?? ""
        exerciseFrequency  = d.string(forKey: Keys.exerciseFreq) ?? ""
        smokingStatus      = d.string(forKey: Keys.smokingStatus) ?? ""
        alcoholFrequency   = d.string(forKey: Keys.alcoholFreq) ?? ""
        caffeineIntake     = d.string(forKey: Keys.caffeineIntake) ?? ""
        selectedSymptoms   = Set(d.stringArray(forKey: Keys.symptoms) ?? [])
        primaryGoal        = d.string(forKey: Keys.goal) ?? ""
        medicalFollowUp    = d.string(forKey: Keys.medical) ?? ""
        communityPseudonym  = d.string(forKey: Keys.pseudonym) ?? ""
        communityAvatarSeed = d.integer(forKey: Keys.avatarSeed)
        // Write creation date only on first launch
        if let stored = d.object(forKey: Keys.accountCreatedAt) as? Date {
            accountCreatedAt = stored
        } else {
            accountCreatedAt = Date()
            d.set(accountCreatedAt, forKey: Keys.accountCreatedAt)
        }
    }

    func save() {
        let d = UserDefaults.standard
        d.set(firstName,               forKey: Keys.firstName)
        d.set(journeyStage,            forKey: Keys.journey)
        d.set(ageRange,                forKey: Keys.ageRange)
        d.set(hrtStatus,               forKey: Keys.hrtStatus)
        d.set(exerciseFrequency,       forKey: Keys.exerciseFreq)
        d.set(smokingStatus,           forKey: Keys.smokingStatus)
        d.set(alcoholFrequency,        forKey: Keys.alcoholFreq)
        d.set(caffeineIntake,          forKey: Keys.caffeineIntake)
        d.set(Array(selectedSymptoms), forKey: Keys.symptoms)
        d.set(primaryGoal,             forKey: Keys.goal)
        d.set(medicalFollowUp,         forKey: Keys.medical)
        d.set(communityPseudonym,      forKey: Keys.pseudonym)
        d.set(communityAvatarSeed,     forKey: Keys.avatarSeed)
    }
}
