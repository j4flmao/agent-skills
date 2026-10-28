# Hiring: Advanced Topics

Advanced practices for engineering hiring at scale: designing work-sample assessments, evaluating senior and staff-level candidates, hiring committees and bar raisers, reducing bias with evidence, assessment in the era of AI coding assistants, offer strategy, legal and compliance considerations, and measuring predictive validity. Builds on `hiring-fundamentals.md`.

## Work-Sample Assessment Design

Work samples that resemble the actual job tend to predict performance better than puzzles.

| Format | Strengths | Risks | Mitigation |
|--------|-----------|-------|------------|
| Live pair-programming on a realistic task | Observes collaboration and reasoning | Performance anxiety | Warm-up, allow docs/search, interviewer as collaborator |
| Code review exercise | Senior judgment, communication | Needs good seeded code | Seed real-world issues (bugs, design, security) with a rubric |
| Debugging exercise | Practical skill | Environment friction | Pre-built repo, containerised setup |
| Take-home | Realistic, less pressure | Time burden, unverifiable authorship | Time-box (2-4 h) or pay; follow-up discussion of the submission |
| System design | Architecture trade-offs | Rehearsed answers | Novel constraints, deep follow-ups on failure modes and operations |

Design process: define the competencies, write the task, write the rubric with examples at each score, pilot on current employees at the target level, calibrate time and difficulty, then version the exercise and rotate to limit leakage.

## Assessment and AI Coding Assistants

- Decide policy explicitly: allowed (like on the job) or not allowed (for a specific signal), and tell candidates in advance.
- If allowed, assess what matters when tools exist: problem decomposition, verifying generated code, testing, reading unfamiliar code, explaining trade-offs.
- Code review and debugging exercises, plus deep follow-up questions on any submitted work, remain informative regardless of tool use.
- Be alert to remote interview fraud (proxy interviewers, identity mismatch): identity verification at stages, consistent interviewer observations across stages, and in-depth follow-ups.

## Senior, Staff and Principal Evaluation

| Dimension | What to assess | Example evidence |
|-----------|----------------|------------------|
| Scope | Size and ambiguity of problems owned | Led a multi-team migration, defined the approach |
| Technical judgment | Trade-offs, risk management, simplicity | Chose not to build; reversible vs irreversible decisions |
| Influence | Driving alignment without authority | Wrote RFCs that changed org direction |
| Multiplier effect | Raising others | Mentoring outcomes, standards adopted across teams |
| Execution in ambiguity | Delivering through unclear requirements | Defined milestones, de-risked early |

Formats: deep-dive on a past project (with probing for the candidate's own contribution), architecture review of a provided design, written exercise (RFC critique), conversations with peers at the target level. Reference checks are more valuable at these levels; ask structured questions about specific behaviours.

## Hiring Committees and Bar Raisers

- A **bar raiser** (trained interviewer outside the hiring team) protects the hiring bar against urgency bias and has veto or strong voice per company policy.
- **Hiring committees** review packets (written feedback, work samples) rather than live debates, which improves consistency across teams.
- Packet quality matters: evidence-based feedback, consistent rubric use, explicit level recommendation.
- Rotate committee members and review decision consistency (similar packets, similar outcomes).

## Bias Reduction With Evidence

| Bias | Where it appears | Countermeasure |
|------|------------------|----------------|
| Affinity / similarity | "Culture fit" judgments | Replace with defined values behaviours; avoid "would I have a beer with them" |
| Halo / horn | One strong/weak moment colours all ratings | Rate competencies independently with evidence |
| Anchoring | Debrief starts with a strong opinion | Written feedback first; structured debrief order |
| Pedigree | Brand-name schools/employers | Anonymised or skills-first resume review; work samples |
| Confirmation | Interviewer seeks evidence for first impression | Standard questions, note-taking, rubric anchors |

Monitor stage pass-through rates by demographic group where lawful and with appropriate privacy protections; investigate stages with disproportionate drop-off. In the US, adverse impact analysis commonly uses the four-fifths rule as a screening heuristic.

## Automated Tools and AI in Screening

- Automated resume screening and AI-assisted interview analysis raise discrimination and transparency risks.
- Several jurisdictions regulate them: New York City Local Law 144 requires bias audits and notices for automated employment decision tools; the EU AI Act classifies AI systems used for recruitment and candidate evaluation as high-risk, with obligations phasing in.
- Keep humans accountable for decisions, document tool validation, and consult legal before adopting such tools.

## Offer Strategy

- Know the band before the loop; level decisions are made on evidence, then compensation follows the band.
- Understand the candidate's priorities early (scope, growth, flexibility, compensation components).
- Explain total compensation clearly (base, bonus, equity with vesting and valuation caveats, benefits).
- Speed matters: decide and extend offers within days of the final interview.
- Sell with specifics: team, problems, manager, growth path; let candidates meet future peers.
- Track decline reasons to improve competitiveness.

## Legal and Compliance Basics

- Ask only job-related questions; no questions about protected characteristics.
- Retain interview records per legal requirements and data-protection rules (GDPR applies to candidate data in the EU: lawful basis, retention limits, access rights).
- Pay transparency and salary history bans vary by jurisdiction; check before asking about current pay.
- Background and reference checks need consent and must follow local law.

## Measuring Predictive Validity

1. Store structured interview scores per competency.
2. After 6-12 months, collect performance ratings and retention for hires.
3. Correlate interview scores with outcomes per interview type (small samples: look for consistent patterns, not precise coefficients).
4. Drop or redesign interviews whose scores show no relationship with outcomes; strengthen those that do.
5. Review false negatives where possible (strong candidates rejected who succeed elsewhere) through periodic re-engagement data.

## Scaling Hiring

- Interviewer pools per competency with load balancing and capacity planning (interview hours per week per engineer).
- Hiring sprints with dedicated coordinators for large ramps.
- Standardised loops per role family and level; local variation only with justification.
- Onboarding linked to interview findings (development areas noted in the packet become onboarding goals).

## Checklist

- [ ] Work samples piloted, rubric-anchored and rotated
- [ ] Explicit policy on AI assistant use communicated to candidates
- [ ] Senior/staff loops assess scope, judgment and influence with deep dives
- [ ] Bar raiser or committee review for consistency
- [ ] Bias countermeasures and pass-through monitoring in place
- [ ] Automated screening tools legally reviewed and audited
- [ ] Offers fast, transparent, band-driven
- [ ] Interview scores validated against on-the-job outcomes
