# Git Log Parsing Reference

This document is the authoritative cookbook for extracting structured commit
data from `git log` and transforming it into changelog entries. The skill's
pipeline depends on these patterns being deterministic and robust to malformed
input.

## 1. Pretty-Format Tokens

`git log --format` accepts placeholders that the skill composes into machine-
parseable records. Memorise these:

| Token  | Meaning                                             | Example                                  |
|--------|-----------------------------------------------------|------------------------------------------|
| `%H`   | Commit hash (full)                                  | `4f9b1c2a8e7d6f5b4a3c2d1e0f9a8b7c6d5e4f3`|
| `%h`   | Commit hash (abbreviated)                            | `4f9b1c2`                                |
| `%s`   | Subject (first line of message)                     | `feat(auth): rotate refresh tokens`      |
| `%b`   | Body (everything after the blank line after subject)| `BREAKING CHANGE: ...`                    |
| `%B`   | Raw body (subject + body)                            | `feat(auth): rotate refresh tokens\n\nBREAKING...` |
| `%an`  | Author name                                          | `Alice Zhao`                             |
| `%ae`  | Author email                                         | `alice@example.com`                      |
| `%aI`  | Author date (ISO 8601, strict)                       | `2026-05-14T10:30:00+00:00`              |
| `%cn`  | Committer name                                       | (often differs from author on rebases)   |
| `%cI`  | Committer date (ISO 8601, strict)                    | `2026-05-14T10:31:00+00:00`              |
| `%P`   | Parent hashes (space-separated)                      | `a1b2c3d 4e5f6a7` (merge has two)        |
| `%(trailers:key=Co-authored-by,valueonly)` | Trailer values                | `Bob Lin <bob@x.com>`                    |
| `%d`   | Refs (tags, branches)                                | ` (HEAD -> main, tag: v1.4.0)`           |
| `%x00` | Literal NUL byte                                     | Record separator                          |
| `%x1e` | Literal record-separator byte                        | Field separator                           |

**Key insight:** use NUL or RS bytes as field separators rather than newlines.
Commit messages contain newlines; pipe-or-comma separators are fragile.

## 2. The Canonical Extraction Command

```bash
# Use \x1e as field separator and \x00 as record terminator.
# Output is robust to any character that may appear inside a commit message.
GIT_LOG_FORMAT='%H%x1e%aI%x1e%an%x1e%ae%x1e%s%x1e%B%x00'

git log \
  --no-merges \
  --format="$GIT_LOG_FORMAT" \
  --reverse \
  "${PREV_TAG}..${TARGET_REF}"
```

| Flag           | Reason                                                                        |
|----------------|-------------------------------------------------------------------------------|
| `--no-merges`  | Merge commits duplicate their parents' subjects; exclude them in linear histories |
| `--reverse`    | Oldest first; the changelog renders newest first so we reverse on write       |
| `--first-parent` | Use when squash-and-merge is the policy; preserves only mainline commits     |
| `--invert-grep --grep='^Merge '` | Belt-and-braces when `--no-merges` is insufficient (e.g. fast-forward merges of named feature branches) |

### Range Selection

| Range                    | Use Case                                  |
|--------------------------|-------------------------------------------|
| `<prev-tag>..HEAD`       | Standard: changes since last release      |
| `<prev-tag>..<this-tag>` | Regenerating an existing release          |
| `--since="2026-01-01"`   | Date-bounded (avoid; commit dates lie)    |
| `--max-count=200`        | Cap; useful for first-time bootstrapping  |
| `origin/main..HEAD`      | Pre-PR changelog draft                    |
| `<sha>^..<sha>`          | Single commit                             |

## 3. Conventional Commit Grammar

The Conventional Commits 1.0.0 spec, simplified:

```
<type>[optional !][optional (scope)][optional !]: <description>

[optional body]

[optional footers]
```

### Subject Line Regex (PCRE)

```regex
^(?P<type>[a-z]+)(?:\((?P<scope>[a-z0-9\-_/]+)\))?(?P<breaking>!)?: (?P<description>.+)$
```

