---
name: context-window-management
description: >
  Strategies and algorithms for effectively managing
  the context window state in LLM interactions,
  specifically tailored for few-shot scenarios.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [few-shot, context-window, state-management]
---

# Context Window Management for Few-Shot Prompts

## 1. The Context Window Challenge

In the context of Large Language Models (LLMs), the "context window" refers to the maximum number of tokens (words or sub-words) the model can process in a single request. This includes both the input prompt (instructions, few-shot examples, query) and the generated output. 

When utilizing few-shot prompting, a significant portion of this valuable real estate is consumed by the examples themselves. Effective context window management is therefore the process of dynamically organizing, compressing, and evicting information to stay within limits while maximizing model performance.

### 1.1 The Anatomy of a Few-Shot Prompt

A standard few-shot prompt consists of several distinct sections, each with its own priority level:

1.  **System Instruction (Highest Priority)**: The core rules and persona. Must NEVER be truncated.
2.  **Context/Background Data (High Priority)**: Information necessary to answer the specific query.
3.  **Few-Shot Examples (Medium Priority)**: The selected examples demonstrating the task. Can be scaled down if necessary.
4.  **User Query (High Priority)**: The actual question or task.
5.  **Output Buffer (Crucial)**: Reserved space for the model to generate its response.

### 1.2 Token Counting Strategies

Accurate token counting is the foundation of context management. You cannot manage what you cannot measure.

-   **Exact Counting**: Utilizing the specific tokenizer for the target model (e.g., `tiktoken` for OpenAI models). This is required for production.
-   **Heuristic Counting**: Approximating tokens based on character count (e.g., 1 token ≈ 4 English characters). Only suitable for rough estimates during development.

## 2. Dynamic Context Assembly

The process of assembling the context window must be dynamic, reacting to the size of the input query and available examples.

### 2.1 The Assembly Pipeline

```text
[Input Query] --> (Tokenize & Count)
                        |
                        v
[Calculate Available Token Budget]
   Budget = Max_Tokens - Reserved_Output - Query_Tokens - Instruction_Tokens
                        |
                        v
[Example Selection & Truncation] <-- (Pulls from Example Pool)
   Iteratively add examples until Budget is reached.
                        |
                        v
[Final Prompt Assembly]
```

### 2.2 Eviction and Truncation Policies

When the budget is tight, how do we decide what to cut?

1.  **FIFO (First In, First Out) for Chat History**: In conversational few-shot scenarios, older turns are evicted first.
2.  **Least Relevant Example Eviction**: If using dynamic example selection (see `example-selection-architectures.md`), drop the example with the lowest similarity score first.
3.  **Intra-Example Truncation**: Instead of dropping an entire example, truncate lengthy parts of the example's input or output, replacing them with `...[truncated]...`.

## 3. Implementation (TypeScript)

This robust TypeScript class handles token-aware prompt assembly.

```typescript
import { encode } from 'tiktoken'; // Assuming tiktoken is available

export interface PromptComponent {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface Example {
  input: string;
  output: string;
}

export interface ContextConfig {
  maxContextTokens: number;
  reservedOutputTokens: number;
  systemInstruction: string;
}

export class ContextManager {
  private config: ContextConfig;

  constructor(config: ContextConfig) {
    this.config = config;
  }

  private countTokens(text: string): number {
    // In production, instantiate encoder once and reuse
    const tokens = encode(text);
    return tokens.length;
  }

  public assemblePrompt(
    query: string,
    examples: Example[],
    chatHistory: PromptComponent[] = []
  ): PromptComponent[] {
    const finalPrompt: PromptComponent[] = [];
    
    // 1. Add System Instruction (Non-negotiable)
    finalPrompt.push({ role: 'system', content: this.config.systemInstruction });
    let currentTokens = this.countTokens(this.config.systemInstruction);

    // 2. Calculate initial budget
    const queryTokens = this.countTokens(query);
    let remainingBudget = this.config.maxContextTokens - this.config.reservedOutputTokens - currentTokens - queryTokens;

    if (remainingBudget <= 0) {
        throw new Error("Query and System Instruction exceed maximum context limit.");
    }

    // 3. Process Examples (Medium Priority)
    const formattedExamples: PromptComponent[] = [];
    for (const ex of examples) {
      const exInputTokens = this.countTokens(ex.input);
      const exOutputTokens = this.countTokens(ex.output);
      const totalExTokens = exInputTokens + exOutputTokens + 10; // +10 for formatting/framing overhead

      if (remainingBudget >= totalExTokens) {
        formattedExamples.push({ role: 'user', content: ex.input });
        formattedExamples.push({ role: 'assistant', content: ex.output });
        remainingBudget -= totalExTokens;
      } else {
        console.warn("Context budget exhausted. Dropping remaining examples.");
        break; // Stop adding examples
      }
    }

    // 4. Process Chat History (Lowest Priority - Evict oldest first)
    const formattedHistory: PromptComponent[] = [];
    // Iterate backwards through history to keep most recent turns
    for (let i = chatHistory.length - 1; i >= 0; i--) {
        const turn = chatHistory[i];
        const turnTokens = this.countTokens(turn.content) + 5; // overhead
        
        if (remainingBudget >= turnTokens) {
            formattedHistory.unshift(turn); // Add to beginning of history array
            remainingBudget -= turnTokens;
        } else {
            break; // Budget exhausted
        }
    }

    // 5. Final Assembly
    finalPrompt.push(...formattedHistory);
    finalPrompt.push(...formattedExamples);
    finalPrompt.push({ role: 'user', content: query });

    return finalPrompt;
  }
}
```

