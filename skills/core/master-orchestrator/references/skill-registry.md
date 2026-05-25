# Skill Registry

## Skill Registration

Each skill is registered via a SKILL.md file with frontmatter:

```yaml
---
name: skill-name
description: >
  When to use this skill
tags: [category, subcategory, phase-N]
---
```

### Registry Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Unique skill identifier |
| description | string | Yes | Trigger conditions and usage scope |
| version | string | No | Semver version |
| author | string | No | Creator or team |
| license | string | No | License type |
| compatibility | object | No | Platform compatibility flags |
| tags | string[] | No | Categorization and routing metadata |

## Skill Discovery

```python
class SkillRegistry:
    def __init__(self):
        self.skills = {}
        self.tag_index = defaultdict(list)

    def register(self, skill_dir: str, metadata: dict):
        name = metadata["name"]
        self.skills[name] = {
            "path": skill_dir,
            "metadata": metadata,
        }
        for tag in metadata.get("tags", []):
            self.tag_index[tag].append(name)

    def find_by_tags(self, tags: list[str]) -> list[str]:
        matched = set()
        for tag in tags:
            matched.update(self.tag_index.get(tag, []))
        return list(matched)

    def find_by_phrase(self, phrase: str) -> list[tuple[str, float]]:
        results = []
        for name, skill in self.skills.items():
            desc = skill["metadata"].get("description", "")
            score = self._match_score(phrase, desc)
            if score > 0:
                results.append((name, score))
        return sorted(results, key=lambda x: x[1], reverse=True)
```

## Dependency Resolution

| Dependency Type | Description | Example |
|-----------------|-------------|---------|
| sequential | Skill A must complete before Skill B | create-brief → create-prd |
| parallel | Skills that can run simultaneously | backend-api + frontend-ui |
| optional | Skill that may be needed depending on context | security-review |
| replacement | Skill B can replace Skill A | fastify for express |

```python
class DependencyResolver:
    def resolve_chain(self, skills: list[str]) -> list[str]:
        graph = {}
        for skill in skills:
            metadata = self.registry.skills[skill]["metadata"]
            deps = self._parse_handoff(metadata)
            graph[skill] = deps

        visited = set()
        order = []

        def visit(node):
            if node in visited:
                return
            visited.add(node)
            for dep in graph.get(node, []):
                if dep in graph:
                    visit(dep)
            order.append(node)

        for skill in skills:
            visit(skill)

        return order
```

## Routing Decision

The orchestrator routes by matching user input against skill descriptions using:

1. Exact keyword match (highest priority)
2. Tag intersection (medium priority)
3. Semantic similarity (lowest priority)
4. Default routing to create-brief (fallback)
