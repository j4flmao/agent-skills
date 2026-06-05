# Prompt Token Optimization

## Serialization Formats & Token Efficiencies

Context engineering requires selecting serialization formats that minimize token consumption while preserving structure. Below is a comparison of JSON, XML, and Markdown representations of the same mock data payload containing server states.

```
Raw Data Payload ────────► [JSON Encoder]   ──► 145 Tokens (High structure, higher delimiters)
                         ► [XML Encoder]    ──► 185 Tokens (High redundancy due to closing tags)
                         ► [Markdown Table] ──►  92 Tokens (Lowest overhead, easy parser alignment)
```

### Representation Comparison

| Format | Token Overhead | Parser Robustness | Key Features |
| :--- | :--- | :--- | :--- |
| **JSON** | Moderate | High (with JSON Mode) | Native standard, strict structure, verbose bracket pairs. |
| **XML** | High | Extreme (best for Claude) | Explicit boundary matching (`<tag>...</tag>`), high character overhead. |
| **Markdown** | Low | Moderate | Ideal for document/list content, compact table layouts, uses indentation. |
| **TSV (Tab-Separated)** | Minimal | Low | Best for massive relational dumps, lacks type preservation. |
| **YAML** | Low-Moderate | High | Easy to read, structural parsing relies on indentation, avoids braces. |

### Structural Tag Minimization
When using XML tags to structure prompts, keep tag names as short as possible. For example, replacing `<retrieved_documentation_context>` with `<doc_ctx>` saves 36 characters (about 8-10 tokens) on each occurrence. Over thousands of dynamically injected files, this small optimization can significantly reduce prompt costs.

---

## Byte-Pair Encoding (BPE) Tokenization Heuristics

Language models use Byte-Pair Encoding (BPE) or WordPiece tokenizers to map characters to integer token IDs. BPE merges the most frequent pairs of bytes iteratively during training.

### Key Characteristics of Tokenizer Mappings
- **Capitalization**: Capitalizing text (e.g. `POSTGRES` instead of `postgres`) splits words into more tokens because the capitalized forms are less frequent in the training corpus.
- **Leading Spaces**: Most tokenizers merge a space with the following word (e.g. ` system` is 1 token, whereas `system` without a space followed by punctuation might generate different merges).
- **Tabulation and Indents**: Four spaces are often parsed as multiple tokens, whereas a single tab character `\t` might be encoded as a single token. Enforcing tab indents in source code dumps can save 20-30% on code block prompt tokens.
- **Emojis and Non-ASCII Characters**: Emojis (e.g., 🚀) and UTF-8 characters represent multiple byte sequences and can trigger massive token splits, sometimes costing 3-4 tokens per single character.

---

## Cost Formulations

To plan large-scale agent workflows, we calculate execution cost as:

$$Cost = P_{input} \cdot T_{input} + P_{output} \cdot T_{output}$$

where:
* $T_{input}$ is the input prompt token count.
* $T_{output}$ is the generated output token count.
* $P_{input}$ and $P_{output}$ are the model's cost coefficients per token.

Because input context is processed on every turn of a multi-turn chat, optimization of input tokens has a cumulative effect. For $N$ turns, if we compress context by $\Delta T$ tokens on average, the total cost savings scale as:

$$\text{Savings} = P_{input} \cdot \sum_{i=1}^{N} \Delta T_i$$

---

## Step-by-Step Optimization and Token Minification Routine

To minimize token sizes programmatically before dispatching payloads, follow this workflow:

1. **Extract dynamic context data** from inputs.
2. **Convert database lists** to Markdown table structures rather than raw JSON strings.
3. **Parse prompt text template** and locate markdown HTML comments (`<!-- comment -->`).
4. **Remove markdown comments** to prevent uploading documentation to the API endpoints.
5. **Collapse white spaces** down to single space characters.
6. **Minimize newline tags**, mapping three or more consecutive line breaks to a maximum double line break.
7. **Hydrate parameters** into the minified template structure.

---

## Python Token Optimization Engine

Below is a Python module designed to optimize and compress verbose prompt templates by stripping filler words, excess whitespace, and comments.

