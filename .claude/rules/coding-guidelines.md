---
description: "j4flmao/rules — Core coding guidelines for AI Agents (Fail fast, no placeholders)"
glob: "*"
---

# Agentic Coding Guidelines

Cursor/AI MUST follow these principles when writing or refactoring code.

## 1. NO Placeholders or TODOs
- **Rule**: Never generate code containing `// TODO: Implement this later` or `pass` unless explicitly instructed to create a stub.
- **Why**: AI is here to write the code, not to leave homework for the user. If you lack context, ASK the user or write the complete implementation based on best assumptions.

## 2. Fail Fast & Loud
- **Rule**: Never swallow exceptions. Do not return `null` or `-1` when a critical error occurs. Throw an exception immediately.
- **Example (Bad)**: `if (!file) return null;`
- **Example (Good)**: `if (!file) throw new FileNotFoundException("Failed to load config.json");`

## 3. Structured and Contextual Logging
- **Rule**: Whenever you write an error handling block, include contextual logging.
- **Example**: Do not log `"Error parsing user"`. Log `"Failed to parse user payload for userId: {userId}. Error: {errorMsg}"`.

## 4. Single Responsibility Principle (SRP)
- **Rule**: If a function exceeds 30-40 lines of logic, aggressively break it down into smaller, testable private helper methods. Do not create God Functions.

## 5. Security by Default
- **Rule**: Never hardcode credentials, secrets, or API keys in the generated code. Always use environment variables (e.g., `process.env.API_KEY`).
