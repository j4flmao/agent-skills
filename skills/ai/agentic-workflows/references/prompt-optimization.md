# Self-Evolving Prompts (APE)

## 1. Skill Context
**Focus**: Automatic Prompt Engineering (APE). Personas that analyze their own historical failure rates and rewrite their own DNA (System Prompts) to stop repeating mistakes.
**Triggers**: prompt-optimization, automatic-prompt-engineering, self-evolution.

## 2. The Reflection-Evolution Pipeline
1. **Telemetry**: The system tracks every time a Persona generates code that fails compilation or fails a test suite.
2. **Batch Analysis**: At the end of the week, the Persona runs a map-reduce over its 50 failed transcripts.
3. **Insight Generation**: The Persona discovers a pattern: *"In 80% of my failures, I forgot to handle async/await rejections in Node.js."*
4. **Self-Mutation**: The Persona rewrites its own base System Prompt, explicitly injecting a new rule: `- [MANDATORY] Always wrap async/await in try/catch or use a global error handler.`

Gate every rewritten prompt like a code change: run it against a fixed eval set, compare with the current prompt, and require review before rollout. Unreviewed self-modifying prompts can drift, overfit to recent failures, or absorb injected instructions from transcripts. Automatic prompt optimizers such as APE (Zhou et al., 2022) and DSPy's optimizers follow the same rule: they search candidates against a metric, not blindly.
