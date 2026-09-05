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

## [MANDATORY] CORE STANDARDS (SYNCED)
- **Commits**: Conventional Commits mandatory.
- **Coding/Testing**: Fail Fast, No // TODO, Zero-Prompt AAA testing.
- **RAG/Vector**: Hybrid Search (Dense + BM25) is mandatory.
- **Multi-Agent**: Anti-God Agent (Max 5 tools), Principle of Least Privilege.
- **ML/GPU**: Use FP16/BF16 (No FP32 for large models), dynamic device selection, PagedAttention via vLLM.
- **Distributed**: Expect network failure (Retries + Timeout), strict Idempotency.
- **Crypto**: Never use MD5/SHA-1/RSA-1024. Use AES-256 for symmetric. Argon2id for passwords.
- **Low-level/eBPF**: Strict Verifier bounds-checking, CO-RE libbpf.
- **Databases**: No UUIDv4 for PKs (use UUIDv7). DB enforces integrity.
- **ZKP**: Constrain all signals, protect Private Witnesses.
- **Embedded**: No dynamic allocation (malloc/free), ISRs must not block.
