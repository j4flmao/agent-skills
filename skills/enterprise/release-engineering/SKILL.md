# Release Engineering & Enterprise Collaboration

## 1. Skill Context
**Focus**: Solving "Integration Hell" at scale, managing parallel R&D initiatives, mitigating merge conflicts, and aligning Department-level goals with Global mainlines.
**Triggers**: release-engineering, branching, git, conflicts, rebase, trunk-based, integration, enterprise-git.

## 2. The Core Problem: Integration Debt
When a Department team forks or branches off to build a Proof of Concept (PoC) while the Global team continues to mutate the core architecture, the teams accumulate **Integration Debt**. 
The effort required to integrate two branches does not grow linearly with time; it grows exponentially. If a PoC takes 3 months, merging it back is often harder than rewriting it from scratch.

## 3. Core Principles of Scale
- **Decouple Deployment from Release**: Code must be merged to the `main` branch continuously (Deployment), even if the feature isn't finished or active for users (Release). This is achieved via Feature Flags.
- **Atomic Commits over Monolithic Merges**: Large PoC branches must be surgically sliced into small, logical, self-contained commits before review. 
- **Continuous Integration is a Verb, not a Tool**: CI is not Jenkins or GitHub Actions. CI is the *human act* of integrating code into the shared trunk at least once a day.

## 4. Anti-Patterns
- **Long-Lived Feature Branches (LLFB)**: Keeping a branch alive for weeks/months and periodically running `git pull origin main` creates massive, unresolvable conflict chains.
- **"We will integrate at the end"**: Deferring integration to the final phase of a project guarantees catastrophic failures, architecture mismatches, and delayed releases.
- **GitFlow at Enterprise Scale**: GitFlow isolates teams for too long. It works for open-source and versioned software (like desktop apps), but fails for continuous delivery SaaS platforms.

## 5. References
- `references/advanced-conflict-resolution.md` — Git Surgery, `rerere`, and `diff3`.
- `references/branching-strategies-at-scale.md` — Scaled Trunk-Based Development.
- `references/feature-toggles.md` — Dark launching and routing.
- `references/branch-by-abstraction.md` — Safe architecture rewrites.
- `references/release-trains.md` — Cross-team release management.
- `references/monorepo-collaboration.md` — Codeowners and Bounded Contexts.
- `references/zero-downtime-migrations.md` — Expand/Contract DB Pattern.
- `references/concurrent-migration-management.md` — Flyway/Liquibase collision handling.
