# Data Versioning Branching

## Branching Strategies for Data

Versioned data enables branching, merging, and time travel similar to source code.

### Branch Model

```python
from enum import Enum
from datetime import datetime
from dataclasses import dataclass

class BranchType(Enum):
    MAIN = "main"           # Production-ready data
    FEATURE = "feature"     # Development/testing
    RELEASE = "release"     # Release candidates
    HOTFIX = "hotfix"       # Urgent fixes

@dataclass
class Branch:
    name: str
    type: BranchType
    base: str | None
    created_at: datetime
    owner: str
    description: str
    protected: bool = False

class BranchManager:
    def __init__(self, versioning_backend: VersioningBackend):
        self.backend = versioning_backend

    def create_branch(self, branch: Branch):
        self.backend.create_branch(branch.name, branch.base)
        self._protect_branches(branch)
        self._log_branch_event("created", branch)

    def merge_branch(self, source: str, target: str, strategy: str = "squash"):
        conflicts = self._detect_conflicts(source, target)
        if conflicts:
            return MergeResult(conflicts=conflicts, status="blocked")

        merge_commit = self.backend.merge(source, target, strategy)
        self._post_merge_validation(target)
        return MergeResult(commit=merge_commit, status="merged")

    def _detect_conflicts(self, source: str, target: str) -> list[Conflict]:
        diff = self.backend.diff(source, target)
        return [
            Conflict(path=c.path, source_value=c.source_value, target_value=c.target_value)
            for c in diff if c.type == "conflict"
        ]
```

### Workflow Integration

```python
class DataBranchWorkflow:
    def __init__(self, manager: BranchManager):
        self.manager = manager

    def feature_branch_flow(self, feature_name: str, base: str = "main"):
        # Create feature branch
        feature_branch = Branch(
            name=f"feature/{feature_name}",
            type=BranchType.FEATURE,
            base=base,
            created_at=datetime.utcnow(),
            owner="data_engineer",
            description=f"Feature: {feature_name}",
        )
        self.manager.create_branch(feature_branch)

        # Quality checks
        self.manager.run_quality_gates(feature_branch.name)

        # Create merge request
        merge_request = MergeRequest(
            source=feature_branch.name,
            target="main",
            description=feature_branch.description,
        )
        return merge_request
```

## Key Points

- Branch types: main, feature, release, hotfix
- Protected branches prevent direct commits
- Conflict detection before merge
- Squash merge for feature branches
- Quality gates run before merge approval
- Merge request workflow for peer review
- Branch lifecycle: create → develop → review → merge → delete
- Feature branches deleted after merge to main
- Hotfix branches for production data issues
- Branch diff shows schema and data changes between versions
