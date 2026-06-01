# Prompt Decision Trees

## Overview
These decision trees provide systematic guidance for selecting prompt strategies, architectures, parameters, and security levels based on task characteristics, model capabilities, and operational requirements.

## Tree 1: Prompt Architecture Selection

```
Start: What is the primary task type?
│
├── Classification, Labeling, or Extraction
│   ├── Output to machine → JSON/structured output, T=0
│   ├── Output to human → Label + brief explanation
│   └── Many categories (>20) → Hierarchical classification
│       ├── First pass: coarse category
│       └── Second pass: fine-grained within coarse category
│
├── Factual QA or Summarization
│   ├── With retrieved context → RAG pattern, cite sources
│   │   ├── Single document → Direct extraction
│   │   └── Multiple documents → Synthesis prompt
│   ├── Without context → Use model knowledge, require confidence
│   └── Conflicting sources → Multi-perspective analysis + adjudication
│
├── Multi-Step Reasoning
│   ├── Linear steps → Chain-of-Thought
│   │   ├── Simple (2-3 steps) → Zero-shot CoT
│   │   ├── Complex (>3 steps) → Few-shot CoT with examples
│   │   └── High reliability needed → Self-Consistency (N=5-10)
│   ├── Branching paths → Tree-of-Thought
│   │   ├── <5 steps → Full ToT with evaluation
│   │   └── >5 steps → Beam search (keep top 2-3 branches)
│   └── Requires external data → ReAct (Reason + Act cycle)
│
├── Code Generation
│   ├── New function → Specify language, framework, signature, tests
│   ├── Bug fix → Show error, expected behavior, context
│   ├── Refactoring → Show current code, target patterns
│   └── Code review → List review criteria explicitly
│
├── Creative Writing
│   ├── Short form (<500 words) → Single prompt with style examples
│   ├── Long form (>500 words) → Outline → draft → refine chain
│   └── Specific style/tone → 2-3 style reference examples
│
├── Conversational / Multi-turn
│   ├── Task-oriented → System prompt + context management
│   ├── Open-ended → Personality + boundary definition
│   └── Long conversation → Periodic system prompt refresh
│
└── Agentic / Tool Use
    ├── Single tool → ReAct with tool description
    ├── Multiple tools → Router → specialized sub-agents
    ├── Sequential tools → Chain with output passing
    └── Dynamic tool selection → ReAct with tool catalog
```

## Tree 2: Output Format Selection

```
What consumes the output?
│
├── Another program / API
│   ├── Structured JSON → Native JSON mode + schema
│   │   ├── Model supports structured output → Use API's response_format
│   │   └── Model doesn't support → Prompt-enforced JSON + regex extraction
│   ├── XML → Tag specification + XML declaration
│   ├── CSV/TSV → Header line + delimiter specification
│   └── Binary/Protocol buffer → Not recommended via prompt; use non-LLM path
│
├── Human reader
│   ├── Report → Markdown with explicit sections
│   ├── Quick answer → Single paragraph or bullet list
│   ├── Dashboard → Key-value pairs, minimal formatting
│   └── Email → Subject line + body with tone specification
│
├── Code / Configuration
│   ├── Source code → Language-specified code block
│   ├── Config (YAML/JSON/TOML) → Explicit format + validation
│   ├── SQL → Specify dialect (PostgreSQL, MySQL, etc.)
│   └── Shell script → Shebang + shell specification
│
└── Mixed (machine + human)
    ├── JSON preamble + natural language body → Two-section output
    ├── Structured metadata + free text → Metadata first, text second
    └── Classification + explanation → Label first, then explanation
```

## Tree 3: Few-Shot Example Strategy

```
Do I need few-shot examples?
│
├── No → Model knows the task well, simple output format
│   → Zero-shot is sufficient, saves tokens
│
├── Yes
│   ├── How many examples?
│   │   ├── 1-2 → Task is simple but unfamiliar format
│   │   ├── 3-5 → Standard range for most tasks
│   │   ├── 6-10 → Task has many edge cases or nuances
│   │   └── >10 → Consider if prompt is too complex; decompose
│   │
│   ├── How to select examples?
│   │   ├── Coverage → Span input distribution, not cluster in one area
│   │   ├── Edge cases → Include boundary examples explicitly
│   │   ├── Difficulty → Order easiest to hardest
│   │   ├── Correctness → Every example must be verified correct
│   │   └── Diversity → Different patterns, lengths, complexities
│   │
│   └── How to format examples?
│       ├── Consistent → Same structure for every example
│       ├── Labeled → Clear "Input:" / "Output:" markers
│       ├── Commented → Brief annotation if reasoning is important
│       └── Include reasoning → For CoT, show intermediate steps
│
├── Do examples include reasoning?
│   ├── Yes → Few-shot CoT (examples show step-by-step)
│   └── No → Standard few-shot (examples show input→output only)
│
└── What if examples are long?
    ├── Compress → Abbreviated format, shorter but still representative
    ├── Summarize → Shorter versions capturing the pattern
    └── Fewer → Reduce count, keep most diverse
```

