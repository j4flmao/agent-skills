# Meta-Prompting (AI Generating AI)

## 1. Skill Context
**Focus**: Using an Orchestrator Persona to dynamically write and optimize System Prompts for ephemeral Sub-Agents based on the task at hand.
**Triggers**: meta-prompting, dspy, dynamic-system-prompts, agent-generation.

## 2. The Concept
Hardcoding 50 different Personas (Coder, Tester, DevOps) is rigid. Meta-prompting allows the system to be fluid.
1. User: *"I need to analyze this genomic sequence data."*
2. **Meta-Agent**: Realizes it doesn't have a `Bioinformatics_Persona`.
3. **Meta-Agent**: Writes a brand new 500-word System Prompt outlining the rules, tools, and constraints for a world-class Bioinformatics Expert.
4. The system instantiates this new Sub-Agent on the fly, feeds it the user's data, and kills the agent when the task is done.

## 3. DSPy Alignment
This aligns with Stanford's DSPy framework, where prompts are treated as compiled code. The Meta-Agent is the compiler, generating the optimized instruction set for the target model.
