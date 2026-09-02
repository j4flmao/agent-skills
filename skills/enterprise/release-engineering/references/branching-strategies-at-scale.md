# Branching Strategies at Enterprise Scale

## 1. The Fallacy of GitFlow at Scale
GitFlow (Main, Develop, Feature, Release, Hotfix branches) was designed in a time when software was released in distinct versions on a quarterly schedule (e.g., Desktop Applications).
For modern, cloud-native SaaS enterprises (where Global and Department teams work simultaneously), GitFlow creates **Integration Debt**.

- **The Problem**: Features sit in isolation on `feature/` branches. They are then merged into `develop`. If a Department team builds on `develop` while Global builds a massive architectural refactor on a separate `feature/global` branch, the collision is deferred until the very end. 
- **The Result**: Weeks of developer time wasted on conflict resolution, broken tests, and regressions.

## 2. Trunk-Based Development (TBD)
At enterprise scale, high-performing engineering organizations (Google, Meta, Netflix) use **Trunk-Based Development**.

- **Core Rule**: Everyone commits directly to a single shared branch (`main` or `trunk`), or utilizes extremely short-lived feature branches (merged within 24 to 48 hours).
- **How is this possible for a 3-month PoC?**
  1. **Abstraction Branching**: You don't branch in Git; you branch in the code (using Interfaces/Polymorphism).
  2. **Feature Toggles (Dark Launching)**: The code is in production but completely dead/unreachable unless a specific configuration flag is activated.

## 3. The "Department Fork" Strategy (Downstream Synchronization)
Sometimes a Department *must* maintain a long-lived divergence (e.g., heavily modifying a Global internal open-source project for a specific client requirement) while still consuming Global updates.

### The "Merge Down, Rebase Up" Topology
1. **Global Repo (`upstream`)**: The source of truth.
2. **Department Repo (`origin`)**: A fork of Global.

To prevent the Department branch from sinking:
- **Daily Synchronization**: The Department CI/CD pipeline runs a nightly job: `git fetch upstream` -> `git merge upstream/main` into the Department's `main`. 
- This forces the Department to resolve conflicts *incrementally* every single day. A 10-minute conflict resolution per day is sustainable; a 3-week conflict resolution at the end of the year is fatal.

### Contributing Back to Global
When the Department wants to submit an R&D proposal back to Global:
1. Create a pristine branch off `upstream/main`.
2. Use `git cherry-pick` to selectively port the precise, atomic commits from the Department branch that relate to the proposal.
3. Submit a clean Pull Request without the messy, Department-specific business logic.