| Capture       | Example              | Notes                                      |
|---------------|----------------------|--------------------------------------------|
| `type`        | `feat`               | Lowercase, one word                        |
| `scope`       | `auth`, `api/billing`| Optional; lowercase; `/` allowed for paths |
| `breaking`    | `!`                  | Marks breaking change (alt: BREAKING footer)|
| `description` | `add token rotation` | Imperative, lowercase first word           |

### Body Convention

```
feat(auth)!: rotate refresh tokens every 24h

Refresh tokens issued before this change are invalidated immediately.
This eliminates the long-lived token attack surface.

BREAKING CHANGE: clients must re-authenticate after upgrade.
Refs: #312, #298
Co-authored-by: Bob Lin <bob@example.com>
```

### Footer Trailers

| Trailer              | Semantics                                                |
|----------------------|----------------------------------------------------------|
| `BREAKING CHANGE:`   | Marks breaking change with description                   |
| `BREAKING-CHANGE:`   | Same (hyphenated form accepted by spec)                  |
| `Refs:` / `Refs`     | Linked references (issues, ADRs)                          |
| `Closes:` / `Fixes:` | Closes the referenced issue on merge                     |
| `Co-authored-by:`    | Attribution; GitHub displays in PR/commit                |
| `Signed-off-by:`     | DCO; legal attestation                                   |
| `Reviewed-by:`       | Reviewer credit                                          |
| `Cherry-picked-from:`| Backport tracking                                        |

## 4. Python Reference Parser

```python
"""Reference parser for Conventional Commits used by the changelog skill."""
from __future__ import annotations
import re
import subprocess
from dataclasses import dataclass, field
from typing import Iterator

SUBJECT_RE = re.compile(
    r"""
    ^
    (?P<type>[a-z]+)
    (?:\((?P<scope>[a-z0-9\-_/]+)\))?
    (?P<breaking>!)?
    :\s
    (?P<description>.+)
    $
    """,
    re.VERBOSE,
)

ISSUE_RE = re.compile(r"#(\d+)|([A-Z]{2,}-\d+)")
BREAKING_FOOTER_RE = re.compile(r"^BREAKING[- ]CHANGE:\s*(.+)$", re.MULTILINE)
CO_AUTHOR_RE = re.compile(r"^Co-authored-by:\s*(.+?)\s*<.+>$", re.MULTILINE)


@dataclass
class Commit:
    sha: str
    author_date: str  # ISO 8601
    author_name: str
    author_email: str
    subject: str
    body: str
    # Parsed
    type: str | None = None
    scope: str | None = None
    breaking: bool = False
    description: str | None = None
    issues: list[str] = field(default_factory=list)
    breaking_notes: list[str] = field(default_factory=list)
    co_authors: list[str] = field(default_factory=list)

    @property
    def is_conventional(self) -> bool:
        return self.type is not None


def parse_subject(subject: str) -> dict | None:
    """Parse Conventional Commit subject. Returns None if non-conformant."""
    m = SUBJECT_RE.match(subject)
    if not m:
        return None
    return {
        "type": m.group("type"),
        "scope": m.group("scope"),
        "breaking": m.group("breaking") == "!",
        "description": m.group("description"),
    }


def parse_commit(raw: str) -> Commit:
    """Parse one record emitted by the canonical extraction command."""
    fields = raw.split("\x1e", 5)
    if len(fields) != 6:
        raise ValueError(f"Malformed record: {raw[:120]!r}")
    sha, date, name, email, subject, body = fields
    c = Commit(sha=sha, author_date=date, author_name=name,
               author_email=email, subject=subject, body=body)
    parsed = parse_subject(subject)
    if parsed:
        c.type = parsed["type"]
        c.scope = parsed["scope"]
        c.description = parsed["description"]
        c.breaking = parsed["breaking"]
    # Footers
    for m in BREAKING_FOOTER_RE.finditer(body):
        c.breaking = True
        c.breaking_notes.append(m.group(1).strip())
    c.issues = [g[0] or g[1] for g in ISSUE_RE.findall(subject + "\n" + body)]
    c.co_authors = CO_AUTHOR_RE.findall(body)
    return c


def iter_commits(prev: str, target: str = "HEAD") -> Iterator[Commit]:
    fmt = "%H%x1e%aI%x1e%an%x1e%ae%x1e%s%x1e%B%x00"
    cmd = ["git", "log", "--no-merges", f"--format={fmt}",
           "--reverse", f"{prev}..{target}"]
    out = subprocess.check_output(cmd, text=True, encoding="utf-8")
    for record in out.split("\x00"):
        record = record.strip()
        if record:
            yield parse_commit(record)
```

