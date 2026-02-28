# Helene

An iOS 26 brain-dump-to-plan app powered by Apple's on-device Foundation Models and Liquid Glass design.

## What is Helene?

Type whatever's on your mind — a messy thought, a half-baked idea, a list of random things you need to do — and Helene instantly transforms it into a structured plan with headers, priorities, and actionable to-do items. Everything runs on-device using Apple Intelligence. No cloud, no data leaving your phone.

## Platform

- **iOS 26.2+** (iPhone and iPad)
- Requires Apple Intelligence to be enabled on device

## Key Technologies

| Technology | Purpose |
|---|---|
| [Foundation Models](https://developer.apple.com/documentation/FoundationModels) | On-device LLM for plan generation via `LanguageModelSession` |
| [Liquid Glass](https://developer.apple.com/documentation/SwiftUI/Applying-Liquid-Glass-to-custom-views) | iOS 26 material system — blur, reflection, morphing |
| SwiftUI Markdown | Native `Text` markdown rendering for plans and to-do lists |
| `@Generable` + `streamResponse` | Structured, streaming output from the model |

## Local Documentation References

> These files are bundled with Xcode 26 and document the APIs used in this project.

- **Foundation Models**: `/Applications/Xcode.app/Contents/PlugIns/IDEIntelligenceChat.framework/Versions/A/Resources/AdditionalDocumentation/FoundationModels-Using-on-device-LLM-in-your-app.md`
- **Liquid Glass (SwiftUI)**: `/Applications/Xcode.app/Contents/PlugIns/IDEIntelligenceChat.framework/Versions/A/Resources/AdditionalDocumentation/SwiftUI-Implementing-Liquid-Glass-Design.md`

## App Concept & Feature Ideas

### Core Flow

```
[Brain Dump TextField] → Foundation Model → [Structured Plan in Markdown]
```

### Feature Ideas

#### 1. Instant Plan Generation (Core)
User types a brain dump → tap "Make a Plan" → model generates a `PlanOutput` struct with title, summary, sections, and tasks. Rendered live using SwiftUI Markdown text + streaming snapshots so the plan builds token by token on screen.

```swift
@Generable
struct PlanOutput {
    var title: String
    @Guide(description: "One-sentence summary of the goal")
    var summary: String
    @Guide(description: "3 to 6 concrete action items", .count(3...6))
    var tasks: [ActionItem]
}

@Generable
struct ActionItem {
    var title: String
    var description: String
}
```

#### 2. Streaming Plan Build (Delight)
Use `streamResponse(to:generating:)` with `@Generable` so the title appears first, then tasks fill in one by one. With Liquid Glass cards that morph into place as each section arrives.

#### 3. Plan Refinement (Conversation)
After the first plan is generated, keep the same `LanguageModelSession` alive. User can tap any task and say "make this more specific" or "break this into subtasks" — the model has the full context and refines in-place.

#### 4. Priority Tagging
Extend `ActionItem` with a `@Guide`-constrained `Priority` enum (`high`, `medium`, `low`). Render with color-coded glass tints (`.glassEffect(.regular.tint(.red))` for high priority).

#### 5. Time Estimate Extraction
Add an optional `timeframe: String?` field — the model pulls any time references from the brain dump ("by Friday", "this weekend") and surfaces them in the plan header.

#### 6. Export as Markdown
Since the plan is already structured, generate a clean `.md` file via `ShareLink` so users can paste into Notion, Obsidian, or Notes.

#### 7. Plan History
Persist `PlanOutput` structs with SwiftData. Show a history list with glass card cells. Tap to re-open any previous plan.

#### 8. Focus Mode (Single Task)
After a plan is generated, user can tap one task to "focus" on it — the app zooms into that task and shows a simple timer / checklist. Liquid Glass morphing transition between plan view and focus view.

---

## Design System

All UI uses **Liquid Glass** as the primary material:

- **Input card**: `TextEditor` inside `.glassEffect(in: .rect(cornerRadius: 20))`
- **Generate button**: `.buttonStyle(.glassProminent)`
- **Plan cards**: `GlassEffectContainer` with task rows using `.glassEffect()`
- **Morphing**: Glass cards morph from input → plan view using `glassEffectID` + `@Namespace`
- **Background**: Full-bleed gradient or photo behind all glass layers

---

## Project Structure (Planned)

```
Helene/
├── HeleneApp.swift
├── ContentView.swift          # Root navigation
├── Features/
│   ├── BrainDump/
│   │   ├── BrainDumpView.swift        # TextEditor + generate button
│   │   └── BrainDumpViewModel.swift   # LanguageModelSession + streaming
│   └── Plan/
│       ├── PlanView.swift             # Rendered plan with glass cards
│       ├── PlanViewModel.swift        # Plan state + refinement session
│       └── PlanOutput.swift           # @Generable structs
├── Models/
│   └── PlanStore.swift               # SwiftData persistence
└── Design/
    └── GlassComponents.swift          # Reusable glass view helpers
```

---

## Getting Started

1. Open `Helene.xcodeproj` in Xcode 26+
2. Set your Team in Signing & Capabilities
3. Run on a physical device with Apple Intelligence enabled (iPhone 15 Pro or later / iPhone 16)
4. Minimum iOS: **26.2**
