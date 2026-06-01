---
name: create-brief
description: >
  Use this skill when the user says 'I want to build', 'new app idea', 'create a brief', 'product brief', 'help me define what I am building', or when no existing brief or PRD exists in the docs/ folder. This skill translates a vague idea into a structured Product Brief. It asks 5 targeted questions one at a time, then produces a brief artifact. Do NOT use for: technical specifications, architecture decisions, or user stories. Those come after the brief.
version: "1.1.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [planning, phase-1, documentation, product-brief]
---

# Create Brief

## Purpose

Transform a vague product idea into a structured, one-page Product Brief. This is the first artifact in the planning chain. Every subsequent artifact depends on this one. The brief is the single source of truth for scope — it constrains what follows: PRD, roadmap, design system decisions, and architecture. A well-written brief saves weeks of misalignment by making implicit assumptions explicit before any design or engineering work begins.

The brief is not a commitment. It is a hypothesis — a shared understanding of what we are building, for whom, and why. It will evolve as we learn, but it must be captured in writing before we spend resources on execution.

## Agent Protocol

### Trigger
Exact user phrases: "I want to build", "new app idea", "create a brief", "product brief", "help me define", "help me figure out what I am building", "start a project".

### Input Context
Before activating, verify:
- master-orchestrator has routed here, OR user has directly asked for a brief.
- No existing brief in `docs/` (if one exists, ask: "A brief already exists at {path}. Review or replace?")
- User has at least one sentence describing their idea.

### Output Artifact
Writes to `docs/brief-{YYYY-MM-DD}.md` using the template below. This file is the single source of truth for the project scope.

### Response Format
When asking questions: ask exactly one question. Wait for the user's answer. Do not ask the next question until the current one is answered.

When presenting the draft:
```
## Draft Brief
[insert brief content here]

Does this capture your vision? Reply with changes or 'approved'.
```

When approved:
```
Brief saved to docs/brief-{YYYY-MM-DD}.md
Next skill: create-prd
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output.

### Completion Criteria
- [ ] All 5 questions asked and answered (or user provided enough detail upfront).
- [ ] Brief follows the template below with all sections populated.
- [ ] User explicitly approved the brief (said "approved", "looks good", "yes").
- [ ] File saved to `docs/brief-{YYYY-MM-DD}.md`.
- [ ] No technical implementation details appear in the brief.

### Max Response Length
Question: 1 line + 3-4 word options. Draft: unlimited. Approval: 2 lines.

## Component Architecture / Decision Trees

### When to Use This Skill
```
User wants to build something?
  |-- YES --> Is there an existing brief in docs/?
  |     |-- YES --> Ask: "Review or replace?"
  |     |     |-- Review --> Read existing brief, resume from PRD
  |     |     |-- Replace --> Proceed with new brief
  |     |-- NO  --> Does user have a clear problem statement?
  |           |-- YES --> Has user also defined target users?
  |           |     |-- YES --> Skip Q&A, draft directly (Step 2)
  |           |     |-- NO  --> Ask 5 questions (Step 1)
  |           |-- NO  --> Ask 5 questions (Step 1)
  |-- NO --> Not a brief task. Route to appropriate skill.
```

### Signal vs Noise Decision Tree
```
User input is short (< 50 words)?
  |-- YES --> Ask 5 questions one at a time
  |-- NO  --> Does input contain: target user + problem + differentiator?
        |-- YES --> Draft directly, ask only for timeline + scale
        |-- NO  --> Ask only the missing questions
```

### Q&A Strategy Options

**Option A: Exhaustive Q&A** — User has vague idea. Ask all 5 questions sequentially. Best for: early-stage ideas, first-time founders, non-technical stakeholders.

**Option B: Gap-filling Q&A** — User provided partial information. Ask only missing questions. Best for: users who articulate some parts well but need refinement on specific dimensions.

**Option C: Zero Q&A** — User provided target user, problem, differentiator, timeline, and scale all in one message. Draft directly. Best for: experienced PMs, follow-up briefs, internal projects.

### Tradeoff Matrix
| Approach | Questions Asked | Time to Draft | Risk of Misalignment |
|----------|----------------|---------------|---------------------|
| Exhaustive Q&A | 5 | ~5 turns | Low |
| Gap-filling | 1-4 | ~2 turns | Medium |
| Zero Q&A | 0 | 1 turn | High |

### Product Type Decision Tree
```
What type of product are you building?
  |-- B2B SAAS --> Focus on: buyer persona vs user persona, ROI justification, integration requirements
  |-- B2C CONSUMER --> Focus on: behavioral triggers, acquisition channels, time-to-value
  |-- MARKETPLACE --> Focus on: liquidity strategy, supply-side vs demand-side, chicken-and-egg
  |-- INTERNAL TOOL --> Focus on: user adoption, training needs, integration with existing systems
  |-- API/PLATFORM --> Focus on: developer experience, documentation, onboarding friction
  |-- MOBILE APP --> Focus on: platform choice, offline capability, app store considerations
  |-- HARDWARE + SOFTWARE --> Focus on: firmware constraints, manufacturing timeline, field updates