### Round-Trip Test

```python
def test_parser_handles_multiline_body():
    raw = (
        "abc123\x1e2026-05-14T10:30:00+00:00\x1eAlice\x1ea@x.com\x1e"
        "feat(auth)!: rotate refresh tokens\x1e"
        "feat(auth)!: rotate refresh tokens\n\nBody text.\n\n"
        "BREAKING CHANGE: re-auth required.\nRefs: #312"
    )
    c = parse_commit(raw)
    assert c.type == "feat"
    assert c.scope == "auth"
    assert c.breaking is True
    assert c.description == "rotate refresh tokens"
    assert c.issues == ["312"]
    assert "re-auth required." in c.breaking_notes[0]
```

## 5. Classification Decision Table

After parsing, each commit is mapped to a changelog section.

| `type`       | Default Section | If `breaking` |
|--------------|-----------------|---------------|
| `feat`       | Added           | BREAKING      |
| `fix`        | Fixed           | BREAKING      |
| `perf`       | Changed         | BREAKING      |
| `refactor`   | Changed         | BREAKING      |
| `revert`     | Fixed (or omit) | BREAKING      |
| `docs`       | omit            | omit          |
| `style`      | omit            | omit          |
| `test`       | omit            | omit          |
| `chore`      | omit            | omit (except deps with CVEs → Security) |
| `build`      | omit            | BREAKING      |
| `ci`         | omit            | omit          |
| `security`   | Security        | Security + BREAKING |
| `deprecate`  | Deprecated      | Deprecated    |
| `remove`     | Removed         | BREAKING      |

### Override: Security Dependencies

`chore(deps): bump ws to 8.17.1` is normally omitted. If the commit body
includes a CVE identifier (`CVE-2024-37890`) the skill re-classifies it as
Security and surfaces the CVE in the entry.

### Override: User-Facing Docs

`docs(api): document new /users endpoint` is normally omitted, but if the scope
indicates user-facing documentation (`api`, `cli`, `sdk`, `readme`) the skill
may include it under Changed at a lower importance score.

## 6. Importance Scoring (Sort Within Section)

```python
def importance(commit: Commit) -> tuple:
    """Higher tuple = sorted first."""
    return (
        commit.breaking,              # Breaking changes first
        commit.type == "security",    # Then security
        scope_user_facing(commit.scope),  # User-facing scopes win ties
        -commit.issues_count,         # More linked issues = more substantial
        -len(commit.description),     # Longer descriptions tend to be bigger features
        commit.sha,                   # Deterministic tiebreaker
    )

USER_FACING_SCOPES = {"api", "cli", "ui", "auth", "billing", "payment",
                      "dashboard", "sdk", "webhook"}

def scope_user_facing(scope: str | None) -> int:
    if scope is None:
        return 0
    top = scope.split("/", 1)[0]
    return 1 if top in USER_FACING_SCOPES else 0
```

## 7. Squash-Merge Workflows

GitHub's squash-merge condenses an entire PR into a single commit. The commit
subject is the PR title and the body is a list of original commit subjects.

```
feat(auth): rotate refresh tokens (#312)

* feat: scaffold rotation handler
* test: cover rotation expiry
* refactor: extract token utils
* docs: add migration note
```

In this workflow:

- `git log --no-merges` already yields one commit per PR; no aggregation needed.
- The PR number is in parentheses at the end of the subject; the parser must
  extract it before classification because the description otherwise contains
  it.
- The body's bullet list is **noise** for changelog purposes — only the subject
  matters. Body is mined only for `BREAKING CHANGE:` and `Co-authored-by:`.

### Subject Reformatter

```python
PR_SUFFIX_RE = re.compile(r"\s*\(#(\d+)\)\s*$")

def extract_pr_from_subject(subject: str) -> tuple[str, str | None]:
    m = PR_SUFFIX_RE.search(subject)
    if m:
        return PR_SUFFIX_RE.sub("", subject), m.group(1)
    return subject, None
```

