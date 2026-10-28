# Onboarding Flow Advanced: Personalization, B2B Team Activation, Orchestration, Measurement

Advanced onboarding design for products with multiple personas, team-based accounts, and mixed self-serve and sales-assisted motions: personalized paths, account-level activation, cross-channel orchestration, a flow configuration model, and causal measurement. Fundamentals are in `onboarding-flow-fundamentals.md`.

## 1. Personalized Paths

Branch onboarding on information that changes what the user should do first:

| Signal | Source | Example branch |
|---|---|---|
| Role / job to be done | Intent question at sign-up | Marketer → campaign template; developer → API key + quickstart |
| Company size | Enrichment or question | Small team → self-serve checklist; large org → book onboarding call |
| Acquisition source | UTM / referral | Came from integration marketplace → start with that integration |
| Invited vs self-signed-up | Invite token | Invitee joins existing workspace, skips setup |
| Platform | Device | Mobile → lighter flow, defer setup to desktop |

Rules:
- Ask at most one or two questions, and only if they change the experience.
- Provide a default path when signals are missing.
- Let users switch paths.

## 2. Flow Configuration Model

Keep onboarding definitions in configuration so product teams can iterate without redeploys and experiments can target versions:

```yaml
flow_id: workspace_onboarding
version: 2026-10-a
audience:
  role: [marketer]
  invited: false
steps:
  - id: choose_template
    type: modal
    required: false
    complete_when: { event: template_selected }
  - id: connect_channel
    type: checklist_item
    required: true
    complete_when: { event: channel_connected }
    help_doc: /docs/connect-channel
  - id: send_first_campaign
    type: checklist_item
    required: true
    complete_when: { event: campaign_sent }
activation:
  all_of: [channel_connected, campaign_sent]
  within_days: 7
```

```python
from __future__ import annotations
from dataclasses import dataclass

@dataclass(frozen=True, slots=True)
class StepState:
    step_id: str
    completed: bool

def next_step(flow: dict, completed_events: set[str]) -> str | None:
    for step in flow["steps"]:
        if step["complete_when"]["event"] not in completed_events:
            return step["id"]
    return None

def is_activated(flow: dict, completed_events: set[str]) -> bool:
    return all(e in completed_events for e in flow["activation"]["all_of"])
```

Evaluate completion from server-side events so state is consistent across devices and channels.

## 3. B2B: Account-Level Activation

In team products, retention depends on the account, not one user.

| Level | Example activation |
|---|---|
| User | Completed first key action |
| Team | At least N members active in the first two weeks |
| Account | Integration connected + core workflow used by more than one team member |

Design implications:
- Distinguish the admin/setup user from end users; give each a different path.
- Prompt invites after the admin has experienced value, and make invitees' first session lightweight (pre-configured workspace, clear first task).
- Track activation at both user and account level; sales-assist triggers usually use account-level signals (product-qualified accounts).

## 4. Self-Serve + Sales-Assist (Product-Led Sales)

| Signal | Action |
|---|---|
| Account matches ideal customer profile and stalls on setup | Offer a guided setup call |
| High usage nearing plan limits | Prompt upgrade; notify account owner |
| Security/compliance pages viewed by a large company | Route to sales with context |

Define product-qualified account (PQA) criteria jointly with sales; pass product context (what the account has done) to the CRM so outreach is relevant. Rate-limit human outreach to avoid overwhelming users.

## 5. Cross-Channel Orchestration

```
Event stream ──► onboarding state service ──► decision rules ──► channels
                     (per user/account)                          ├─ in-app message
                                                                 ├─ email (Braze, Customer.io, Iterable, etc.)
                                                                 ├─ push
                                                                 └─ CRM task for CSM
```

Rules:
- One state service decides the next nudge; channels do not run independent schedules that conflict.
- Suppress messages for steps already completed (check state at send time).
- Frequency caps across channels.
- Respect notification preferences and consent; transactional and marketing messages have different legal bases.

## 6. Measuring Causal Impact

| Method | Use |
|---|---|
| A/B test on flow versions | Default when traffic allows; primary metric activation within X days, guardrails on retention and support tickets |
| Holdout group (no onboarding emails / no checklist) | Measure total value of an onboarding program |
| Sequential or Bayesian testing | Smaller traffic, with pre-registered decision rules |
| Difference-in-differences / synthetic control | When randomization is impossible (e.g. sales-assist rollout by region) |

Pitfalls specific to onboarding experiments:
- Activation lift without retention lift: the change may push users through a step without delivering value.
- Novelty effects: measure over full cohorts, not only the first days.
- Unit of randomization: randomize by account in B2B products to avoid contamination among teammates.

## 7. Advanced Analytics

- Funnel by path: compare activation for each personalized branch against the default.
- Survival analysis for time to activation (Kaplan-Meier curves by segment) instead of fixed-window rates only.
- Retention curves by activation status and by onboarding version.
- Qualitative: session replays (with masking of personal data), short in-product surveys at drop-off points.

## 8. Governance

- Owner per flow and per step; review cadence for stale steps.
- Version flows; keep a changelog linked to experiment results.
- Accessibility and localization checks for every new step.
- Privacy review for enrichment and tracking.

## Pitfalls

- Personalization questions whose answers are never used.
- Optimizing individual user activation in products where account-level activation drives retention.
- Uncoordinated emails, in-app prompts, and sales outreach for the same user.
- Declaring wins on activation without checking retention.

## Checklist

- [ ] Personalized paths driven by a small set of meaningful signals, with defaults.
- [ ] Flows defined as versioned configuration; completion computed server-side.
- [ ] User- and account-level activation tracked for B2B.
- [ ] PQA criteria agreed with sales; product context in CRM.
- [ ] Central orchestration with suppression and frequency caps.
- [ ] Experiments randomized at the right unit, with retention guardrails.
