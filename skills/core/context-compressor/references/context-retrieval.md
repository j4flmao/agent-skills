# Context Retrieval System

## Hierarchical Context

### Multi-Level Context Store
```typescript
class ContextStore {
  private fullHistory: Message[] = [];
  private compressedHistory: Message[] = [];
  private summaryCache: Map<string, string> = new Map();

  addMessage(message: Message): void {
    this.fullHistory.push(message);
    this.compressIfNeeded();
  }

  getOptimizedContext(): Message[] {
    const tokenCount = this.countTokens(this.compressedHistory);

    if (tokenCount <= this.maxTokens) {
      return [...this.compressedHistory, ...this.fullHistory.slice(-5)];
    }

    return this.compressedHistory;
  }

  private compressIfNeeded(): void {
    if (this.countTokens(this.fullHistory) > this.compressionThreshold) {
      const summary = this.generateSummary(this.fullHistory);
      this.summaryCache.set(Date.now().toString(), summary);
      this.compressedHistory = [
        { role: 'system', content: `Summary: ${summary}` },
        ...this.fullHistory.slice(-this.windowSize),
      ];
    }
  }
}
```

## Key Points
- Store full conversation history externally for retrieval on demand
- Provide compressed context for token-efficient processing
- Implement hierarchical summarization at multiple granularity levels
- Cache summaries to avoid redundant compression
- Use semantic chunking for better context boundaries
- Tag context segments with metadata for filtered retrieval
- Implement progressive loading for deep context exploration
- Support context pinning for critical information
- Monitor context quality with compression accuracy metrics
- Balance retrieval speed with compression depth
