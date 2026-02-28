# Helene

An iOS app for women navigating perimenopause and menopause — built to track symptoms, understand patterns, and get personalized guidance through an on-device AI companion.

---

## What is Helene?

Helene is a private, data-first health companion designed around the real experience of the menopause transition. Every feature exists to help women understand what's happening in their body, spot patterns over time, and show up to their doctor with something useful.

All health data stays on-device. The AI companion uses Apple's on-device Foundation Models — nothing is sent to the cloud.

---

## Features

### Daily Check-In
Log how you feel each day: mood (1–5), symptoms (hot flashes, brain fog, fatigue, joint pain, anxiety, and more), sleep quality, energy, stress, lifestyle triggers, and a free-text note. The home screen shows today's entry with a mood-responsive card.

### Weekly MRS Assessment
A structured 11-question Menopause Rating Scale questionnaire (~3 minutes). Tracks three domains — somatic, psychological, and urogenital — and generates a total severity score over time. Prompted automatically once a week after the first 7 days.

### Insights Dashboard
Charts built with Swift Charts for mood, sleep quality, energy, stress, and MRS scores across four time ranges: 7 days, 30 days, 3 months, and all time. Identifies the most frequent symptoms and highlights trends at a glance.

### Treatment & Lifestyle Log
Track HRT, supplements, medications, and lifestyle changes with start dates, status (started / adjusted / paused / stopped), and optional notes. The AI reads this log and connects treatments to symptom changes in the data.

### AI Companion (iOS 26+)
A chat interface powered by Apple's on-device `LanguageModelSession`. The AI knows your full health history — check-in log, MRS scores, treatment entries, and profile — and uses it in every response. It can analyze patterns, prepare doctor visit summaries, explain symptoms in context, and suggest evidence-based interventions. Includes pre-built quick actions and graceful fallback for devices without Apple Intelligence.

### Community
An anonymous forum with channels, post creation, upvotes, bookmarks, and full-text search. Users set a pseudonym and avatar during first-time community setup.

### Doctor Report
Generates a structured health summary from logged data to bring to an appointment.

### Calm Tools
Quick breathing exercises (1–5 minutes) accessible directly from the home screen.

### Curated Articles
Educational content on menopause topics — understanding your body, tracking patterns, sleep — presented as illustrated cards on the home screen.

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI | SwiftUI |
| State | `@Observable`, `@Environment` |
| Persistence | SwiftData (`CheckInEntry`, `MRSEntry`, `TreatmentEntry`) |
| Profile | `UserDefaults` |
| AI | Apple Foundation Models — `LanguageModelSession`, `@Generable` (iOS 26+) |
| Charts | Swift Charts |

---

## Project Structure

```
Helene/
├── HeleneApp.swift               # App entry point, auth routing
├── Design/
│   └── HeleneTheme.swift         # Color palette, spacing, radius tokens
├── Models/
│   ├── UserProfile.swift         # @Observable profile, UserDefaults persistence
│   ├── CheckInEntry.swift        # SwiftData model — daily check-in
│   ├── MRSEntry.swift            # SwiftData model — weekly MRS assessment
│   └── TreatmentEntry.swift      # SwiftData model — treatment log
├── Auth/
│   ├── AuthManager.swift         # Authentication state
│   ├── WelcomeView.swift         # Sign-in / sign-up
│   └── EmailAuthView.swift
├── Onboarding/
│   └── OnboardingView.swift      # 9-step personalization flow
├── Home/
│   ├── MainTabView.swift         # Root tab navigation
│   ├── HomeView.swift            # Dashboard — check-in, quick actions, articles
│   ├── DailyCheckInView.swift
│   ├── ArticleView.swift
│   ├── CalmToolsView.swift
│   └── TreatmentLogView.swift
├── Assessment/
│   └── WeeklyAssessmentView.swift # MRS questionnaire
├── Insights/
│   ├── InsightsView.swift         # Charts and trend analysis
│   └── TreatmentLogView.swift
├── AI/
│   ├── AICompanionView.swift      # On-device AI chat (iOS 26+)
│   └── UnifiedVoiceView.swift
├── Community/
│   ├── CommunityView.swift
│   ├── CommunityModels.swift
│   ├── CommunitySetupView.swift
│   ├── ChannelView.swift
│   ├── PostDetailView.swift
│   └── MyProfileView.swift
└── Profile/
    ├── ProfileSettingsView.swift
    └── DoctorReportView.swift
```

---

## Getting Started

### Requirements

- **Xcode 16+**
- **iOS 18+** to run the app
- **iOS 26+ with Apple Intelligence enabled** for the AI Companion (iPhone 15 Pro or later)

### Running the App

1. Open `Helene.xcodeproj` in Xcode
2. Select your Team under **Signing & Capabilities**
3. Run on a physical device or simulator (iOS 18+)
4. For AI features: run on a device with Apple Intelligence enabled in **Settings > Apple Intelligence & Siri**

---

## Privacy

- All health data (check-ins, assessments, treatments) is stored locally on-device via SwiftData
- The AI Companion runs entirely on-device using Apple's Foundation Models — no health data leaves the device
- Community posts use an anonymous pseudonym chosen at setup
