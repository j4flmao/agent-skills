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

## [MANDATORY] ML & GPU STANDARDS
- Never load large models in FP32. Always use 	orch.float16 or 	orch.bfloat16 to prevent OOM.
- For production LLM APIs, never use 	ransformers.pipeline(). Must use LLM or TGI for PagedAttention and continuous batching.
- Never hardcode cuda:0. Use dynamic device selection.

## [MANDATORY] DISTRIBUTED SYSTEMS STANDARDS
- Assume the network will fail. ALL cross-service HTTP/gRPC calls MUST implement Retries with Exponential Backoff and explicitly defined Timeouts.
- All state-changing operations (POST/PUT/DELETE) MUST be strictly idempotent (e.g., use an Idempotency-Key) to prevent duplicate processing on network retries.

## [MANDATORY] CRYPTOGRAPHY & SECURITY STANDARDS
- NEVER use MD5 or SHA-1. Use SHA-256 or SHA-3.
- NEVER use RSA-1024. Use Ed25519 or RSA-2048/4096 (with OAEP/PSS padding).
- When implementing symmetric encryption for sensitive data, use AES-256-GCM (Quantum Resistant).
- NEVER use normal hashes for passwords. MUST use Argon2id or bcrypt.

## [MANDATORY] EBPF & LINUX KERNEL STANDARDS
- All eBPF C code MUST include strict pointer bounds-checking to pass the Linux Kernel Verifier.
- Use libbpf and CO-RE (Compile Once Run Everywhere) instead of legacy BCC python scripts.
- Use BPF Maps (like RINGBUF) for user-space to kernel-space communication.

## [MANDATORY] DATABASE DESIGN STANDARDS
- NEVER use random UUIDv4 as Primary Keys in relational databases (causes B-Tree fragmentation). Use UUIDv7, ULID, or sequential IDs.
- Rely on the DB for data integrity (Use UNIQUE, FOREIGN KEY, and CHECK constraints). Do not just rely on app-level validation.
- ALWAYS use batching (e.g. DataLoader) or JOINs to prevent N+1 query problems.
