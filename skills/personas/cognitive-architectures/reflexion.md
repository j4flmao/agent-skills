# Reflexion (Self-Correction Architecture)

## 1. Skill Context
**Focus**: Giving an AI agent the ability to reflect on its past mistakes, update its internal prompt/context, and try again until successful.
**Triggers**: reflexion, self-correction, iterative-learning, cognitive-architecture.

## 2. The Reflexion Loop
Instead of generating a massive chunk of code and hoping it works, Reflexion forces the Agent into a loop:
1. **Generate**: Create the initial code/solution.
2. **Execute**: Run the code against a compiler, test suite, or linting tool.
3. **Evaluate**: Capture the standard output/error (stderr).
4. **Reflect (The Secret Sauce)**: The Agent writes a short, verbal explanation (reflection) of *why* the execution failed and *how* it plans to fix it on the next iteration.
5. **Re-Generate**: The Agent generates new code, holding its previous reflection in context.

## 3. Why Verbal Reflection Works
LLMs are heavily based on Chain-of-Thought (CoT) reasoning. If you just feed an LLM an error trace and say "Fix it", it often hallucinates or repeats the same mistake. By forcing the LLM to explicitly articulate its failure mode ("I accessed an array out of bounds because index `i` reached `n`"), it anchors its next generation to the correct logical path.