```

## Workflow

### Step 1: Ask 5 Questions (One at a Time)

Question 1: "Who is the target user? Describe the typical user in one sentence."
Question 2: "What specific problem does this product solve? One sentence."
Question 3: "What makes this different from existing solutions? One sentence."
Question 4: "Scale expectation: how many users in the first 6 months?"
Question 5: "Timeline: when does the MVP need to be ready?"

If the user provides all the information upfront in their first message, skip Q&A and draft directly.

**Question depth refinement**: If the user answers "I don't know" to any question, provide 2-3 concrete options for them to choose from. Do not accept "I don't know" as a final answer — defaulting to generic assumptions creates misalignment later.

**Handling vague answers**:
- **Target user too vague ("everyone")**: push for a specific segment. "If we had to pick one user type to build for first, who would it be?"
- **Problem too broad ("communication is hard")**: ask for a specific scenario. "Walk me through the moment this becomes a problem."
- **Differentiator missing**: ask "What would your customers pay for that they can't get today?"
- **Scale uncertain**: offer ranges. "Is this a team tool (<100 users), a startup (<10K), or a platform play (>100K)?"
- **Timeline unknown**: "What's the soonest you'd want to show this to real users?"

**Question order rationale**: Target user first because it constrains every other answer. Problem second because it validates the user segment. Differentiator third because it tests whether the solution is worth building. Scale fourth because it determines architecture decisions. Timeline last because it is the most negotiable constraint.

**Handling specific edge cases**:
- **User says "I want to clone X"**: Ask "Why does X not solve your problem? What would you do differently?" The differentiator is not "like X but better" — it is "like X but {specific improvement}."
- **User says "for enterprises"**: Push for specifics. Headcount? Industry? Geographic region? Decision-maker role? Enterprise is too broad to be a target user.
- **User says "solves everything"**: Push for the first problem. "If you could only solve one problem for these users, which one has the highest pain?"
- **User says "immediately" or "yesterday"**: Ask "What is the one feature you need to ship first?" When timeline is aggressive, scope must shrink.

### Step 2: Draft the Brief

```markdown
# Product Brief: {project-name}

## Problem Statement
{3-5 sentences. Who has the problem? Why do existing solutions fail? Include specific scenarios or user quotes if available.}

## Target Users
{1-3 sentences describing the primary user persona. Include role, technical level, goals, and context of use.}

## Core Value Proposition
A {type} that helps {target user} {achieve outcome} by {mechanism}.

## Key Features (MVP)
- {Feature 1}: {one-line description of what it does, not how}
- {Feature 2}: {one-line description}
- {Feature 3}: {one-line description}
- {Feature 4}: {one-line description}
- {Feature 5}: {one-line description}

Aim for 3-5 features. No more than 7.

## Out of Scope
- {What explicitly will NOT be in the MVP}
- {Another excluded feature}

Be explicit. Every feature not listed will be assumed included.

## Success Metrics
| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| {metric} | {number} | {tool or event} |
| {metric} | {number} | {tool or event} |

## Technical Constraints
{Platform requirements, budget, compliance, performance baselines, existing systems to integrate with.}

