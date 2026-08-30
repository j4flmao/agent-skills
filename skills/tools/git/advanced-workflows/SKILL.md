# Advanced Git Workflows & Rules

## Core Methodologies

This skill defines the authoritative conventions for source code versioning, focusing on robust collaboration and automated CI/CD triggers.

### 1. Trunk-Based Development vs GitFlow
- **Trunk-Based (Recommended):** All developers merge to `main` frequently (multiple times a day). Relies heavily on Feature Toggles (Dark Launching) and robust automated testing. Short-lived feature branches.
- **GitFlow (Legacy/Enterprise):** Separate branches for `develop`, `release`, `hotfix`, and `feature`. Useful for scheduled release cycles (e.g., mobile apps) but introduces "merge hell" if branches live too long.

### 2. Conventional Commits Standard
Every commit MUST follow the `<type>(<scope>): <subject>` format to enable automated semantic versioning and changelog generation.
- `feat:` A new feature (correlates with MINOR in SemVer).
- `fix:` A bug fix (correlates with PATCH in SemVer).
- `BREAKING CHANGE:` (correlates with MAJOR in SemVer).
- `chore:`, `docs:`, `style:`, `refactor:`, `perf:`, `test:`

### Branching Architecture Map

```mermaid
%%{init: {"theme": "default", "flowchart": {"useMaxWidth": true}}}%%
flowchart TD
    subgraph Repository ["Central Repository"]
        A["main (Stable / Deployable)"]
    end
    
    subgraph Developer ["Local Environment"]
        B["Branch: feat/authentication"]
        C["Local Commits (Conventional)"]
    end
    
    subgraph CI_Pipeline ["CI / CD Pipeline"]
        D["Pull Request (PR) Created"]
        E["Automated Tests & Linting"]
        F["Code Review (Approvals)"]
        G["Squash & Merge"]
    end
    
    A -->|"Checkout Branch"| B
    B -->|"Development"| C
    C -->|"Push Origin"| D
    D -->|"Trigger webhook"| E
    E -->|"Pass"| F
    F -->|"Approved"| G
    G -->|"Deploy"| A
```