## Tree 4: Temperature and Parameter Selection

```
Start: What is the primary task?
│
├── Deterministic output required
│   ├── Temperature: 0.0-0.2
│   ├── Top-P: 1.0 (or 0.9 for slightly more determinism)
│   ├── Presence penalty: 0.0
│   ├── Frequency penalty: 0.0
│   └── Seed: Fixed value for reproducibility
│
├── Balanced output (accuracy + natural language)
│   ├── Temperature: 0.3-0.5
│   ├── Top-P: 0.9
│   ├── Presence penalty: 0.0-0.3
│   ├── Frequency penalty: 0.0-0.3
│   └── Seed: Optional
│
├── Creative / Diverse output
│   ├── Temperature: 0.7-1.0
│   ├── Top-P: 0.95
│   ├── Presence penalty: 0.3-0.6
│   ├── Frequency penalty: 0.3-0.6
│   └── Seed: Random (different each time)
│
└── Not sure → Sweep testing
    ├── Test: temperature in [0.0, 0.3, 0.5, 0.7, 1.0]
    ├── Test: presence_penalty in [0.0, 0.3, 0.6]
    ├── For each combination: run N=5 samples, measure quality
    └── Select: best mean score, penalize high variance
```

## Tree 5: Security Level Selection

```
What is the risk level of this deployment?
│
├── Low risk (internal tool, no PII, trusted users)
│   ├── Basic delimiter isolation
│   ├── Single guardrail layer
│   ├── Manual output review
│   └── No rate limiting
│
├── Medium risk (customer-facing, some PII, untrusted input)
│   ├── Delimiter isolation + sandwich defense
│   ├── Input sanitization (strip injection patterns)
│   ├── Output format validation
│   ├── Content safety classifier
│   ├── Rate limiting on requests
│   └── Audit logging
│
├── High risk (financial, healthcare, legal, minors)
│   ├── All medium-risk measures
│   ├── Role hardening (explicit non-reprogrammable identity)
│   ├── Multi-layer guardrails (pre-input, input, model, output, post-output)
│   ├── Constrained decoding (logit bias or grammar)
│   ├── Human-in-the-loop for critical outputs
│   ├── Red team testing quarterly
│   ├── Adversarial test suite in CI/CD
│   ├── Perplexity monitoring on inputs
│   └── Incident response plan documented
│
└── Maximum risk (autonomous decisions, public safety)
    ├── All high-risk measures
    ├── Separate evaluation model validates generator output
    ├── Confidence thresholds with automatic deferral
    ├── Shadow deployment for 30 days before production
    ├── External red team annually
    └── Regulatory compliance review
```

## Tree 6: Debugging a Failing Prompt

```
Prompt is failing. What's the symptom?
│
├── Wrong output format
│   ├── Model adds extra text → Add "No additional text" constraint
│   ├── Model wraps in markdown → Specify "No code fences"
│   ├── JSON is malformed → Try native JSON mode + rephrase schema
│   └── Missing fields → List all required fields explicitly
│
├── Inconsistent quality across inputs
│   ├── Some inputs work, some don't → Check if failing inputs are edge cases
│   ├── Order sensitivity → Randomize example order, test multiple times
│   └── Length sensitivity → Very long/short inputs may behave differently
│
├── Model ignores constraints
│   ├── Too many constraints → Reduce to top 3-5
│   ├── Contradictory constraints → Check for logical conflicts
│   ├── Constraint at wrong position → Move to beginning or end (avoid middle)
│   └── Model doesn't understand → Simplify language, add examples of compliance
│
├── Hallucination or fabricated content
│   ├── Not grounded in context → Add citation requirement
│   ├── Prompt asks for speculation → Frame as "Based on the provided context..."
│   ├── Ambiguous question → Specify scope explicitly
│   └── Model extrapolates → Add "Only use information from the provided text"
│
├── Too verbose or too brief
│   ├── Too verbose → Add max length, specify concise style, trim examples
│   ├── Too brief → Require specific sections, show longer example output
│   └── Inconsistent length → Set explicit length expectation
│
└── Security bypass
    ├── Injection succeeds → Add delimiter isolation + sandwich defense
    ├── Jailbreak succeeds → Add role hardening + input pattern detection
    ├── Output reveals system prompt → Add output validation + monitoring
    └── Gradual topic drift → Track topics across turns, reset on drift
```

## Decision Tree Usage Guide

1. **Start with Tree 1** (Architecture) to select the prompting approach.
2. **Use Tree 2** (Output Format) to design the response structure.
3. **Consult Tree 3** (Few-Shot) to determine example strategy.
4. **Apply Tree 4** (Parameters) to set temperature and sampling.
5. **Assess Tree 5** (Security) based on deployment risk level.
6. **When failures occur**, use Tree 6 (Debugging) for systematic diagnosis.

> These trees encode heuristics. Real-world performance varies by model family, task specifics, and data distribution. Always validate tree recommendations with empirical testing on your specific use case.
