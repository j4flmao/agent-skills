# Release Trains (Release Engineering)

## 1. The Bottleneck of Feature-Driven Releases
In traditional project management, a release is tied to a feature. (e.g., "We will deploy v2.0 when the Department's PoC is finished"). 
- **The Result**: If the Department is delayed by 3 weeks, all the bug fixes and performance improvements built by the Global R&D team are held hostage. The release becomes massive, highly risky, and causes immense friction between teams.

## 2. The Release Train Model
A **Release Train** decouples releases from features. It is built on a rigid, immutable schedule.
Think of a real subway train: It departs the station every Tuesday at 10:00 AM. 
- If a Department's PoC is merged by 09:59 AM, it gets on the train. 
- If the PoC has bugs or isn't merged until 10:05 AM, it misses the train. The train **does not wait**. The PoC simply catches the next train on Thursday.

## 3. Technical Implementation
### The Cut-Off (Branching)
1. **Trunk**: All teams merge into `main` continuously (using Feature Flags to hide unfinished work).
2. **The Cut**: On Tuesday at 10:00 AM, a CI/CD script automatically cuts a release branch from `main` (e.g., `release/v104`). 
3. **Stabilization**: `main` remains open for new development (the next train). The `release/v104` branch is locked. No new features can be added. 

### Hotfixing the Train
If QA finds a critical bug in `release/v104` during staging:
- The fix is authored and merged into `main` first (to ensure the bug doesn't reappear in the next train).
- The fix is then **cherry-picked** directly into `release/v104`.
- Never merge `release/v104` back into `main`—it creates messy, cyclical merge graphs.

## 4. The Psychological Benefit
When a Department team misses a deadline, there is no panic and no need to ask Global for an "extension". Because the next release train is only a few days (or hours) away, missing a train is a non-event. This drastically lowers enterprise stress and eliminates the culture of "rushing code to make the deadline".
