# Monorepo Collaboration & Scaling

## 1. The Monorepo Dilemma
When a Global enterprise and its subsidiary Departments share a single Version Control repository (Monorepo), cross-team collaboration can either be seamless or an absolute disaster.
Without physical isolation, a junior developer in a Department can accidentally modify a core Global authentication library, breaking the entire company's build.

## 2. Enforcing Boundaries with `CODEOWNERS`
To prevent the "Wild West" scenario, GitHub/GitLab utilizes a `CODEOWNERS` file. This maps specific directory paths to specific teams, automatically requiring their approval before a Pull Request can be merged.

```text
# CODEOWNERS file in the root of the repo

# Global R&D owns the core platform and infrastructure
/libs/core-auth/       @org/global-architecture-team
/infra/kubernetes/     @org/global-sre

# The Marketing Department owns their specific application
/apps/marketing-poc/   @org/marketing-department-leads

# Shared components require both teams (or a specialized review group)
/libs/shared-ui/       @org/frontend-guild
```
*Result*: A Department developer can iterate rapidly on `/apps/marketing-poc/` with approvals from their own tech lead. But if their PoC requires a change in `/libs/core-auth/`, the PR is automatically blocked until Global R&D reviews it.

## 3. Bounded Contexts (Domain-Driven Design)
A Monorepo only scales if the code is structured via **Bounded Contexts**. 
- Departments should not share databases.
- Departments should not share internal domain logic.
- They should only communicate via public interfaces, APIs, or shared typed DTOs (Data Transfer Objects).

Tools like **Nx** or **Bazel** enforce this at compile-time:
```json
// nx.json (Enforcing boundaries)
"boundaries": [
  {
    "sourceTag": "scope:department-marketing",
    "onlyDependOnLibsWithTags": ["scope:shared", "scope:department-marketing"]
  }
]
```
If a Marketing developer imports a file from the Finance department directly, the CI pipeline fails the build instantly.

## 4. Git Performance at Monorepo Scale
When a repository reaches gigabytes in size (like at Microsoft or Google), running `git status` or `git clone` can take minutes.
- **Sparse Checkout**: Developers should use `git sparse-checkout` to only download the specific folders they need (e.g., only their Department's folder and the shared libs), ignoring the hundreds of other apps in the repo.
- **VFS for Git / Scalar**: Use Microsoft Scalar to manage massive Git repos, enabling background fetching and filesystem virtualization so Git remains blazing fast regardless of repository size.
