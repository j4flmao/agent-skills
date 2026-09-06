# Proactive Assistance

## 1. Skill Context
**Focus**: Breaking the standard Request-Response cycle. Designing Personas that initiate actions without explicit user prompts.
**Triggers**: proactive-agent, autonomous-triggers, background-monitoring.

## 2. The Paradigm Shift
Standard AI is a reactive tool (User prompts -> AI responds). A Proactive Persona acts like a real colleague. It observes the environment and speaks up when necessary.

## 3. Autonomous Triggers
- **File System Watchers**: The Persona is hooked into the OS filesystem events. If it notices the user pasting a massive JSON file into the workspace, it proactively generates a TypeScript interface for it and sends a message: *"I noticed you added a new JSON payload. Would you like me to save these TS interfaces I generated for it?"*
- **CI/CD Polling**: The Persona monitors Github Actions in the background. If a build fails while the user is coding, the Persona interrupts: *"Heads up, your staging build just failed on the `auth` module. The error is a missing ENV variable. Want me to draft the fix?"*
