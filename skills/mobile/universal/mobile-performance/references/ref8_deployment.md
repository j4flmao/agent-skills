# Performance-Safe Release and Field Monitoring

Shipping mobile releases without performance regressions: pre-release gates, staged rollouts on Google Play and phased releases on the App Store, field metrics to watch, and how to halt or mitigate a bad release.

## Why Mobile Releases Need Extra Care
- Users update slowly and you cannot roll back an installed binary; a fix requires a new release and review.
- Performance depends on device, OS version and data; lab results do not cover the long tail.
- Store algorithms use technical quality metrics (Android vitals) for discoverability.

## Pre-Release Gates

| Gate | Evidence |
|---|---|
| Benchmarks | Startup, scroll and key journeys within budget vs. last release (Macrobenchmark, XCTest metrics) |
| Baseline Profile | Regenerated for this release and included in the bundle |
| Size | Download/install size delta reviewed (bundletool, App Thinning report) |
| Memory | Repeated-journey test shows no growth |
| New SDKs | Startup and network impact measured |
| Symbol files | R8 `mapping.txt` and dSYMs uploaded for this build |
| Kill switches | Remote-config flags exist for risky new features |

## Google Play: Staged Rollout

```bash
# Using the Play Developer API through fastlane supply (example)
fastlane supply --aab app-release.aab --track production --rollout 0.05
# later
fastlane supply --track production --rollout 0.2 --skip_upload_aab true
```
- Rollout fraction can be increased, or halted; halting stops new installs/updates of that release, but users who already updated keep it.
- Use internal and closed testing tracks plus pre-launch reports before production.
- Android vitals "bad behavior" thresholds (overall): user-perceived crash rate 1.09%, user-perceived ANR rate 0.47%; per device model 8%. Exceeding them can reduce visibility and show warnings on the store listing. Aim far below.
- Other vitals to watch: slow cold start, slow rendering (frames > 16 ms / frozen frames), excessive wake locks, excessive background Wi-Fi scans.
- Play Developer Reporting API provides vitals programmatically for dashboards and gates.

## App Store: Phased Release

- Phased release for automatic updates spreads over 7 days (1%, 2%, 5%, 10%, 20%, 50%, 100% of users with automatic updates on). Users can still update manually from the store at any time.
- A phased release can be paused (up to 30 days total) or released to everyone immediately.
- TestFlight internal and external groups for pre-release feedback; Xcode Organizer shows TestFlight and App Store metrics (launch time, hangs, memory, energy, disk writes, terminations).
- MetricKit payloads arrive roughly daily, so expect a delay before field data is meaningful.

## Field Metrics Dashboard

| Metric | Source | Watch per |
|---|---|---|
| Crash-free sessions/users | Crashlytics, Sentry, Play, Organizer | Version, device, OS |
| ANR rate / hang rate | Android vitals, MetricKit hang diagnostics | Version, device |
| Cold start p50/p90 | Vitals, `ApplicationStartInfo`, MetricKit launch histogram, SDK traces | Version, device tier |
| Jank / hitch rate | JankStats, MetricKit scroll hitch ratio, vitals slow rendering | Screen |
| Memory terminations | `ApplicationExitInfo`, MetricKit exit metrics | Device RAM class |
| Network latency/error rates | APM SDK, backend logs | Endpoint, region |
| Battery | Vitals wake locks, Organizer energy | Version |

Compare the new version with the previous version over the same calendar period and similar device mix; early adopters skew toward newer devices.

## Rollout Decision Flow

```
Release to 1-5%
  -> wait for minimum sample (sessions per platform) and at least 24-48 h
  -> compare new vs. previous version:
       crash/ANR/hang regressions?  ---- yes --> halt/pause, investigate
       startup/jank regression beyond budget? -- yes --> disable flag or halt
       no --> increase to 20%, then 50%, then 100%
```
Automate the comparison where possible (vitals API, crash SDK APIs) and require a human approval step for each increase.

## Mitigation Options When a Release Regresses

| Option | Speed | Scope |
|---|---|---|
| Turn off a remote-config feature flag | Minutes | Users on that version with the flag |
| Server-side change (smaller payloads, disable endpoint feature) | Minutes to hours | All versions |
| Halt Play rollout / pause App Store phased release | Minutes | Stops further spread |
| Hotfix release (expedited review on iOS if needed) | Hours to days | New version |
| Force/flexible update prompts (Play In-App Updates, custom minimum-version check) | Days | Users who accept |

## Over-the-Air Updates (Cross-Platform)
- React Native and other JS-based apps can ship JS bundle updates through services such as EAS Update; stores allow interpreted-code updates that do not change the app's primary purpose. Treat OTA updates with the same staged rollout and metrics as binaries.
- Native code changes always require a store release.

## Post-Release Review
```
Release: 5.12.0 (build 51200)
Rollout: 5% d1, 20% d3, 100% d6
Field deltas vs 5.11.x: cold start p50 -40 ms, ANR rate +0.02 pp (investigated: SDK X), hitch ratio unchanged
Actions: ticket to defer SDK X init; budget unchanged
```

## Checklist
- [ ] Pre-release gates passed and recorded
- [ ] Symbol files uploaded for the exact build
- [ ] Staged / phased rollout configured with owners for each step
- [ ] Dashboard compares new vs. previous version by device tier
- [ ] Kill switches available for risky features
- [ ] Halt/pause procedure documented and tested
