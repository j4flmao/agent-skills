# Changelog Format Reference

A definitive reference for the on-disk shape, semantics, validation, and edge cases
of `CHANGELOG.md`. This document is the authoritative source-of-truth that the
skill's pipeline must conform to when serializing changelog sections.

## 1. Format Family Selection

Three formats dominate the ecosystem. The skill defaults to **Keep a Changelog
1.1.0** because it is the most ergonomic for humans and is also parseable by most
automation tooling. The other two are documented so the agent can reason about
migration paths.

| Format                | Audience            | Machine-Parseable | Section Names                    | Versioning Coupling |
|-----------------------|---------------------|-------------------|----------------------------------|---------------------|
| Keep a Changelog 1.1  | Humans first        | Partial (regex)   | Added / Changed / Deprecated / Removed / Fixed / Security | Optional |
| Conventional Commits  | Machines first      | Yes (strict)      | feat / fix / perf / refactor / docs / test / chore / build / ci / revert | Required (with SemVer) |
| GNU NEWS              | OS-level packagers  | No                | Freeform paragraphs              | Loose |

The skill **MUST** prefer Keep a Changelog when no project-level configuration
exists, **MUST** prefer the project's existing format if one is present, and
**MUST NEVER** silently migrate between formats.

## 2. Top-Level File Layout

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- (in-progress entries land here)

## [1.4.0] - 2026-05-14

