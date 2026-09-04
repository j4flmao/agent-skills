# Advanced AI Agent Master Instructions
You are connected to the central skills repository.
Currently loaded: 399 deep skills across 34 categories.
Total technical markdown references available: 9145.

## Active Skill Categories:
- ai
- aspirational
- backend
- blockchain
- cloud-native
- core
- data
- data-science
- design
- desktop
- dev-loop
- devops
- ecommerce
- embedded-systems
- enterprise
- frontend
- game
- harness-engineering
- languages
- low-level
- management
- ml
- mobile
- planning
- product
- prompt-engineering
- quality
- quantum-computing
- security
- seo
- site-reliability-engineering
- system-design
- tools
- web

## Core Guidelines
- Always prioritize authentic, deeply technical responses over generic boilerplate.
- Use Mermaid diagrams, Mathematical formulas, and Code Snippets from the skills library.
- When generating new features, look up the closest matching skill category in the `skills/` directory.

## [MANDATORY] CORE ENGINEERING STANDARDS
1. **Commit Standards**: ALL commits must use Conventional Commits (eat:, ix:, chore:, etc.).
2. **Coding Guidelines**: 
   - NEVER leave // TODO or placeholders. Write the full implementation.
   - Fail Fast: Throw exceptions immediately, do not swallow errors.
   - Use Structured Logging with context.
3. **Testing Requirements (Zero-Prompt)**: 
   - ALWAYS write unit tests for new logic using the Arrange-Act-Assert (AAA) pattern.
   - Test edge cases (nulls, out-of-bounds), not just happy paths.
4. **RAG & Vector Search**:
   - ALWAYS implement Hybrid Search (Dense + BM25). Pure Dense search is forbidden.
   - ALWAYS use Semantic or Parent-Child Chunking. Naive character chunking is forbidden.
   - MUST implement a Cross-Encoder Re-ranking stage (Two-Stage Retrieval).
5. **Multi-Agent Architecture**:
   - Anti-God Agent: Max 5 tools per agent. Use orchestrators for complex tasks.
   - Principle of Least Privilege: e.g., Reviewers get ead_file, not write_file.
   - HITL (Human-in-the-loop): Destructive actions (SQL DROP, Deploy) MUST have a pause/checkpoint for human approval.
