# Token Optimization

## Prompt Compression

```python
from llmlingua import PromptCompressor
import tiktoken

# LLMLingua compression
compressor = PromptCompressor()

original_prompt = """
You are a helpful AI assistant. You should provide accurate and concise answers to user questions.
When you don't know the answer, you should say so rather than making up information.
Always maintain a polite and professional tone.
Consider the following context when answering:
The Earth is the third planet from the Sun. It has a diameter of approximately 12,742 kilometers.
It is the only known planet to harbor life. About 71% of its surface is covered in water.
User question: What is the diameter of Earth?
"""

# Compress
compressed = compressor.compress(
    original_prompt,
    rate=0.5,           # compress to 50%
    condition_compare=True,
    condition_in_question="what is the diameter of earth",
)

print(f"Original: {len(original_prompt.split())} words")
print(f"Compressed: {len(compressed['compressed_prompt'].split())} words")
print(f"Compressed: {compressed['compressed_prompt']}")

# Token counting
enc = tiktoken.encoding_for_model("gpt-4")
original_tokens = len(enc.encode(original_prompt))
compressed_tokens = len(enc.encode(compressed['compressed_prompt']))
print(f"Original: {original_tokens} tokens → Compressed: {compressed_tokens} tokens")
print(f"Savings: {(1 - compressed_tokens/original_tokens) * 100:.0f}%")
```

## System Prompt Optimization

```python
# Before: 375 tokens (verbose)
system_prompt_verbose = """
You are a helpful, respectful, and honest AI assistant designed to provide accurate information
and assist users with their queries. You should always respond in a clear and concise manner,
providing factual information based on your training data. If you are unsure about something,
you should clearly state that you do not know rather than fabricating information.
You must never generate harmful, abusive, or misleading content. You should always respect
user privacy and avoid requesting personal information. When answering questions, provide
context-appropriate responses that match the user's level of expertise.
"""

# After: 98 tokens (optimized)
system_prompt_optimized = """
Answer concisely and factually. Say if unsure. Be professional.
No harmful content. Respect privacy. Match user expertise level.
"""

# Cost impact
cost_per_token = 0.00001  # example: $0.01 per 1K tokens
savings_per_call = (375 - 98) * cost_per_token
daily_calls = 100000
monthly_savings = savings_per_call * daily_calls * 30
print(f"Monthly savings from system prompt optimization: ${monthly_savings:.2f}")
```

## Context Window Management

```python
class ContextManager:
    def __init__(self, max_tokens=32000, model="gpt-4"):
        self.max_tokens = max_tokens
        self.model = model
        self.enc = tiktoken.encoding_for_model(model)

    def count_tokens(self, text):
        return len(self.enc.encode(text))

    def truncate_context(self, context_items, max_context_tokens=None):
        """Truncate context to fit within budget."""
        if max_context_tokens is None:
            max_context_tokens = self.max_tokens // 2  # leave room for output

        selected = []
        total_tokens = 0

        for item in sorted(context_items, key=lambda x: x.get("score", 0), reverse=True):
            item_tokens = self.count_tokens(item["content"])
            if total_tokens + item_tokens <= max_context_tokens:
                selected.append(item)
                total_tokens += item_tokens
            else:
                break

        return selected, total_tokens

    def sliding_window(self, conversation, window_size=4000):
        """Keep only recent conversation within window."""
        total = 0
        window = []
        for msg in reversed(conversation):
            msg_tokens = self.count_tokens(msg["content"])
            if total + msg_tokens > window_size:
                break
            window.insert(0, msg)
            total += msg_tokens
        return window

    def estimate_cost(self, input_tokens, output_tokens, model_pricing):
        """Calculate cost for a request."""
        input_cost = input_tokens * model_pricing["input"] / 1000
        output_cost = output_tokens * model_pricing["output"] / 1000
        return input_cost + output_cost
```

## Token Budget Tracking

```python
class TokenBudgetTracker:
    def __init__(self, monthly_budget_usd, model_pricing):
        self.monthly_budget = monthly_budget_usd
        self.model_pricing = model_pricing
        self.daily_limit = monthly_budget_usd / 30
        self.usage = []

    def log_request(self, model, input_tokens, output_tokens):
        cost = (input_tokens * self.model_pricing[model]["input"] +
                output_tokens * self.model_pricing[model]["output"]) / 1000
        self.usage.append({
            "timestamp": datetime.now(),
            "model": model,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "cost": cost,
        })

    def get_daily_cost(self):
        today = datetime.now().date()
        daily = [u for u in self.usage if u["timestamp"].date() == today]
        return sum(u["cost"] for u in daily)

    def check_budget(self):
        daily_cost = self.get_daily_cost()
        if daily_cost > self.daily_limit * 0.8:
            return {"warning": True, "daily_cost": daily_cost, "limit": self.daily_limit}
        return {"warning": False, "daily_cost": daily_cost}
```

## Streaming

```python
from openai import OpenAI

client = OpenAI()

# Without streaming: full response buffered
def without_streaming(prompt):
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}],
        stream=False,
    )
    return response.choices[0].message.content

# With streaming: incremental output, lower perceived latency
def with_streaming(prompt):
    stream = client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}],
        stream=True,
    )
    collected = []
    for chunk in stream:
        if chunk.choices[0].delta.content:
            collected.append(chunk.choices[0].delta.content)
    return "".join(collected)

# Streaming also allows early stopping
def stream_with_early_stop(prompt, stop_phrases=["\n\n", "In conclusion"]):
    stream = client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}],
        stream=True,
        stop=stop_phrases,
    )
    result = ""
    for chunk in stream:
        if chunk.choices[0].finish_reason == "stop":
            break
        content = chunk.choices[0].delta.content or ""
        result += content
        # Early stop if token budget exceeded
        if len(result.split()) > 200:
            break
    return result
```