### Added
- feat(auth): refresh token rotation (#312)

### Fixed
- fix(api): null user in /me endpoint (#308)

### Security
- security(deps): bump `ws` to 8.17.1 to address CVE-2024-37890 (#310)

## [1.3.2] - 2026-04-30

### Fixed
- fix(payments): retry idempotency key collision (#301)

[Unreleased]: https://github.com/acme/widget/compare/v1.4.0...HEAD
[1.4.0]: https://github.com/acme/widget/compare/v1.3.2...v1.4.0
[1.3.2]: https://github.com/acme/widget/compare/v1.3.1...v1.3.2
```

### Section Order (Mandatory)

Within a release, sections **MUST** appear in this order. Tooling sorts on write:

1. `### Security` — high-priority CVEs and credential rotations
2. `### BREAKING` (optional non-spec extension, mirrors Conventional Commits)
3. `### Added`
4. `### Changed`
5. `### Deprecated`
6. `### Removed`
7. `### Fixed`

Many in-the-wild changelogs put `Added` first. The skill places `Security` first
because reviewers reading the diff during release sign-off must see security
fixes without scrolling. This is a deliberate, opinionated deviation from the
upstream spec and is documented in the project header.

## 3. Version Header Grammar

```
## [VERSION] - DATE
```

| Token        | Grammar                          | Example         | Validator                                  |
|--------------|----------------------------------|-----------------|--------------------------------------------|
| `VERSION`    | SemVer 2.0 (`X.Y.Z[-pre[+build]]`) | `2.0.0-rc.1`   | `^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$`     |
| `DATE`       | ISO 8601 calendar date (UTC)     | `2026-05-14`    | `^\d{4}-\d{2}-\d{2}$`                       |
| Separator    | Literal ` - ` (space, dash, space) | ` - `          | n/a                                        |

The `[VERSION]` brackets are not optional. They are markdown reference link
targets matched at the bottom of the file. Drop them and the comparison links
silently break.

### Yanked Releases

If a release was retracted (broken artefacts, security incident discovered post-publish):

```markdown
## [1.4.1] - 2026-05-15 [YANKED]

This release was yanked due to a regression in the auth middleware.
Upgrade directly from 1.4.0 to 1.4.2.
```

The skill must preserve `[YANKED]` markers when regenerating. They are never
removed automatically; only the release manager may strike them.

## 4. Entry Grammar

```
- {type}({scope}): {imperative description} (#{ref})
```

| Token         | Required | Example                            | Rule                                    |
|---------------|----------|------------------------------------|-----------------------------------------|
| `type`        | Yes      | `feat`, `fix`, `perf`              | Lowercase Conventional Commits type     |
| `(scope)`     | Yes      | `(auth)`, `(api/billing)`          | Lowercase noun; may contain `/`         |
| `description` | Yes      | `add refresh token rotation`        | Imperative, lowercase first word        |
| `(#{ref})`    | Yes      | `(#312)`, `(GH-312)`, `(PROJ-99)`  | One PR or issue reference per entry     |
| Trailing `.`  | No       | —                                  | Never end with `.`                      |

### Multi-Ref Entries

Some entries close multiple issues. Format:

```markdown
- feat(billing): tax-inclusive invoicing (#412, #413, closes #199)
```

When `closes` / `fixes` / `resolves` is used, the keyword must precede the
hashtag. Issue-tracking automation depends on this exact phrasing.

### Co-Author Acknowledgement

Entries authored by external contributors must include attribution:

```markdown
- fix(parser): handle BOM in CSV input (#321) — thanks @alice-zhao
```

The skill **MUST** parse the `Co-authored-by:` trailer from git commits and emit
acknowledgements for any non-org committer.

## 5. Breaking Changes

The Keep a Changelog spec does not name a section for breaking changes; instead
it leaves them in `Changed` / `Removed`. The skill extends this with a `BREAKING`
subsection because release-note readers must see them on first glance.

```markdown
### BREAKING

- feat(api)!: change response envelope from `{data}` to `{results, meta}` (#411)
  - Migration: update all client deserializers; `data` is removed, not aliased.
  - Affected clients: `widget-js >=2`, `widget-py >=1.4`.
  - Detection: clients that fail will throw `KeyError('data')` immediately on
    deserialization; no silent data loss.
  - Effective: 2026-05-14 (this release; no deprecation window).
```

Each breaking entry **MUST** include:

| Field          | Why it exists                                                       |
|----------------|---------------------------------------------------------------------|
| Migration      | Tell consumers exactly what to change                               |
| Affected       | Help downstream maintainers triage whether they are impacted        |
| Detection      | Symptom on the consumer side so it is easy to recognise post-upgrade|
| Effective      | When the break takes effect (this release, or next major)            |

If the project follows SemVer, breaking changes only legitimately appear in
major releases (`X.0.0`). The skill **MUST** refuse to emit a `BREAKING` section
into a minor or patch release header — that is a release-policy violation, not a
formatting choice.

## 6. Reference Link Footer

Reference-style markdown links live at the bottom of the file. The skill
maintains them automatically.

```markdown
[Unreleased]: https://github.com/acme/widget/compare/v1.4.0...HEAD
[1.4.0]: https://github.com/acme/widget/compare/v1.3.2...v1.4.0
[1.3.2]: https://github.com/acme/widget/compare/v1.3.1...v1.3.2
[1.3.1]: https://github.com/acme/widget/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/acme/widget/releases/tag/v1.3.0
```

Rules:

- The **first** version in history points to the `releases/tag/vX.Y.Z` URL, not
  a `compare` URL. Comparing against the void produces a 404 in GitHub.
- Tag prefix (`v` or no prefix) **MUST** match the actual git tag. Mismatch
  produces broken links; CI must validate.
- Order is reverse chronological. When inserting a new release, the new line
  goes above the previous one.

### Non-GitHub Hosts

| Host      | Compare URL Template                                                       |
|-----------|----------------------------------------------------------------------------|
| GitHub    | `https://github.com/<owner>/<repo>/compare/v{prev}...v{next}`              |
| GitLab    | `https://gitlab.com/<owner>/<repo>/-/compare/v{prev}...v{next}`            |
| Bitbucket | `https://bitbucket.org/<owner>/<repo>/branches/compare/v{next}..v{prev}#diff` (note: reversed argument order) |
| Gitea     | `https://<host>/<owner>/<repo>/compare/v{prev}...v{next}`                   |
| Sourcehut | `https://git.sr.ht/<owner>/<repo>/log/v{next}` (no native compare URL)      |

The skill must consult `git remote get-url origin` to derive the host and pick
the correct template. Falling back to GitHub when the host is unrecognised
produces silently broken links.

## 7. Unreleased Section Lifecycle

The `[Unreleased]` section is the staging area for changes between releases. It
serves two purposes:

1. **Continuous documentation** — each merged PR appends one entry, so the file
   is always current with no end-of-cycle scramble.
2. **Pre-release validation** — release managers can read the staged section and
   decide between patch / minor / major bump from observed entries.

### State Transitions

```
                 ┌─────────────────────┐
                 │  [Unreleased]       │  ← accumulating entries
                 │   ### Added         │
                 │   ### Fixed         │
                 └─────────┬───────────┘
                           │  release cut
                           ▼
                 ┌─────────────────────┐
                 │  ## [X.Y.Z] - DATE  │  ← renamed in place
                 │   (sections kept)   │
                 └─────────┬───────────┘
                           │  insert new empty Unreleased above
                           ▼
                 ┌─────────────────────┐
                 │  ## [Unreleased]    │  ← fresh, empty
                 │                     │
                 ├─────────────────────┤
                 │  ## [X.Y.Z] - DATE  │
                 └─────────────────────┘
```

### Empty Unreleased Handling

When cutting a release and the Unreleased section is empty (a hot-patch where no
entries were staged), the skill **MUST** synthesise entries from the commit
range and stage them under Unreleased first, then run the rename transition. It
must not skip the staging step — that bypass loses the human review window where
release managers spot mis-categorised commits.

## 8. Date Format and Time Zones

Dates are **ISO 8601 calendar dates in UTC**: `YYYY-MM-DD`. No times, no
timezones, no localized formats.

| Bad Format         | Why                                                       |
|--------------------|-----------------------------------------------------------|
| `May 14, 2026`     | Not sortable, not machine-parseable, locale-dependent     |
| `14/05/2026`       | Ambiguous (UK vs US ordering)                             |
| `2026-05-14T10:30Z`| Implies precision the changelog does not warrant          |
| `2026-5-14`        | Not ISO 8601 (months/days must be zero-padded)            |
| `2026-05-14 PST`   | Timezone is ambiguous around midnight; use UTC date only  |

The date represents **the publication date of the artefact**, not the commit
date of the last change. A release prepared on 2026-05-13 and published on
2026-05-14 takes the latter date.

## 9. Validation Rules (Enforced by CI)

The skill emits a `changelog-lint.yml` CI step that runs these checks:

```yaml
# .github/workflows/changelog-lint.yml
name: changelog-lint
on: [pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Verify CHANGELOG.md
        run: |
          # 1. File exists
          test -f CHANGELOG.md
          # 2. Has [Unreleased] section
          grep -q '^## \[Unreleased\]' CHANGELOG.md
          # 3. Every version header has a date
          grep -P '^## \[\d+\.\d+\.\d+[^\]]*\]' CHANGELOG.md | \
            grep -vP ' - \d{4}-\d{2}-\d{2}( \[YANKED\])?$' && exit 1 || true
          # 4. Every version has a footer link
          versions=$(grep -oP '^## \[\K[^\]]+' CHANGELOG.md | grep -v Unreleased)
          for v in $versions; do
            grep -q "^\[$v\]:" CHANGELOG.md || { echo "missing link: $v"; exit 1; }
          done
          # 5. No duplicate version headers
          dup=$(grep -oP '^## \[\K[^\]]+' CHANGELOG.md | sort | uniq -d)
          [ -z "$dup" ] || { echo "duplicate versions: $dup"; exit 1; }
```

| Check | Failure Mode |
|-------|--------------|
| `[Unreleased]` exists | Engineers have no place to stage entries; releases skip the review window |
| Every version has ISO date | Automation (release-please, semantic-release) breaks |
| Every version has footer link | Rendered links 404; reader cannot navigate |
| No duplicate versions | Merge conflict residue; downstream parsers crash |
| Bracket pairs balanced | Reference link syntax broken silently |

## 10. Idempotence Contract

Re-running the changelog generator on the same input range **MUST** produce
byte-identical output. This is enforced by:

- Stable sort within each section (by importance score, then by PR number
  ascending as deterministic tiebreaker)
- Sort of footer links by SemVer descending
- Trailing newline always exactly one (POSIX rule)
- Unix line endings (`\n` only); Windows `\r\n` is normalised on write
- UTF-8 with no BOM

Any non-determinism (current time, dictionary iteration order in Python <3.7
without `OrderedDict`, set iteration in any language) is a correctness defect.

## 11. Section-by-Section Semantics

### Added
New features visible to a downstream consumer (end user, API caller, library
user). New private internal helpers do **not** belong here — they go unmentioned
or under `Changed` if they restructured public-facing behaviour.

### Changed
Behavioural changes to existing functionality. Includes performance improvements
that are observable (faster response time documented; faster internal sort that
no user can detect is omitted).

### Deprecated
Items still present but slated for removal. Each entry **MUST** name the version
in which removal is planned:

```markdown
- deprecate(api): `POST /v1/users` — removed in 2.0.0; migrate to `POST /v2/users`
```

### Removed
Items no longer present. Often the corresponding `Deprecated` entry was emitted
in an earlier release; the skill **SHOULD** cross-reference:

```markdown
- remove(api): `POST /v1/users` — deprecated in 1.6.0
```

### Fixed
Bug fixes visible to a downstream consumer. Internal bug fixes (a fix to a test
helper, a typo in a comment) are omitted.

### Security
Vulnerability fixes. **MUST** include CVE reference if assigned, severity, and
affected versions:

```markdown
- security(deps): bump `ws` to 8.17.1 (CVE-2024-37890, CVSS 7.5, affects <1.4.0)
```

### BREAKING (extension)
See section 5 above.

## 12. Common Pitfalls and Resolutions

| Pitfall                                            | Resolution                                                                  |
|----------------------------------------------------|-----------------------------------------------------------------------------|
| Trailing whitespace on entry lines                 | Markdown linters flag this; CI step `markdownlint CHANGELOG.md`             |
| Mixed `Added` and `Add` headings across versions   | Lock to nouns: Added, Changed, Removed (never imperative)                   |
| Footer link uses `tree/main` instead of `compare`  | Compare URL is correct because it shows the range; `tree/main` shows latest |
| Multiple changelogs (root + subfolder)             | Monorepo convention: per-package changelogs under `packages/*/CHANGELOG.md` |
| Duplicate entries from rebased branches            | Use commit hash dedupe, not text dedupe                                     |
| Wrong date because release cut spanned midnight UTC| Date stamp at the moment the tag is pushed, not when the PR opened          |
| Forgotten `[Unreleased]` after release             | Skill always emits fresh empty Unreleased as part of release transition     |
| BREAKING in patch release                          | Reject; treat as release-policy bug                                         |
| Localized dates from contributor tools             | Normalise to ISO 8601 on write                                              |
| `## v1.4.0` instead of `## [1.4.0]`                | Bracket form is required for reference links to resolve                     |

## 13. Per-Format Quick Conversions

When migrating an existing changelog into the Keep a Changelog format the skill
applies these transformations:

```python
# Pseudo-code for migration
def migrate_freeform_to_keep_a_changelog(raw: str) -> str:
    sections = split_by_blank_paragraph(raw)
    out = ["# Changelog\n"]
    for section in sections:
        version, date = extract_version_and_date(section)
        entries = extract_bullets(section)
        groups = {"Added": [], "Changed": [], "Fixed": [], "Removed": [],
                  "Deprecated": [], "Security": []}
        for entry in entries:
            kind = classify_entry(entry)  # heuristic on verbs
            groups[kind].append(rewrite_to_imperative(entry))
        out.append(f"\n## [{version}] - {date}\n")
        for name in ("Security", "Added", "Changed", "Deprecated", "Removed", "Fixed"):
            if groups[name]:
                out.append(f"\n### {name}\n")
                out.extend(f"- {e}" for e in sorted(groups[name], key=importance))
    out.extend(emit_reference_links(versions))
    return "\n".join(out) + "\n"
```

## 14. Encoding and Locale

| Property          | Required                                                              |
|-------------------|-----------------------------------------------------------------------|
| Encoding          | UTF-8 without BOM                                                     |
| Line endings      | LF (`\n`) on disk; CRLF on Windows must be normalised on write        |
| Trailing newline  | Exactly one                                                           |
| Character set     | Full Unicode; entries may include any contributor's name              |
| Markdown flavour  | CommonMark + GitHub-Flavoured tables                                  |
| Maximum line len  | None enforced; wrap at 80 if a `.editorconfig` sets `max_line_length` |

## 15. Atomicity and Failure Recovery

The skill writes `CHANGELOG.md` atomically:

1. Read existing file.
2. Compute new contents in memory.
3. Write to `CHANGELOG.md.tmp` in the same directory.
4. `fsync` the temp file.
5. `rename` to `CHANGELOG.md` (atomic on POSIX, atomic-ish on Windows ≥10).
6. `fsync` the directory.

If any step fails the original file is intact. The skill **MUST NOT** open the
target file in `w` mode and stream into it; a crash mid-write would truncate
the changelog and lose history.
