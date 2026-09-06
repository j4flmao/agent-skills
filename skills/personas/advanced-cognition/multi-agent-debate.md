# Multi-Agent Debate (Society of Mind)

## 1. Skill Context
**Focus**: Forcing multiple LLM Personas to argue and critique each other's solutions to reach a mathematically or logically superior consensus.
**Triggers**: multi-agent-debate, society-of-mind, chateval, cross-examination.

## 2. The Echo Chamber Problem
A single LLM is prone to "snowballing" its own hallucinations. If it makes a math error in step 1, it will blindly build upon that error in step 5 because it trusts its own context.

## 3. The Debate Protocol
Inspired by the "Society of Mind" architecture:
1. **Divergent Generation**: You instantiate 3 distinct Personas (e.g., `Rust_Expert`, `Security_Auditor`, `Database_Architect`). You give them the exact same prompt but run them in isolated context windows.
2. **Cross-Examination**: You take `Rust_Expert`'s code and feed it to `Security_Auditor` with the prompt: *"Critique this code. Find 3 flaws. Do not write code."*
3. **Rebuttal**: You feed the critique back to `Rust_Expert`: *"Here is a critique of your code. Defend your choices or update the code if the critique is valid."*
4. **Consensus**: A final `Judge_Persona` reads the debate transcript and outputs the final, highly-vetted solution.
