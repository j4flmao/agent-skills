# Sliding Window Implementations

## Token-Based FIFO Ring Buffer Architectures

In multi-turn chat interactions or continuous log processing pipelines, context states must operate as a sliding window to prevent exceeding the model's token limits. Unlike naive message buffers that evict based on simple array size, **Token-Aware FIFO Ring Buffers** dynamically evaluate the exact token footprints of entries. They prune just enough old data to accommodate incoming messages.

```
+-------------------------------------------------------------+
| [EVICTED] ◄── Messages (Older)                              |
|   - Turn 1 User query (35 tokens)                           |
|   - Turn 1 Assistant response (110 tokens)                  |
+-------------------------------------------------------------+
| Msg 2: "User query context..."    (32 tokens)               |
| Msg 3: "Assistant reply..."       (56 tokens)               |
| Msg 4: "User follow-up..."        (24 tokens)               |
+-------------------------------------------------------------+
| Msg 5: "Incoming message..."      (40 tokens) ◄── [ADDED]   |
+-------------------------------------------------------------+
| CURRENT WINDOW SIZE: 152 / 160 Token Limit                  |
+-------------------------------------------------------------+
```

### Why Naive Array Slicing Fails
1. **Unpredictable Token Fluctuations**: A single message containing a stack trace can consume more tokens than 50 conversational messages combined.
2. **Abrupt API Failures**: If the token size jumps unexpectedly, standard API routes will return 400 errors, crashing the execution workflow.
3. **Loss of Contextual Flow**: Pruning by count rather than token size might prematurely remove crucial instructions while keeping verbose conversation blocks.

---

## The ChatML Standard Format Specification

Frontier models structure inputs using specific system delimiters under the Chat Markup Language (ChatML) standard. Each message block contains specific token wrappers:

```
<|im_start|>system
You are a context compiler.<|im_end|>
<|im_start|>user
Optimize this text.<|im_end|>
<|im_start|>assistant
```

This syntax introduces an overhead of approximately 4 structural tokens per message. Any token-aware sliding window implementation must account for this markup overhead.

### Overhead Table across Tokenizers

| Tokenizer Family | Message Start Prefix | Message End Suffix | Token Overhead per Message |
| :--- | :--- | :--- | :--- |
| **Cl100k_base (GPT-4)** | `<|im_start|>{role}\n` | `<|im_end|>\n` | 4 tokens |
| **O200k_base (GPT-4o)** | `<|im_start|>{role}\n` | `<|im_end|>\n` | 3 tokens |
| **Llama 3 (Llama-3-Tokenizer)** | `<|start_header_id|>{role}<|end_header_id|>\n\n` | `<|eot_id|>` | 5 tokens |

---

## Detailed Step-by-Step Sliding Window Eviction Routine

To process and evict messages dynamically during active runs, follow this sequence:

1. **Calculate the static system template token footprint** ($T_{system}$).
2. **Estimate the token usage of the incoming message** ($T_{new}$), adding the ChatML tag overhead.
3. **Add the new message to the active queue**.
4. **Evaluate the combined token total** ($T_{total} = T_{system} + T_{active}$).
5. **While $T_{total} > C_{max}$**:
   - Locate the oldest message at index 0 of the active queue.
   - Pop the message from the list.
   - Re-evaluate the combined token total.
   - Log an eviction notice to trace performance metrics.
6. **Return the final message collection**.

---

## Mathematical Formulations

Let a sequence of messages $M = (m_1, m_2, \dots, m_n)$ have token lengths $T(m_i)$. The sliding window capacity is denoted by $C_{max}$.
The window selection function finds the minimum index $j$ such that:

$$\sum_{i=j}^{n} T(m_i) \le C_{max} - T_{system}$$

where $T_{system}$ is the static token count of the system prompt instructions that cannot be evicted. The active context delivered to the LLM is:

$$Context = \{ System \} \cup \{ m_i \mid i \ge j \}$$

The eviction rate for a transition from turn $t$ to $t+1$ with incoming payload $m_{new}$ is:

$$\text{Evicted\_Tokens} = \max\left(0, \sum_{i=j_{old}}^{n} T(m_i) + T(m_{new}) - (C_{max} - T_{system})\right)$$

---

## Python Token-Based Sliding Window Class

Here is a production-grade context buffer implementation using Python and `tiktoken`, complete with robust error handling and built-in unit tests.