## Timeline
| Milestone | Date |
|-----------|------|
| MVP Launch | {date} |
```

**Draft quality checklist**:
- Every section is populated. No placeholders remain.
- Problem statement is specific to the user's domain, not generic.
- Target user is a specific persona, not "everyone".
- Features describe WHAT, not HOW (no implementation language).
- Out of scope items are genuinely excludable, not deferred scope.
- Success metrics are measurable and have a defined measurement method.
- Technical constraints capture real constraints (platform, budget, compliance), not aspirational stack choices.
- Timeline has specific dates or at least month-level estimates.

**Draft quality heuristics**:
- If problem statement could apply to any product in the same category, it is too generic.
- If target user could be replaced with "a person" and still make sense, it is too vague.
- If a feature mentions a technology by name, rewrite it in user language.
- If out of scope section is empty, push for at least 3 exclusions.

### Step 3: Present and Iterate

Show the draft to the user. Allow up to 3 rounds of changes. After the third round, state: "I suggest we proceed with the current version. We can refine during the PRD phase."

**Iteration protocol**:
- Round 1: Present draft. User requests changes. Apply and re-present.
- Round 2: User requests further changes. Apply and re-present.
- Round 3: Last call. Apply changes. If user wants more: "I suggest we proceed with the current version."

**Common iteration patterns**:
- **Feature creep**: user adds more features. Push back if exceeding 7. "Which of these is truly MVP vs. v2?"
- **Scope confusion**: user includes technical implementation. Move to Technical Constraints section or Out of Scope.
- **Missing metrics**: user cannot define success. Propose standard metrics based on the product type (B2B SaaS: activation rate, retention; Consumer: DAU, time spent; Marketplace: liquidity, conversion).
- **Target user expansion**: user wants to include multiple user types. "Who is the first user we build for? The rest are v2."
- **Timeline disagreement**: user wants aggressive timeline. "If we cut features X, Y, Z, we can make that date."

### Step 4: Save

Write to `docs/brief-{YYYY-MM-DD}.md`.

**File naming convention**: `docs/brief-{YYYY-MM-DD}.md`. If a brief already exists for today, append a counter: `docs/brief-{YYYY-MM-DD}-v2.md`.

## Process Patterns

### Pattern 1: The Shape-Up Sprint Brief
**When**: Team uses Shape-Up methodology (Basecamp)
**Process**: Focus on appetite (how much time is this worth?), rather than timeline. Define the problem in terms of current behavior vs desired behavior. Use fat marker sketches to communicate scope boundaries.
**Output**: Brief with appetite window, problem statement, and "no-go" boundaries.

### Pattern 2: The Lean Canvas Brief
**When**: Idea is extremely early-stage, pre-customer discovery
**Process**: Begin with a Lean Canvas (9 boxes: problem, solution, key metrics, UVP, unfair advantage, channels, customer segments, cost structure, revenue streams). Extract the brief from boxes 1, 2, 4, and 7.
**Output**: Lean Canvas + expanded brief for the strongest hypothesis.

### Pattern 3: The JTBD Brief
**When**: User has clear product examples but fuzzy problem definition
**Process**: Use Jobs To Be Done framework. Ask: "What job does the user hire this product to do?" "What are the functional, emotional, and social dimensions of this job?" "What are the current alternatives the user hires?"
**Output**: Brief organized around the job story: "When {situation}, I want to {motivation}, so I can {expected outcome}."

### Pattern 4: The Competitive Inversion Brief
**When**: Market is crowded and differentiation is unclear
**Process**: Identify competitors. For each, list what users love and hate. The brief focuses on maximizing the hates solved while preserving the loves. Explicitly define who we are NOT building for.
**Output**: Brief with competitive positioning map and explicit non-target users.

## Anti-Patterns

### Anti-Pattern 1: Brief as a Wishlist
The brief lists everything the product could possibly do without prioritizing. This creates an unbounded scope that makes every subsequent phase (PRD, roadmap, development) impossible to estimate. Anti-pattern signal: more than 7 MVP features.

### Anti-Pattern 2: No Target User / "Everyone"
Products built for everyone serve no one. If the brief cannot name a specific user persona with specific needs, it is not ready for PRD. Anti-pattern signal: "users" or "people" without modifiers.

### Anti-Pattern 3: Copycat Differentiator
"Like Uber for X" or "Like Airbnb for Y" without identifying what makes this version uniquely valuable. If the only differentiator is a different vertical, the brief needs more work. Anti-pattern signal: "just like {existing product} but for {different industry}."

### Anti-Pattern 4: Solution-In-Disguise
Features written in technical language that describe HOW rather than WHAT. The brief is about outcomes, not architecture. Anti-pattern signal: feature descriptions mention technologies, protocols, or architectural patterns.

### Anti-Pattern 5: Empty Out of Scope
An empty or minimal out-of-scope section means scope creep is inevitable. Every feature not listed will be assumed included. Anti-pattern signal: "Out of Scope" section has 0-1 items.

### Anti-Pattern 6: Vanity Metrics
Success metrics that feel good but do not validate the value proposition. Total users, total downloads, number of signups — these measure volume, not value. Anti-pattern signal: metrics that can only go up.

### Anti-Pattern 7: The Moving Target
User changes the target user, problem, or differentiator with each iteration round. After round 2, if core elements changed, restart the brief. It was not ready for drafting. Anti-pattern signal: "Actually, the user is not {X} but {Y}."

## Templates

### Standard Product Brief Template
See Step 2 template above.

### Lean Canvas Extract Template
```markdown
# Product Brief: {project-name}

