# User Research Fundamentals: Questions, Study Design, Participants, Ethics and Bias

The foundations of user research for product teams: what research is for, the main dimensions of methods, turning decisions into research questions, planning a study, sampling and recruiting, consent and data protection, common biases, and sharing findings so they change decisions. Method details, interview technique and synthesis frameworks are in sibling references.

## What User Research Is For

User research reduces the risk of building the wrong thing or building it the wrong way. It answers questions about people's needs, contexts, behaviors and how they experience a product. Good research is tied to a decision: if no decision depends on the answer, the study is not worth running yet.

| Product stage | Typical research questions |
|---------------|----------------------------|
| Discovery | What problems do these users have? How do they solve them today? What matters most? |
| Definition | Which needs should we address first? What would success look like for users? |
| Design | Can people understand and use this concept/prototype? Where do they struggle? |
| Launch and growth | How is it used in reality? Why do people drop off? What drives retention? |

## Dimensions of Methods

| Dimension | Ends | Example |
|-----------|------|---------|
| Purpose | Generative (explore problems) vs evaluative (assess solutions) | Contextual inquiry vs usability test |
| Data type | Qualitative (why, how) vs quantitative (how many, how much) | Interviews vs surveys/analytics |
| Source | Attitudinal (what people say) vs behavioral (what people do) | Survey vs session recordings |
| Context | Natural use vs scripted task vs decontextualized | Diary study vs lab test vs card sort |

Behavioral data is generally more reliable than self-reports about future behavior ("Would you use this?" predicts little). Combine methods to cover each other's weaknesses.

## From Decision to Research Question

```text
Decision:          Should we build bulk editing in Q3?
Assumptions:       Admins edit many records weekly; current workflow is slow; they would switch tools
Research questions: How often and in what situations do admins change many records?
                   What do they do today, and what does it cost them?
                   What makes a workaround acceptable or not?
Method:            Contextual interviews with 8 to 10 admins + analytics on edit frequency
```

Rules for research questions:
- Ask about past behavior and current context, not hypothetical future behavior.
- Keep them open enough to learn, specific enough to inform the decision.
- Prioritize the riskiest assumptions (high uncertainty, high impact).

## Planning a Study

A one-page research plan:

| Section | Content |
|---------|---------|
| Background and decision | What is being decided, by whom, by when |
| Research questions | 3 to 5 questions |
| Method and rationale | Why this method answers these questions |
| Participants | Criteria, number, recruitment channel, incentive |
| Logistics | Dates, tools, roles (moderator, note-taker, observers) |
| Materials | Discussion guide, tasks, prototype, consent form |
| Analysis and outputs | How findings will be synthesized and shared |
| Risks and ethics | Sensitive topics, vulnerable participants, data handling |

Pilot the guide or tasks with one person (even a colleague) to catch confusing wording and timing problems.

## Sample Size Guidance

| Study type | Typical size | Rationale |
|------------|--------------|-----------|
| Qualitative interviews per segment | 5 to 12 | Themes tend to saturate; more segments need more participants |
| Formative usability test per round | About 5 per distinct user group | Finds many major issues; iterate in rounds rather than one large test |
| Summative usability benchmark | 20 or more | Needed for metrics with useful confidence intervals |
| Surveys | Depends on required margin of error and segment comparisons | Calculate before fielding |
| Card sorting (open) | 15 to 30 | Stable groupings |

Qualitative findings describe what exists and why; they do not estimate prevalence. Use quantitative methods to size findings.

## Recruiting Participants

- **Screeners**: short questionnaires that select on behavior ("In the last month, how many times did you...") rather than self-labels. Hide the study's purpose to avoid people answering to qualify.
- **Sources**: existing customers (CRM, in-app intercepts), research panels and recruiting services, community groups, customer-facing teams.
- **Mix**: include different experience levels, contexts and, where relevant, people with disabilities and different devices.
- **Incentives**: appropriate to the time and audience; follow company policy for customers and procurement rules for public-sector participants.
- **No-shows**: over-recruit slightly or keep backups.

Avoid relying only on the most engaged or friendliest customers; they are not representative.

## Ethics, Consent and Data Protection

| Principle | Practice |
|-----------|----------|
| Informed consent | Explain purpose, what is recorded, how data is used and stored, right to stop at any time; obtain consent before recording |
| Minimize data | Collect only what the research questions need |
| Protect identity | Pseudonymize notes and quotes; restrict access to recordings; set retention periods |
| Legal basis | Under GDPR and similar laws, document the lawful basis and inform participants; honor deletion requests |
| Avoid harm | Care with sensitive topics; no deception beyond what is necessary and approved; debrief where needed |
| Vulnerable participants | Extra safeguards and approvals (children, health contexts) |

Recordings and transcripts are personal data. Uploading them to third-party tools (including AI transcription or analysis services) requires approval under your data protection policies.

## Bias and How to Reduce It

| Bias | Description | Mitigation |
|------|-------------|------------|
| Leading questions | Wording suggests the answer | Neutral, open questions ("Tell me about...") |
| Confirmation bias | Seeing evidence for what you believe | Write assumptions down first; look for disconfirming evidence; involve multiple analysts |
| Social desirability | Participants give socially acceptable answers | Ask about specific past events; observe behavior |
| Sampling bias | Participants differ from target users | Behavior-based screeners, diverse sources |
| Hawthorne / observer effect | People behave differently when observed | Natural tasks, diary studies, analytics |
| Recency and vividness | One striking session dominates | Synthesize across all sessions systematically |
| Moderator effects | Moderator's reactions influence participants | Neutral reactions, standard guide, practice |

## Note-Taking and Synthesis Basics

- Separate observations ("clicked Export three times") from interpretations ("did not notice the success message").
- Capture verbatim quotes with timestamps.
- Synthesize promptly: debrief after each session, then affinity mapping or thematic analysis across sessions.
- Express findings as insights with evidence and implications, not as a list of everything heard.

## Sharing Findings

| Format | Use |
|--------|-----|
| Topline summary within days | Keep momentum; key findings and next steps |
| Insight report or deck | Decisions, evidence, recommendations, confidence level |
| Highlight reel | Short clips that build empathy (with consent) |
| Research repository entry | Findings searchable for future teams |
| Workshop | Co-create next steps with product, design and engineering |

State confidence and limits: who was and was not included, sample size, and open questions.

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Research started without a decision to inform | Define decision and owner first |
| Asking users what features they want | Explore problems and behaviors; design solutions yourself |
| Testing too late to change anything | Test early with low-fidelity prototypes |
| Generalizing from 5 interviews to market size | Quantify separately |
| Findings not reaching decision makers | Involve stakeholders as observers; short, timely readouts |

## Checklist

- [ ] Decision, owner and research questions written down
- [ ] Method chosen to match the question (generative/evaluative, qual/quant, behavioral/attitudinal)
- [ ] Behavior-based screener and diverse recruitment
- [ ] Consent, data minimization and retention defined
- [ ] Guide piloted; neutral questions
- [ ] Systematic synthesis with evidence and confidence levels
- [ ] Findings shared quickly and stored for reuse