```python
import tiktoken
import sys
import unittest
from typing import List, Dict, Any, Optional

class TokenSlidingWindow:
    """
    Manages a FIFO message queue that automatically evicts older records
    to maintain a tight token budget limit.
    """
    def __init__(self, 
                 model_name: str = "gpt-4", 
                 max_window_tokens: int = 1000, 
                 system_prompt: Optional[str] = None):
        try:
            self.encoder = tiktoken.encoding_for_model(model_name)
        except Exception:
            # Fallback tokenizer for unsupported models
            self.encoder = tiktoken.get_encoding("cl100k_base")
            
        self.max_tokens = max_window_tokens
        self.messages: List[Dict[str, str]] = []
        
        # Cache system prompt metrics
        self.system_prompt = system_prompt
        self.system_tokens = len(self.encoder.encode(system_prompt)) if system_prompt else 0
        
        if self.system_tokens >= self.max_tokens:
            raise ValueError("System prompt is larger than total sliding window allowance.")
        print(f"[DEBUG] TokenSlidingWindow initialized: system_tokens={self.system_tokens}, max_window={self.max_tokens}", file=sys.stderr)

    def _get_message_tokens(self, message: Dict[str, str]) -> int:
        """Estimates message token cost matching ChatML structures."""
        content = message.get("content", "")
        role = message.get("role", "user")
        # Add 4 tokens overhead for ChatML wrapper delimiters
        return len(self.encoder.encode(content)) + len(self.encoder.encode(role)) + 4

    def get_total_tokens(self) -> int:
        """Returns the current token consumption of all system and active messages."""
        active_tokens = sum(self._get_message_tokens(m) for m in self.messages)
        return self.system_tokens + active_tokens

    def add_message(self, role: str, content: str):
        """
        Adds a message to the window.
        Triggers FIFO eviction sequence if the total tokens exceed limits.
        """
        new_message = {"role": role, "content": content}
        new_message_tokens = self._get_message_tokens(new_message)
        print(f"[DEBUG] Attempting to add message (role={role}, tokens={new_message_tokens})", file=sys.stderr)
        
        # Verify if message itself exceeds buffer boundary limits
        available_budget = self.max_tokens - self.system_tokens
        if new_message_tokens > available_budget:
            print(f"[WARNING] Incoming message size {new_message_tokens} exceeds total budget {available_budget}. Truncating.", file=sys.stderr)
            # Truncate content of message itself as a fallback
            truncated_content = self.encoder.decode(
                self.encoder.encode(content)[:available_budget - 15]
            )
            new_message["content"] = truncated_content + "\n[Content truncated by system window limits]"
            new_message_tokens = self._get_message_tokens(new_message)
            print(f"[DEBUG] Truncated message size = {new_message_tokens} tokens.", file=sys.stderr)
            
        self.messages.append(new_message)
        
        # Eviction Loop
        while self.get_total_tokens() > self.max_tokens:
            if len(self.messages) > 1:
                evicted = self.messages.pop(0)
                print(f"[DEBUG] EVICTED message: role={evicted['role']}, content_preview='{evicted['content'][:30]}...'. New total={self.get_total_tokens()} tokens.", file=sys.stderr)
            else:
                # Only the newly added message remains, and it is still over target limit
                print(f"[WARNING] Single message remains in queue but exceeds total budget limit. Halting eviction.", file=sys.stderr)
                break

    def get_messages_payload(self) -> List[Dict[str, str]]:
        """Assembles output message payload ready for LLM consumption."""
        payload = []
        if self.system_prompt:
            payload.append({"role": "system", "content": self.system_prompt})
        payload.extend(self.messages)
        return payload

class TestTokenSlidingWindow(unittest.TestCase):
    """Unit tests verifying TokenSlidingWindow behavior."""
    
    def test_eviction_threshold(self):
        window = TokenSlidingWindow(max_window_tokens=100, system_prompt="System rules")
        # Add a set of messages that should fit
        window.add_message("user", "Hello World")
        self.assertEqual(len(window.messages), 1)
        
        # Add a massive message to trigger eviction of the first one
        window.add_message("assistant", "A" * 300) # will trigger truncation and eviction
        self.assertEqual(len(window.messages), 1)
        self.assertTrue("[Content truncated" in window.messages[0]["content"])

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        unittest.main(argv=[sys.argv[0]])
    else:
        system_text = "You are a database debugger agent."
        window = TokenSlidingWindow(
            model_name="gpt-4", 
            max_window_tokens=140, 
            system_prompt=system_text
        )
        print(f"Initial Token Count (System only): {window.get_total_tokens()}")
        window.add_message("user", "My index is slow on Postgres database systems.")
        window.add_message("assistant", "Check your EXPLAIN output for Table Scans.")
        window.add_message("user", "Explain command reports Sequential Scan. What should I do next?")
        window.add_message("assistant", "Create an HNSW or B-Tree index depending on data properties.")
        window.add_message("user", "What index should I use for pgvector?")
        
        print("\n--- Current Active Window Messages ---")
        for msg in window.get_messages_payload():
            print(f"[{msg['role'].upper()}]: {msg['content']}")
        print(f"\nFinal Window Token Count: {window.get_total_tokens()} / 140")
```

---

## Handoff & Related References
- Persistent State Management: [persistent-state-management.md](persistent-state-management.md)
- Prompt Token Optimization: [prompt-token-optimization.md](prompt-token-optimization.md)

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with OpenAPI, dynamic loops, and multi-agent coordination protocols.
-->