## 8. Rebase-and-Merge Workflows

In rebase-and-merge, the PR's individual commits are preserved on the trunk.
The changelog skill **MUST** aggregate consecutive commits sharing the same
`(type, scope)` into a single entry to avoid an exploded changelog.

```python
def aggregate_consecutive(commits: list[Commit]) -> list[Commit | list[Commit]]:
    out = []
    buf = []
    for c in commits:
        if buf and c.type == buf[0].type and c.scope == buf[0].scope and \
           not c.breaking and not buf[0].breaking:
            buf.append(c)
        else:
            if buf:
                out.append(buf if len(buf) > 1 else buf[0])
            buf = [c]
    if buf:
        out.append(buf if len(buf) > 1 else buf[0])
    return out
```

Aggregated entries render as:

```markdown
- feat(auth): add login, logout, and password reset (#310, #311, #312)
```

## 9. Merge Commit Edge Cases

| Scenario                                    | Handling                                       |
|---------------------------------------------|------------------------------------------------|
| Standard merge commit                       | Skip with `--no-merges`                        |
| Merge commit with original subject text     | Skip; the subject is the merge message, not the change |
| Octopus merge (>2 parents)                  | Walk each parent's commits with `--first-parent` from the merge to its base |
| Fast-forward merge (no merge commit)        | Already handled; commits land on trunk directly |
| Merge of release branch back into main      | `--first-parent` from main, otherwise duplicate of release commits |
| Squash-merge appearing as merge             | GitHub's squash-merge is NOT a merge commit; one parent only |

## 10. Tag Discovery

```bash
# Latest version-shaped tag (SemVer)
git describe --tags --abbrev=0 --match='v[0-9]*'

# All tags sorted by version
git tag --list 'v*' --sort='-v:refname'

# Tag for HEAD (if any) — for verifying release in progress
git describe --tags --exact-match HEAD 2>/dev/null

# Find first tag containing a commit (when did this fix ship?)
git tag --list 'v*' --sort='v:refname' --contains <sha> | head -1
```

### Pre-release Tag Handling

Tags like `v2.0.0-rc.1`, `v2.0.0-beta.2`, `v2.0.0-alpha+build.42` need careful
sorting. SemVer 2.0 precedence rules:

```
1.0.0-alpha < 1.0.0-alpha.1 < 1.0.0-alpha.beta < 1.0.0-beta
        < 1.0.0-beta.2 < 1.0.0-beta.11 < 1.0.0-rc.1 < 1.0.0
```

Use `git tag --sort='-v:refname'` for git's built-in SemVer-aware sort, but
verify against the spec when comparing pre-release identifiers.

## 11. Statistics Helpers

```bash
# Commit counts per type (for release sizing)
git log --no-merges --format="%s" "${PREV}..HEAD" \
  | grep -oE '^(feat|fix|perf|refactor|docs|test|chore|build|ci|style|revert)' \
  | sort | uniq -c | sort -rn

# Top contributors in range
git shortlog -sne --no-merges "${PREV}..HEAD" | head -20

# File hotspots in range
git log --no-merges --format= --name-only "${PREV}..HEAD" \
  | sort | uniq -c | sort -rn | head -20

# Insertions / deletions
git diff --numstat "${PREV}..HEAD" \
  | awk '{add+=$1; del+=$2} END {printf "%d insertions, %d deletions\n", add, del}'
```

## 12. Handling Non-Conventional Commits

When the repo does **not** enforce Conventional Commits, the parser falls back
to heuristics:

```python
HEURISTIC_RULES = [
    (re.compile(r"^(fix|bug|repair|correct)\b", re.IGNORECASE),     "fix"),
    (re.compile(r"^(add|new|introduce|implement)\b", re.IGNORECASE), "feat"),
    (re.compile(r"^(refactor|rework|restructure|extract|inline)\b", re.IGNORECASE), "refactor"),
    (re.compile(r"^(perf|optimi[sz]e|speed up|faster)\b", re.IGNORECASE), "perf"),
    (re.compile(r"^(remove|delete|drop)\b", re.IGNORECASE),          "remove"),
    (re.compile(r"^(doc|document|comment)\b", re.IGNORECASE),         "docs"),
    (re.compile(r"^(test|spec|coverage)\b", re.IGNORECASE),           "test"),
    (re.compile(r"^(bump|upgrade|update.*to)\b", re.IGNORECASE),      "chore"),
]

def infer_type(subject: str) -> str:
    for pattern, type_ in HEURISTIC_RULES:
        if pattern.match(subject):
            return type_
    return "chore"  # unknown → omit
```

