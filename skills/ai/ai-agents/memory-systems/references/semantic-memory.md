# Semantic Memory (Long-Term Continuity)

## 1. Skill Context
**Focus**: Giving Personas long-term memory across isolated chat sessions by extracting entities and storing them in Vector Databases (like Mem0 or Zep).
**Triggers**: semantic-memory, long-term-memory, mem0, entity-extraction.

## 2. The Amnesia Problem
Standard LLMs are stateless. Every time you start a new thread, the Agent forgets that you hate Python, love Rust, and prefer dark mode. Hardcoding this into the System Prompt wastes precious tokens and doesn't scale.

## 3. The Memory Pipeline
1. **Extraction (Background Task)**: While the user chats, a small, cheap LLM (e.g., Llama 3 8B) runs asynchronously in the background. It reads the conversation and extracts "Facts" (e.g., "User's deployment environment is AWS EKS", "User prefers functional programming").
2. **Storage**: These facts are embedded as vectors and stored in a specialized memory DB.
3. **Retrieval (Pre-computation)**: When the user opens a *new* chat and says "Deploy the app", the system embeds the query, retrieves the relevant facts from the Memory DB ("User uses AWS EKS"), and injects them into the Persona's prompt dynamically.
