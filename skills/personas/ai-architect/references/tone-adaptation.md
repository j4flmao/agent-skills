# Affective Computing & Tone Adaptation

## 1. Skill Context
**Focus**: Designing Personas with emotional intelligence (EQ). Agents that dynamically adjust their verbosity, tone, and empathy based on the user's current emotional state and urgency.
**Triggers**: tone-adaptation, affective-computing, sentiment-analysis, persona-eq.

## 2. Dynamic Verbosity
A static Persona is frustrating.
- **Urgent Context**: If the user types "PROD IS DOWN FIX THIS TRACE", the Persona must detect panic/urgency. It must suppress all conversational filler ("I'd be happy to help!", "Let's look at this") and immediately output the exact bash command or SQL rollback script.
- **Exploratory Context**: If the user types "How does this architecture usually scale?", the Persona should detect curiosity and switch to an educational, verbose tone with analogies.

## 3. Implementation (Sentiment Pre-Routing)
1. User sends a message.
2. A lightweight classifier (or simple heuristic) scores the message for `urgency` (0-1) and `frustration` (0-1).
3. The System Prompt is dynamically appended with modifiers:
   - *If Frustration > 0.8*: "The user is frustrated. Be extremely concise. Do not apologize. Provide only the fix."