The heuristic mode emits a warning to stderr noting the count of commits where
the type was inferred — release managers should fix the workflow rather than
rely on heuristics long-term.

## 13. Commit Filtering Rules

| Filter                                     | Rationale                                          |
|--------------------------------------------|----------------------------------------------------|
| Drop commits with subject `^revert\b` that have a matching earlier commit in range | Avoid noise: revert of in-range commit means net-zero |
| Drop commits with subject matching `^(WIP|wip|TODO):` | These should never have landed on trunk |
| Drop commits authored by bots (`dependabot[bot]`, `renovate[bot]`) unless they fix CVEs | Routine dependency bumps are noise |
| Drop commits with empty body and subject `chore: ...` | No reader-facing value |
| Keep commits where `--name-only` shows changes only under `docs/` if user-facing | Documentation updates can ship in changelogs |

## 14. PowerShell Equivalent (Windows-First Repositories)

```powershell
$prev = git describe --tags --abbrev=0
$fmt = '%H{0}%aI{0}%an{0}%ae{0}%s{0}%B{1}' -f [char]30, [char]0
$raw = git log --no-merges --reverse "--format=$fmt" "$prev..HEAD"
$records = $raw -split [char]0 | Where-Object { $_.Trim() }
$commits = foreach ($r in $records) {
  $f = $r -split [char]30, 6
  [PSCustomObject]@{
    Sha     = $f[0]
    Date    = $f[1]
    Author  = $f[2]
    Email   = $f[3]
    Subject = $f[4]
    Body    = $f[5]
  }
}
$commits | Where-Object Subject -match '^feat' | Format-Table -AutoSize
```

## 15. Edge-Case Catalogue

| Edge Case                                    | Resolution                                   |
|----------------------------------------------|----------------------------------------------|
| Commit subject contains a literal `\x1e`     | Vanishingly rare; if it happens, switch to base64-encoded subject (`%H%x00<base64>`) |
| Commit message in non-UTF-8 encoding         | `git log --encoding=UTF-8 ...` re-encodes    |
| Commit with no author email                  | Use placeholder `noreply@local`              |
| Empty subject (rare; git allows it)          | Skip; emit warning                           |
| Subject is whitespace only                   | Treat as empty                                |
| Subject longer than 200 chars                | Truncate at 100 chars + `…` for changelog; full subject still goes in CHANGELOG attribution |
| Body has trailing CRLF (Windows commits)     | Normalise to LF before parsing footers       |
| Body uses `BREAKING-CHANGE:` (hyphen)        | Accept (spec-compliant alternate spelling)   |
| Body uses `Breaking change:` (mixed case)    | Reject; warn user that footer was not detected |
| Commit reverts a commit outside the range    | Keep; user-facing revert is still notable    |
| Cherry-pick of a tagged release commit       | Suppress; original entry already exists      |
| Merge commit subject `Merge branch 'main' …` | `--no-merges` catches it; double-check with grep |

## 16. Verification Steps After Extraction

Before passing parsed commits to the changelog generator, the skill **MUST**:

1. Assert no duplicate SHAs.
2. Assert every commit's `author_date` parses as ISO 8601.
3. Assert the count of commits matches `git rev-list --no-merges --count
   "${PREV}..${HEAD}"`.
4. Count Conventional Commits compliance and warn if compliance is below 80%.
5. Emit a `parsing-report.json` artefact for the CI step to attach to the PR.

```json
{
  "range": "v1.3.2..HEAD",
  "total_commits": 47,
  "conventional_commits": 44,
  "conventional_compliance": 0.936,
  "by_type": {"feat": 18, "fix": 12, "refactor": 6, "chore": 8, "docs": 3},
  "breaking_changes": 1,
  "co_authors": ["Bob Lin", "Carol Wu"],
  "issues_referenced": ["#298", "#308", "#310", "#311", "#312"]
}
```
