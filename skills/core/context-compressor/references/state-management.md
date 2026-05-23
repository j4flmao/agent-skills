# State Management

## Session State Schema

```typescript
interface SessionState {
  // Identity
  sessionId: string;
  startedAt: string;           // ISO 8601
  lastActivityAt: string;      // ISO 8601
  exchangeCount: number;
  skillName: string;

  // Decisions
  decisions: Decision[];
  reversedDecisions: ReversedDecision[];

  // Files
  filesChanged: FileChange[];
  filesCreated: string[];
  filesDeleted: string[];

  // Config
  configValues: Record<string, string>;

  // Progress
  currentState: string;
  nextSteps: string[];
  completedSteps: string[];

  // Blockers
  openQuestions: OpenQuestion[];

  // Compression
  compressionCount: number;
  lastCompressedAt: string | null;
  previousSummaryPath: string | null;
}

interface Decision {
  id: string;
  domain: string;              // DB, Auth, API, Infra, etc.
  decision: string;
  rationale: string;
  alternatives: string[];      // Rejected alternatives
  sessionId: string;           // Which session this was decided in
}

interface FileChange {
  path: string;
  lines: string;               // "10-20" or "10"
  description: string;
  changeType: "add" | "modify" | "delete";
}

interface OpenQuestion {
  question: string;
  blocks: string;              // What it blocks
  raisedInSession: string;
  resolvedAt: string | null;   // ISO 8601 or null
  resolution: string | null;
}
```

## State Capture Points

Capture state at these natural checkpoints:

| Checkpoint | Trigger | What to Capture |
|------------|---------|-----------------|
| Decision made | User says "let's go with X" or "we decided Y" | Add to decisions array |
| File saved | Code writing completed | Add to filesChanged |
| Config set | Environment variable or config value changed | Add to configValues |
| Test written | Test file created or modified | Add to filesChanged with test tag |
| PR opened | Pull request URL shared | Note PR number, store link |
| Bug found | Bug identified but not fixed | Add to openQuestions |
| Bug fixed | Fix applied | Move from openQuestions to decisions |
| Session paused | User says "continue later", "compress" | Full state snapshot |
| Session resumed | User returns with prior summary | Load state, diff against current |

## State Persistence

### File-based persistence

Store state in `.opencode/session-state.json`:

```json
{
  "sessionId": "sess_abc123",
  "startedAt": "2026-05-22T09:00:00Z",
  "lastActivityAt": "2026-05-22T14:30:00Z",
  "exchangeCount": 47,
  "decisions": [
    {
      "id": "dec_001",
      "domain": "DB",
      "decision": "PostgreSQL over MySQL",
      "rationale": "JSONB support needed for flexible schema",
      "alternatives": ["MySQL (rejected: no JSONB)"],
      "sessionId": "sess_abc123"
    }
  ],
  "filesChanged": [
    {
      "path": "src/models/user.ts",
      "lines": "1-85",
      "description": "Created User model with PG schema",
      "changeType": "add"
    }
  ],
  "configValues": {
    "DB_POOL_SIZE": "20",
    "LOG_LEVEL": "debug",
    "PORT": "3000"
  },
  "currentState": "Auth: JWT middleware done. User CRUD in progress.",
  "nextSteps": [
    "Implement password reset endpoint",
    "Add rate limiting to auth routes"
  ],
  "completedSteps": [
    "Database connection configured",
    "User model created",
    "JWT middleware implemented"
  ],
  "openQuestions": [
    {
      "question": "Should refresh tokens use Redis or DB?",
      "blocks": "Token storage implementation",
      "raisedInSession": "sess_abc123",
      "resolvedAt": null,
      "resolution": null
    }
  ],
  "compressionCount": 0,
  "lastCompressedAt": null,
  "previousSummaryPath": null
}
```

### State merging across sessions

When resuming from a compressed summary:

1. Load previous `session-state.json` if it exists
2. Parse compressed summary to extract decisions, files, state
3. Compare with loaded state:
   - New decisions: append
   - Conflicting decisions: new overrides old, move old to `reversedDecisions`
   - New files: append to `filesChanged`
   - Updated current state: replace
   - Updated next steps: replace
   - Resolved open questions: set `resolvedAt` and `resolution`

### State diff for handoff

When passing work between skills, produce a diff rather than full state:

```json
{
  "skill": "core-context-compressor → ba",
  "newDecisions": [
    "Stories scoped to MVP: auth, profile, search"
  ],
  "newFiles": [
    "docs/stories/auth.md"
  ],
  "carriedForward": [
    "Architecture decisions from session 1",
    "Technology stack defined"
  ],
  "blockers": [
    "Pending design mockups for profile page"
  ]
}
```

## State Recovery

If `session-state.json` is missing or corrupted:

1. Check for compressed summary in `.opencode/` or conversation history
2. If summary exists, reconstruct state from summary sections
3. If no summary exists, start fresh and note: `Previous state unrecoverable — starting fresh`
4. File a diagnostic entry: `state-recovery-{timestamp}.json`

## State Cleanup

- Delete `session-state.json` when the project phase is complete (code merged, PR closed)
- Keep compressed summaries for 90 days, then archive
- Never commit `session-state.json` to version control — add `.opencode/session-state.json` to `.gitignore`
- On `compressionCount > 5`, archive old state files to `.opencode/archive/`
