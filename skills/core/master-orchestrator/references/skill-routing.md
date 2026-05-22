# Skill Routing Reference

## Route Entry Format

Each route entry in the master orchestrator follows this pattern:

```
State: {description of user request or project state}
  Route: {skill-name}
  Reason: "{one-sentence justification}"
```

## Adding a New Route Entry

1. Determine the trigger phrase(s) or file-state condition
2. Create a unique `State:` line that won't conflict with existing entries
3. Add `Route:` with the correct skill folder name
4. Add `Reason:` as a single sentence, present tense, no period

### Example Addition

```
State: User asks about WebRTC, real-time video, peer-to-peer, media streaming.
  Route: webrtc-patterns
  Reason: "WebRTC and real-time media streaming request"
```

## State Patterns

### File-state patterns

```
State: No docs exist, no README with requirements.
State: docs/brief exists, no docs/prd.
State: docs/prd exists, no docs/decisions or docs/specs.
State: Architecture docs exist, user describes a backend task.
State: Architecture docs exist, user describes a frontend task.
```

### User-request patterns

```
State: User shows code for review.
State: User describes a bug with error message or stack trace.
State: User asks about {topic}, {related term}.
State: User says {trigger word}, {synonym}.
```

### Stack-detection patterns

```
State: {stack} stack detected and user describes a backend task.
State: {stack} stack detected and user asks about {pattern}.
```

## Route Priority Rules

1. File-state matches take priority over user-request matches
2. Stack-detection routes only activate when the stack file exists
3. If multiple user-request routes match, use the first match in the file
4. Phase-0 skills (create-brief, create-prd, project-init) take priority over phase-1+

## Template Validation

Every route must pass:
- State is unambiguous
- Route points to an existing skill folder
- Reason fits in one line
- No duplicate state conditions

## Route Testing Checklist

- [ ] Trigger phrase was tested
- [ ] State condition is specific enough
- [ ] Route skill exists at the specified path
- [ ] Reason clearly explains the routing decision
- [ ] No conflicting state conditions with existing routes