## Problem
{Top 1-3 problems identified in Lean Canvas}

## Solution
{Critical features that address each problem}

## Target Users
{Customer segments from Lean Canvas}

## Unique Value Proposition
{Single, clear, compelling message}

## Key Metrics
{Activity metrics that indicate success}

## Channels
{How users will find the product}
```

### JTBD Story Brief Template
```markdown
# Product Brief: {project-name}

## Job Story
When {situation}, {user} wants to {motivation} so they can {expected outcome}.

## Current Alternatives
{What users do today instead}

## Functional Requirements
{What the solution must do}

## Emotional Requirements
{How the solution must make the user feel}

## Social Requirements
{How the solution affects the user's standing}
```

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Time to first draft | < 5 minutes | From first user message to draft |
| Iteration rounds | <= 3 | Count of revise cycles |
| Brief-to-PRD accuracy | > 80% | PRD features traceable to brief |
| Stakeholder sign-off | 100% | Explicit user approval before save |

## Rules

- One question at a time. Never list all 5 questions in a single message.
- Keep the brief to one page (under 40 lines when rendered).
- No technical implementation details. No architecture. No stack choices.
- If the user says "I don't know" to a question, provide a reasonable default and note it.
- If the user provides a very detailed description upfront, skip directly to Step 2.
- Do NOT ask for confirmation before writing the file. Write it and show it.
- Never include competitive analysis beyond what the user provides as their differentiator.
- Never suggest specific technologies, frameworks, or vendors in the brief.
- Success metrics must be measurable. Avoid vanity metrics (total users).
- Timeline must have at least a month-level estimate. "As soon as possible" is not a date.
- The brief must fit a single page when rendered. No multi-page briefs.
- After approval, no changes. Direct the user to the PRD phase for refinements.
- If the user provides conflicting information (e.g., "B2B app for consumers"), flag the conflict and ask for clarification before proceeding.
- Preserve the user's language for features and problem statements unless they are clearly contradictory.

## Common Pitfalls

### 1. Accepting "Everyone" as Target User
Products built for everyone serve no one. If the user says "everyone", push for a specific segment. Ask: "If we had to pick the first 100 users, who would they be?"

### 2. Including Implementation Details in Features
Features describe WHAT, not HOW. "User authentication via OAuth2" is HOW. "Sign in with email or Google" is WHAT. The brief is about outcomes, not architecture. Implementation is for the PRD and technical spec.

### 3. No Success Metrics or Vanity Metrics
Without measurable success criteria, there is no way to validate the product. Total registered users is a vanity metric. Activation rate (users who completed core action within 7 days) is a real metric. Propose metrics that tie directly to the value proposition.

### 4. Over-scoping the MVP
The most common mistake. Users want to include every feature they imagine. MVP means Minimum VIABLE Product — the smallest set of features that delivers the core value. If the feature list exceeds 7 items, push back. "Which of these can wait for v2?"

### 5. Skipping Out of Scope
Without explicit out-of-scope items, scope creep is inevitable. Every feature NOT listed will be assumed included. Be explicit about what is excluded. "If it's not in the brief, it's not in scope."

### 6. Timeline Without Buffer
Users estimate timelines assuming everything goes perfectly. Reality: discovery, technical hurdles, feedback loops. Add 30% buffer to the user's stated timeline. "If you think 3 months, let's plan for 4."

### 7. Assuming Shared Context
Users assume you know their domain, competitors, and constraints. They often omit critical context. If a statement seems under-specified, ask. "When you say X, what specifically do you mean?"

### 8. No Technical Constraints Section
Every project has constraints: platform (iOS only vs. cross-platform), budget ($10K vs. $1M), compliance (HIPAA, SOC2). If the user doesn't mention these, ask. Constraints discovered after the brief phase force rewrites.

### 9. Feature Creep During Iteration
Each revision round adds 1-2 more features. By round 3, the MVP scope has doubled. Track feature count across rounds. If it increases by more than 20%, push back.

### 10. False Consensus
User says "approved" but the brief contains ambiguous language that means different things to different people. Use specific, concrete language. Test: "Could two reasonable people disagree on what this means?" If yes, tighten it.

## Compared With

| Approach | Purpose | Output | When to Use |
|----------|---------|--------|-------------|
| Product Brief (this skill) | Align on scope, problem, users, success criteria | One-page markdown file | Before any design or development work |
| PRD (create-prd) | Detailed functional requirements | Structured PRD artifact | After brief is approved |
| User Stories (create-stories) | Specific acceptance criteria per feature | Story list in docs/ | After PRD, before sprint |
| Architecture Decision Record | Document technical decisions | ADR in docs/adr/ | During development, not planning |
| Pitch Deck | Raise funding, sell vision | Presentation slides | External communication, not internal alignment |
| Lean Canvas | Business model exploration | One-page canvas | Very early-stage, pre-brief |
| RFP Response | Bid on contract | Proposal document | Vendor selection context |

The Product Brief is the narrowest, most concrete artifact. It focuses on WHAT and WHY, not HOW. It constrains the PRD, which constrains implementation. Keep it tight.

## Performance Considerations

### Cognitive Load in Q&A
Each question consumes user cognitive bandwidth. Fatigue sets in after 3-4 questions, reducing answer quality.

**Mitigations**:
- Ask the most critical questions first (target user, problem). If user provides enough context early, skip remaining.
- Keep questions to one sentence. The user should not need to re-read to understand.
- If the user sounds frustrated ("you already asked that"), you repeated a question. Apologize and clarify: "I'm asking about scale, not timeline. Two separate things."
- When the user answers, acknowledge briefly ("Got it." or "Noted.") and proceed. Do not summarize, paraphrase, or editorialize.

### Decision Fatigue in Iteration
Each iteration round increases attachment to the current version. By round 3, the user is more likely to accept suboptimal framing because they want the process to end.

**Mitigations**:
- Make the first draft as complete as possible. Quality upfront reduces iterations.
- If the user requests significant restructuring (different format, different sections), it is better to rewrite the full template than to patch. A patched brief reads incoherently.
- After 3 rounds, the brief is approved. Further refinements happen in the PRD phase.

### Drafting Speed
The brief should be drafted in under 30 seconds of thinking time. If it takes longer, the user's description is too vague or the problem is not well understood. Flag this: "I need more clarity on X before I can draft. Specifically..."

## Ecosystem & Tooling

### Adjacent Skills (Planning Chain)
```
create-brief --> create-prd --> create-stories --> create-roadmap
     |                                  |
     v                                  v
  design-systems                    architecture
  (if needed)                       (if needed)
```

### Related Documentation Formats
- **Product Brief**: One-page, aligns on WHAT and WHY
- **PRD**: Structured requirements, aligns on HOW (functional)
- **User Stories**: Acceptance criteria, aligns on validation
- **OKR Document**: Ties product goals to business objectives
- **Market Requirements Document (MRD)**: Market-driven product definition
- **Technical Requirements Document (TRD)**: Engineering-focused specification

### Templates and Tools
- **Lean Canvas**: Alternative pre-brief format for business model validation
- **NABC Framework**: Need, Approach, Benefit, Competition — useful for value proposition refinement
- **Jobs To Be Done (JTBD)**: Framework for understanding user motivation — helpful when user struggles to articulate the problem
- **Value Proposition Canvas**: Maps user pains/gains to product features — useful for differentiating

## References
- `references/create-brief-fundamentals.md` — Brief Fundamentals
- `references/create-brief-advanced.md` — Brief Advanced Topics
- `references/brief-examples.md` — Brief Examples
- `references/brief-strategies.md` — Brief Writing Strategies
- `references/brief-template.md` — Product Brief Template
- `references/brief-templates.md` — Brief Templates
- `references/brief-research-synthesis.md` — Research Synthesis for Briefs
- `references/brief-stakeholder-alignment.md` — Stakeholder Alignment for Briefs

## Handoff
Output: `docs/brief-{YYYY-MM-DD}.md`
Next skill: create-prd
Carry forward: brief content, user's stated problem, target users, MVP features.