## 4. Implementation (Python)

A Python implementation focusing on dynamic formatting and context window safety.

```python
import tiktoken
from typing import List, Dict, Tuple

class TokenizerWrapper:
    def __init__(self, model_name: str = "gpt-3.5-turbo"):
        try:
            self.encoding = tiktoken.encoding_for_model(model_name)
        except KeyError:
            print("Warning: model not found. Using cl100k_base encoding.")
            self.encoding = tiktoken.get_encoding("cl100k_base")

    def count(self, text: str) -> int:
        return len(self.encoding.encode(text))

class ContextWindowOptimizer:
    def __init__(self, max_tokens: int, reserve_output: int):
        self.max_tokens = max_tokens
        self.reserve_output = reserve_output
        self.tokenizer = TokenizerWrapper()

    def _format_example(self, ex_input: str, ex_output: str) -> str:
        return f"Input: {ex_input}\nOutput: {ex_output}\n\n"

    def optimize_few_shot(self, system_prompt: str, query: str, examples: List[Tuple[str, str]]) -> str:
        """
        Constructs a few-shot prompt, dynamically dropping examples if token limits are reached.
        """
        system_tokens = self.tokenizer.count(system_prompt)
        query_format = f"Input: {query}\nOutput: "
        query_tokens = self.tokenizer.count(query_format)
        
        available_budget = self.max_tokens - self.reserve_output - system_tokens - query_tokens
        
        if available_budget <= 0:
            raise ValueError("System prompt and query are too large for the context window.")

        included_examples_text = ""
        
        # Iterate over examples, prioritizing the ones at the start of the list
        for ex_in, ex_out in examples:
            formatted_ex = self._format_example(ex_in, ex_out)
            ex_tokens = self.tokenizer.count(formatted_ex)
            
            if available_budget >= ex_tokens:
                included_examples_text += formatted_ex
                available_budget -= ex_tokens
            else:
                # If we hit the limit, we stop adding examples.
                # In a more advanced implementation, we might try to truncate the example.
                print(f"Token limit reached. Dropping {len(examples) - examples.index((ex_in, ex_out))} examples.")
                break
                
        final_prompt = f"{system_prompt}\n\n{included_examples_text}{query_format}"
        return final_prompt
        
    def summarize_context(self, long_text: str, target_tokens: int) -> str:
        """
        A placeholder for a method that would call a cheaper LLM to summarize
        background context if it's too large to fit alongside examples.
        """
        current_tokens = self.tokenizer.count(long_text)
        if current_tokens <= target_tokens:
            return long_text
            
        # Hard truncation fallback
        tokens = self.tokenizer.encoding.encode(long_text)
        truncated_tokens = tokens[:target_tokens]
        return self.tokenizer.encoding.decode(truncated_tokens) + "... [Truncated for length]"
```

## 5. Advanced Strategies: Context Compression

When dropping examples is detrimental to performance, context compression techniques can be employed.

### 5.1 Prompt Summarization
Use a smaller, faster model (e.g., GPT-3.5) to summarize lengthy background context or chat history before feeding it into the more expensive model alongside the few-shot examples.

### 5.2 Information Extraction
Instead of passing raw documents as context, use an extraction pipeline to pull only the relevant facts (e.g., named entities, specific metrics) and format them concisely as part of the system instruction.

### 5.3 Gist Tokens (Research Concept)
Some newer architectures explore training models to output "gist tokens"—highly compressed representations of past context that can be fed back into the model, drastically reducing the token footprint of historical data.

## 6. Best Practices and Error Handling

### 6.1 State Management Rules
1.  **Stateless API Calls**: Treat every call to the LLM as stateless. The `ContextManager` must completely rebuild the required context window from the ground up for every single interaction.
2.  **Separate Storage**: Never rely on the LLM provider to maintain conversational state for complex few-shot applications. Store chat history and user context in a dedicated database (e.g., Redis, PostgreSQL).
3.  **Strict Token Budgets**: Always enforce a strict budget for output generation. If an LLM hits the max context limit while generating, the output will be abruptly cut off, leading to invalid JSON or incomplete sentences.

### 6.2 Common Failure Modes

| Symptom | Cause | Mitigation |
| :--- | :--- | :--- |
| API returns `context_length_exceeded` error | Inaccurate token counting (using character estimation instead of tokenizer). | Implement exact token counting using `tiktoken` or model equivalent. |
| Output is cut off mid-sentence | Reserved output tokens are too low, or max tokens limit is hit. | Increase `reservedOutputTokens`. Implement a hard limit on input size. |
| Model forgets persona | System instruction was evicted to make room for examples or history. | System instruction must be pinned and excluded from eviction policies. |
| Degraded performance on long chats | Few-shot examples are pushed out of the context window by lengthy chat history. | Implement strict prioritization: System > Examples > Query > History. |

## 7. Conclusion

Mastering context window management is essential for building resilient LLM applications. By implementing precise token counting, dynamic assembly pipelines, and intelligent eviction policies, developers can guarantee that the model always receives the optimal mix of instructions, examples, and context, regardless of the user's input size.
