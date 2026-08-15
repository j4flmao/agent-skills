---
name: Tree of Thoughts (ToT)
description: Breadth-first search over LLM states and state evaluation reference.
---
# Tree of Thoughts (ToT) Mechanics

Tree of Thoughts (ToT) generalizes the concept of prompt engineering by framing LLM decoding as a rigorous search over a tree where nodes represent partial solutions (thoughts). This enables the LLM to perform deliberate reasoning through exploration and backtracking.

## State Space Formulation
The problem is formulated as a tuple $(S, G, E, V, \text{Search})$, where $S$ is the state space, $G$ is the generator of thoughts, $E$ is the evaluator, and $V$ is the validation criteria.

### Breadth-First Search (BFS) Implementation
In ToT BFS, we maintain a frontier of size $b$. At step $k$, we expand each of the $b$ states by generating $k$ new thoughts.

```mermaid
flowchart TD
%%{init: {"theme": "default", "themeVariables": {"fontSize": "28px"}, "flowchart": {"useMaxWidth": false}}}%%
    subgraph SearchBFSStateSearch ["<div style='padding-bottom: 40px;'>BFS State Search</div>"]
        State_0[State 0] -->|"GenerateThoughts(k=3)"| T1[Thought 1]
        State_0 -->|"GenerateThoughts(k=3)"| T2[Thought 2]
    end
    subgraph EvaluationStateEvaluationLayer ["<div style='padding-bottom: 40px;'>State Evaluation Layer</div>"]
        T1 -->|"Evaluate(T1)"| E1[Score: 0.9]
        T2 -->|"Evaluate(T2)"| E2[Score: 0.4]
    end
    E1 -->|"Prune()"| Next[Next Frontier]
```

## State Evaluation Mechanisms
Evaluating states involves prompting the LLM to assess the viability of a partial solution.
- **Value Prompting**: The LLM assigns a scalar score (e.g., 1-10) or classification (sure, likely, impossible).
- **Voting**: Multiple LLM instances vote on the best thought among candidates.
