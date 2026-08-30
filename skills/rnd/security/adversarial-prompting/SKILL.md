# Adversarial AI & Prompt Injection

## PoC Architecture Design

This PoC analyzes adversarial attack vectors against LLM systems, focusing on Prompt Injection, Jailbreaking, and System Prompt extraction mechanics.

### Core Mechanics
1. **Prompt Injection:** An attacker embeds malicious instructions within user input. The LLM cannot distinguish between the developer's system instructions and the attacker's payload.
2. **Jailbreaks (DAN):** Using hypothetical scenarios or roleplay ("Do Anything Now") to bypass alignment guardrails and elicit restricted behavior.
3. **Data Exfiltration:** An attacker forces the LLM to output the secret system prompt or internal knowledge base, often via Markdown image exfiltration or URL parameters.

### Architecture Map

```mermaid
%%{init: {"theme": "default", "flowchart": {"useMaxWidth": true}}}%%
flowchart TD
    subgraph Attacker ["Adversary"]
        A["Malicious Payload (Ignore previous instructions)"]
    end
    
    subgraph System ["LLM Application"]
        B["System Prompt (You are a helpful assistant)"]
        C["Concatenated Input Context"]
        D["LLM Engine"]
    end
    
    subgraph Exploitation ["Attack Vectors"]
        E["Jailbreak Success (Harmful Output)"]
        F["System Prompt Leak"]
        G["Data Exfiltration via Markdown URL"]
    end
    
    A -->|"Inject"| C
    B -->|"Prepend"| C
    C -->|"Process"| D
    D -->|"Execute Payload"| E
    D -->|"Extract Secrets"| F
    D -->|"Render Image"| G
```
