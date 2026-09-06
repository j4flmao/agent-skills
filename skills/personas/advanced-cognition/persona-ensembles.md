# Persona Ensembles (Mixture of Experts)

## 1. Skill Context
**Focus**: Using a variety of distinct AI Personas in parallel to solve open-ended System Design or Creative problems, mimicking a real-world engineering team.
**Triggers**: persona-ensembles, moe, ensemble-generation, diverse-perspectives.

## 2. Prompt-Level Mixture of Experts
In hardware, MoE means activating different neural network weights. In Agentic architectures, MoE means activating different System Prompts.
- **The Setup**: Instead of asking one generic AI to "Design a scalable backend", you spawn 4 Personas:
  - `The Startup Hacker`: Optimizes for speed to market, suggests Firebase/Supabase.
  - `The Enterprise Architect`: Optimizes for compliance, suggests Java/Spring/Kafka.
  - `The FinOps Engineer`: Optimizes for cost, suggests Serverless/Spot Instances.
  - `The SRE`: Optimizes for reliability, suggests Multi-AZ, Chaos Engineering.

## 3. Aggregation
Run all 4 Personas in parallel. Then, use a `Synthesizer_Persona` to read all 4 proposals and extract the best attributes of each to form a balanced, bulletproof Master Plan.
