---
name: hallucination-and-error-handling
description: >
  Strategies for detecting, mitigating, and gracefully 
  handling LLM hallucinations and API errors within 
  few-shot prompted applications.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [few-shot, hallucination, error-handling, resilience]
---

# Hallucination and Error Handling in Few-Shot Systems

## 1. The Nature of LLM Errors

When integrating LLMs into traditional software architectures, developers must account for a new class of errors. Traditional systems fail deterministically (e.g., `NullReferenceException`). LLMs fail probabilistically.

### 1.1 Types of Errors
1.  **Hallucination (Factual)**: The model states something logically coherent but factually incorrect.
2.  **Hallucination (Formatting)**: The model fails to adhere to the requested output structure (e.g., outputting malformed JSON).
3.  **Context Ignoring**: The model disregards the constraints set in the system prompt or the few-shot examples.
4.  **Provider API Errors**: 502 Bad Gateway, 429 Too Many Requests, Context Length Exceeded.

## 2. Mitigating Hallucinations via Prompt Design

The first line of defense against hallucinations is the prompt itself.

### 2.1 The "I Don't Know" Escape Hatch
A common cause of hallucination is the model attempting to answer a query for which it has no information. You must explicitly authorize the model to refuse an answer.

**Poor System Instruction:**
`Answer the user's question based on the provided documents.`

**Robust System Instruction:**
`Answer the user's question ONLY using the provided documents. If the answer is not contained within the documents, you must respond exactly with: "INSUFFICIENT_INFORMATION". Do not guess or extrapolate.`

### 2.2 Grounding via Few-Shot Examples
Provide few-shot examples that explicitly demonstrate the desired failure state. If you want the model to output "INSUFFICIENT_INFORMATION", you must provide at least one example where it does exactly that.

## 3. Detecting Hallucinations Post-Generation

If the prompt fails to prevent a hallucination, the application logic must detect it.

### 3.1 Self-Reflection (Chain of Verification)
After the model generates an answer, trigger a secondary prompt asking the model to verify its own work.
- *Step 1*: Generate Answer.
- *Step 2*: Prompt: "Given this source text, and this answer, identify any claims in the answer that are not supported by the source text."

### 3.2 Citation Enforcement
Require the model to cite the specific paragraph or line number from the context window that supports its claim. The application logic can then parse the output, extract the citation, and verify that the cited text actually exists in the original context.

## 4. Implementation: Robust Error Handling (Python)

This Python implementation demonstrates handling both structural hallucinations (bad JSON) and network errors using exponential backoff and progressive degradation.

```python
import json
import time
import logging
from typing import Optional, Dict, Any, Callable

logger = logging.getLogger(__name__)

class LLMExecutionError(Exception):
    pass

class LLMResilienceManager:
    def __init__(self, llm_client: Any, max_retries: int = 3):
        self.client = llm_client
        self.max_retries = max_retries

    def execute_with_retries(self, prompt: str, schema_validator: Callable[[Dict], bool]) -> Optional[Dict[str, Any]]:
        """
        Executes a prompt, handles network errors, and retries on malformed output.
        """
        for attempt in range(1, self.max_retries + 1):
            try:
                # 1. Execute LLM Call
                logger.info(f"Attempt {attempt}/{self.max_retries} executing prompt.")
                raw_response = self.client.generate(prompt)
                
                # 2. Handle Markdown Code Blocks
                clean_string = raw_response.strip()
                if clean_string.startswith("```json"):
                    clean_string = clean_string[7:]
                if clean_string.endswith("```"):
                    clean_string = clean_string[:-3]

                # 3. Parse JSON
                parsed_data = json.loads(clean_string.strip())

                # 4. Validate Business Logic Schema
                if schema_validator(parsed_data):
                    return parsed_data
                else:
                    logger.warning("Output parsed as JSON but failed schema validation.")
                    # Optional: In a highly advanced system, you could append the schema error 
                    # to the prompt for the next retry, asking the LLM to fix it.
                    
            except json.JSONDecodeError as e:
                logger.warning(f"JSON Parsing failed on attempt {attempt}: {e}")
            except Exception as e:
                # Handle specific network errors (pseudo-code)
                if hasattr(e, 'status_code') and e.status_code == 429: # Rate Limit
                    wait_time = 2 ** attempt # Exponential backoff
                    logger.warning(f"Rate limited. Waiting {wait_time}s.")
                    time.sleep(wait_time)
                else:
                    logger.error(f"Unexpected API error: {e}")
                    raise LLMExecutionError(f"API Failure: {e}")

        logger.error("Max retries exceeded. Returning safe fallback.")
        return None

# Usage Example
# def is_valid_user_object(data: dict) -> bool:
#     return "name" in data and "age" in data
#
# manager = LLMResilienceManager(client)
# result = manager.execute_with_retries(my_prompt, is_valid_user_object)
# if not result:
#     render_error_ui()
```

## 5. Graceful Degradation Patterns

When the LLM completely fails (max retries exceeded, or provider is down), the application must not crash.

1.  **Fallback to Rules**: If an LLM-based classifier fails, fall back to a hardcoded regex pattern or heuristic rule.
2.  **Fallback to Cache**: If generating a summary fails, check if a previous summary for this entity exists in the cache and serve it with a "stale data" warning.
3.  **Human Handoff**: In customer service applications, automatically route the conversation to a human agent with a flag indicating an AI failure.

## 6. The "Apology" Anti-Pattern

A common failure mode in chat interfaces is the model apologizing for its own internal errors.

**Bad Interaction:**
`User: Extract the date.`
`Model: I apologize, but as an AI, I encountered a JSON parsing error when trying to generate the output.`

This breaks the fourth wall. To prevent this, ensure your error handling logic catches these failures *before* they are rendered to the user. The application layer should generate the apology (e.g., "We are experiencing technical difficulties"), not the LLM.

## 7. Conclusion

Building resilient LLM applications requires accepting that the underlying model is fundamentally unreliable. By engineering prompts with escape hatches, implementing strict schema validation, and utilizing retry loops with progressive degradation, developers can build robust systems on top of probabilistic foundations.
