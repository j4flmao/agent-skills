---
name: mobile-analytics
description: >
  Use this skill when the user says 'analytics', 'event tracking', 'Firebase Analytics', 'Mixpanel', 'Amplitude', 'app analytics', 'event logging', 'user properties', 'screen tracking', 'funnel analytics', 'user behavior', 'telemetry'. Track events, screen views, and user properties in mobile apps with privacy compliance. Do NOT use for: server-side analytics or web analytics.
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [mobile, analytics, phase-7, universal]
version: "1.0.0"
author: "j4flmao"
license: "MIT"
---

# Mobile Analytics

## Purpose
Guide for implementing mobile app analytics: event tracking, screen views, user properties, and privacy compliance.

## Agent Protocol

### Trigger
Phrases: "analytics", "event tracking", "Firebase Analytics", "Mixpanel", "Amplitude", "app analytics", "event logging", "user properties", "screen tracking", "funnel analytics", "user behavior", "telemetry"

### Input Context
- Analytics provider (Firebase, Mixpanel, Amplitude, or custom)
- Event taxonomy and naming conventions
- Privacy requirements (GDPR, CCPA, ATT)
- Existing navigation system for automatic screen tracking

### Output Artifact
Analytics module: provider initialization, event tracking service, screen view auto-tracker, user properties manager, consent management, privacy controls.

### Response Format
```
<analytics>
<provider>{init, config, provider selection}</provider>
<events>{schema, naming, automatic, custom}</events>
<screen>{auto-track via navigation listener}</screen>
<privacy>{consent, opt-out, deletion, ATT}</privacy>
</analytics>
```
No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- Events fire with correct schema and reach analytics dashboard
- Screen views tracked automatically via navigation listener
- User properties set on login/update
- GDPR consent flow blocks non-essential events
- ATT prompt appears on iOS 14.5+
- User deletion API removes all stored analytics data

### Max Response Length
6000 tokens

## Workflow

1. **Analytics provider** — Firebase Analytics: free, unlimited, basic segmentation. Mixpanel/Amplitude: advanced funnels, retention, user profiles (paid tier). Custom server: full data control, meet GDPR/CCPA requirements, no third-party dependency.

2. **Event tracking schema** — Event name: `snake_case`, max 40 chars. Properties: typed (string, number, boolean), max 25 per event. Naming convention: `screen_action_object` (e.g., `profile_edit_name`). User properties set at login and on change.

3. **Automatic tracking** — Screen views: hook into navigation listener, dispatch `screen_view` with screen name and class. Crashes: Crashlytics or custom crash reporter. App lifecycle: `app_install`, `app_update`, `app_session_start`, `app_session_end`. All automatic events follow same schema as manual.

4. **Custom events** — Feature usage: `featurename_action` with relevant properties. Non-fatal errors: `error_type` with message/code. Performance: `perf_screen_load`, `perf_api_latency` with duration. Conversion funnels: `funnel_registration_start` → `funnel_registration_complete` with step tracking.

5. **Privacy compliance** — GDPR: consent dialog on first launch, opt-in required for non-essential events. CCPA: opt-out mechanism in settings. Data retention: configure in provider dashboard (max 24 months). Deletion API: provide user data deletion endpoint (custom) or provider's GDPR deletion. Anonymized tracking for EU users.

## Rules

- Event name: `snake_case`, max 40 characters.
- Event properties limited to 25 per event — no unbounded property bags.
- No PII in event properties: no email, name, phone, government ID.
- Screen views tracked automatically via navigation listener — never manual.
- User-identifying properties approved by privacy review before implementation.
- Provide opt-out mechanism accessible from app settings.
- Respect App Tracking Transparency (ATT) on iOS 14.5+ — can't track without permission.
- All analytics traffic must go through a single `AnalyticsService` facade — no direct provider calls in feature code.

## References

- `references/analytics-setup.md` — Provider setup, event schema, screen tracking, user properties
- `references/analytics-privacy.md` — GDPR, CCPA, consent flow, data retention, ATT, data deletion

## Handoff
Hand off to mobile-crash-reporting skill when Crashlytics integration is needed, or to mobile-networking when custom analytics server endpoint is required.
