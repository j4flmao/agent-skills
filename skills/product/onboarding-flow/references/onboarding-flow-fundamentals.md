# Onboarding Flow Fundamentals

Onboarding is the path from sign-up to the first experience of real value (activation). This reference defines the core concepts, how to map an onboarding flow, which metrics to track, and how to instrument it. Patterns, activation design, funnels, and experiments are covered in sibling references.

## 1. Core Concepts

| Concept | Definition |
|---|---|
| Activation | The user reaches an outcome that predicts retention (e.g. "created a project and invited a teammate") |
| Aha moment | The point where the user perceives the product's value; activation is its measurable proxy |
| Time to value (TTV) | Elapsed time from sign-up to activation |
| Setup moment | Prerequisites completed (account, data connected, integration installed) |
| Habit moment | Repeated use that indicates retention (e.g. used on 3 separate days in week 1) |
| Onboarding flow | Screens, prompts, emails, and help that move users from sign-up to activation |

Define activation from data: find early behaviours that distinguish retained from churned users, then validate the definition with experiments (correlation alone does not prove the behaviour causes retention).

## 2. Mapping the Flow

```
Acquisition source → Sign-up → Welcome / intent question → Setup steps
→ First key action → Aha moment (activation) → Habit loop → Expansion (invite, upgrade)
```

For each step document: goal, required user effort, data collected, drop-off rate, and whether the step is necessary now or can be deferred.

| Step type | Examples | Guideline |
|---|---|---|
| Account creation | Email/password, SSO, magic link | Offer SSO; ask only what is needed |
| Intent capture | "What do you want to do first?" | One or two questions that change the experience; skip anything not used |
| Setup | Connect data, install SDK, import contacts | Provide sample data/templates so users can reach value before setup is complete |
| First key action | Create first document, send first campaign | Guide with a checklist or empty-state call to action |
| Social / team | Invite teammates | Prompt after the user has seen value |

## 3. Reducing Friction

- Remove or defer fields; use progressive profiling (ask later, when the answer is needed).
- Default sensible settings; let users change them later.
- Use empty states that explain the next action instead of blank screens.
- Provide templates, sample projects, or demo data.
- Make onboarding skippable and resumable; do not block experienced users.
- Keep the product usable on small screens and accessible (keyboard navigation, screen readers, contrast) during onboarding.

## 4. Metrics

| Metric | Definition | Use |
|---|---|---|
| Sign-up completion rate | Completed sign-ups / started | Form friction |
| Step conversion | Users completing step N+1 / completing step N | Find biggest drop-offs |
| Activation rate | Activated users within X days / new sign-ups in cohort | Primary onboarding outcome |
| Time to value | Median time from sign-up to activation | Speed of value delivery |
| Early retention | Users active in week 2–4 / cohort | Validates activation definition |
| Onboarding checklist completion | Completed items / total | Engagement with guidance |

Report by cohort (sign-up week) and segment (acquisition channel, plan, persona, platform); blended averages hide problems.

## 5. Instrumentation

Track a small, consistent event set with properties:

```json
{"event": "onboarding_step_completed",
 "user_id": "u_123", "account_id": "a_456",
 "properties": {"step": "connect_data_source", "step_index": 3, "flow_version": "2026-10-a",
                "source": "google_ads", "platform": "web"},
 "timestamp": "2026-10-28T09:12:44Z"}
```

| Event | When |
|---|---|
| `signup_started`, `signup_completed` | Account creation |
| `onboarding_step_viewed`, `onboarding_step_completed`, `onboarding_skipped` | Each step |
| `activation_achieved` | Computed server-side when the activation definition is met |
| `invite_sent`, `invite_accepted` | Team expansion |

- Name events in a tracking plan with owners; enforce with schema validation in the analytics pipeline (Segment Protocols, RudderStack tracking plans, Amplitude/Mixpanel data governance, or custom).
- Compute activation server-side from trusted events; client events can be blocked or duplicated.
- Include `flow_version` to compare onboarding variants over time.
- Respect consent requirements for analytics (GDPR/ePrivacy) and avoid sending personal data in event properties.

## 6. Channels Beyond the Product

| Channel | Use |
|---|---|
| In-app guidance (checklists, tooltips, empty states) | Primary path to activation |
| Lifecycle email | Bring users back to unfinished steps; triggered by behaviour, not fixed schedules alone |
| Human touch (sales assist, customer success) | High-value accounts or complex setup |
| Help center and contextual docs | Self-serve problem solving |

## 7. Working Process

1. Define activation and TTV targets from data.
2. Map the current flow with drop-off rates.
3. Interview or watch users who dropped off (qualitative why).
4. Prioritize fixes by drop-off size × ease.
5. Ship changes as experiments where traffic allows (`onboarding-experiments.md`).
6. Review metrics by cohort monthly.

## Pitfalls

- Activation defined as a vanity action (logged in, viewed dashboard).
- Long product tours that users skip and forget.
- Asking for data you never use in sign-up forms.
- Measuring only overall conversion, missing segment-specific problems.
- Client-only tracking that undercounts due to blockers.

## Checklist

- [ ] Activation event defined from retention data and validated.
- [ ] Flow mapped with per-step drop-off and necessity reviewed.
- [ ] Tracking plan with server-side activation computation.
- [ ] Metrics reported by cohort and segment.
- [ ] Qualitative research on drop-off points.
- [ ] Onboarding skippable, resumable, accessible.