```python
import re
import tiktoken
import sys
import unittest
from typing import Dict, Any, List

class TokenOptimizer:
    """
    Optimizes context strings to maximize token density.
    Removes comments, collapses whitespace, and converts verbose lists to compact Markdown.
    """
    def __init__(self, model_name: str = "gpt-4"):
        try:
            self.encoder = tiktoken.encoding_for_model(model_name)
        except Exception:
            self.encoder = tiktoken.get_encoding("cl100k_base")
            
        # Match markdown comments: <!-- comment -->
        self.comment_pattern = re.compile(r'<!--.*?-->', re.DOTALL)
        # Match multiple spaces or tabs
        self.whitespace_pattern = re.compile(r'[ \t]+')
        # Match multiple newlines
        self.newline_pattern = re.compile(r'\n{3,}')
        print(f"[DEBUG] TokenOptimizer bound to model: '{model_name}'", file=sys.stderr)

    def optimize_text(self, text: str) -> str:
        """Minimizes whitespace and removes comment headers."""
        original_tokens = len(self.encoder.encode(text))
        
        # 1. Strip markdown comments
        text = self.comment_pattern.sub('', text)
        
        # 2. Collapse excess newlines to maximum double newlines
        text = self.newline_pattern.sub('\n\n', text)
        
        # 3. Collapse multiple inline spaces/tabs to a single space
        lines = []
        for line in text.split('\n'):
            line = self.whitespace_pattern.sub(' ', line)
            lines.append(line.strip())
            
        result = "\n".join(lines)
        optimized_tokens = len(self.encoder.encode(result))
        print(f"[DEBUG] Optimization complete: {original_tokens} -> {optimized_tokens} tokens (saved {original_tokens - optimized_tokens}).", file=sys.stderr)
        return result

    def convert_json_to_markdown_table(self, data_list: List[Dict[str, Any]]) -> str:
        """Converts raw list of dicts to a highly token-efficient markdown table."""
        if not data_list:
            return ""
            
        headers = list(data_list[0].keys())
        # Make markdown header
        header_line = "|" + "|".join(headers) + "|"
        separator_line = "|" + "|".join(["---"] * len(headers)) + "|"
        
        data_lines = []
        for item in data_list:
            row = "|" + "|".join(str(item.get(h, "")) for h in headers) + "|"
            data_lines.append(row)
            
        result = "\n".join([header_line, separator_line] + data_lines)
        print(f"[DEBUG] Converted {len(data_list)} JSON records to Markdown table ({len(self.encoder.encode(result))} tokens).", file=sys.stderr)
        return result

    def minify_xml_payload(self, xml_string: str) -> str:
        """Removes spaces between tags and strips comments inside XML."""
        original_tokens = len(self.encoder.encode(xml_string))
        # Replace spaces between tags with empty strings
        xml_string = re.sub(r'>\s+<', '><', xml_string)
        # Remove comments
        xml_string = re.sub(r'<!--.*?-->', '', xml_string)
        result = xml_string.strip()
        print(f"[DEBUG] Minified XML: {original_tokens} -> {len(self.encoder.encode(result))} tokens.", file=sys.stderr)
        return result

class TestTokenOptimizer(unittest.TestCase):
    """Unit tests for verification of the token optimization pipeline."""
    
    def setUp(self):
        self.optimizer = TokenOptimizer()

    def test_comment_removal(self):
        text = "Hello <!-- system instruction hidden --> World"
        optimized = self.optimizer.optimize_text(text)
        self.assertEqual(optimized, "Hello World")

    def test_whitespace_collapsing(self):
        text = "Hello    World\n\n\n\nTest"
        optimized = self.optimizer.optimize_text(text)
        self.assertEqual(optimized, "Hello World\n\nTest")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        unittest.main(argv=[sys.argv[0]])
    else:
        optimizer = TokenOptimizer()
        verbose_prompt = """
        <!-- SYSTEM Directives: Do not show this to users -->
        System: You are an agent.
        
        
        Constraint: Keep answers short.
        
        
        Here is a list of servers that are active:
        """
        
        server_data = [
            {"name": "production-db-1", "ip": "10.0.1.5", "status": "healthy"},
            {"name": "staging-api-2", "ip": "10.0.2.12", "status": "degraded"},
            {"name": "dev-cache-1", "ip": "10.0.3.1", "status": "healthy"}
        ]
        
        json_repr = str(server_data)
        markdown_repr = optimizer.convert_json_to_markdown_table(server_data)
        
        raw_prompt = verbose_prompt + "\n" + json_repr
        optimized_text = optimizer.optimize_text(verbose_prompt) + "\n" + markdown_repr
        
        print("=== Raw Token Count ===")
        print(f"Tokens: {len(optimizer.encoder.encode(raw_prompt))}")
        print("=== Optimized Token Count ===")
        print(f"Tokens: {len(optimizer.encoder.encode(optimized_text))}")
        print("\nOptimized Text Output:\n", optimized_text)
```

---

## Handoff & Related References
- Context Drift Mitigation: [context-drift-mitigation.md](context-drift-mitigation.md)
- Memory Retrieval Architectures: [memory-retrieval-architectures.md](memory-retrieval-architectures.md)

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with OpenAPI, dynamic loops, and multi-agent coordination protocols.
-->

