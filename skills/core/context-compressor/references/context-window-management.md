# Context Window Management

## Understanding Context Windows

Context windows define the maximum token capacity of a language model. Effective management ensures critical information fits while maintaining response quality.

### Window Size by Model

```typescript
const MODEL_WINDOWS: Record<string, number> = {
  'gpt-4': 8192,
  'gpt-4-32k': 32768,
  'gpt-4-turbo': 128000,
  'gpt-4o': 128000,
  'claude-3-haiku': 200000,
  'claude-3-sonnet': 200000,
  'claude-3-opus': 200000,
  'claude-3.5-sonnet': 200000,
  'claude-4': 200000,
  'gemini-pro': 32768,
  'gemini-1.5-pro': 1048576,
  'llama-3-8b': 8192,
  'llama-3-70b': 8192,
  'llama-3.1-8b': 131072,
  'mistral-large': 32768,
  'codestral': 256000,
};
```

## Token Budgeting

### Budget Allocation Strategy

```typescript
interface TokenBudget {
  systemPrompt: number;
  conversationHistory: number;
  retrievedContext: number;
  userInput: number;
  outputReserve: number;
}

function allocateBudget(
  modelWindow: number,
  inputTokens: number
): TokenBudget {
  const outputReserve = Math.min(4096, Math.floor(modelWindow * 0.2));
  const available = modelWindow - outputReserve;

  return {
    systemPrompt: Math.floor(available * 0.15),
    conversationHistory: Math.floor(available * 0.25),
    retrievedContext: Math.floor(available * 0.35),
    userInput: Math.floor(available * 0.15),
    outputReserve,
  };
}
```

### Dynamic Budget Adjustment

```typescript
class TokenBudgetManager {
  private budget: TokenBudget;
  private usage: TokenBudget = {
    systemPrompt: 0,
    conversationHistory: 0,
    retrievedContext: 0,
    userInput: 0,
    outputReserve: 4096,
  };

  constructor(modelWindow: number) {
    this.budget = allocateBudget(modelWindow, 0);
  }

  consume(section: keyof TokenBudget, tokens: number): boolean {
    if (this.usage[section] + tokens > this.budget[section]) {
      return false;
    }
    this.usage[section] += tokens;
    return true;
  }

  borrow(from: keyof TokenBudget, to: keyof TokenBudget, amount: number): boolean {
    if (this.usage[from] + amount > this.budget[from]) {
      return false;
    }
    this.usage[from] += amount;
    this.budget[to] += amount;
    return true;
  }

  remaining(section: keyof TokenBudget): number {
    return this.budget[section] - this.usage[section];
  }
}
```

## Truncation Strategies

### Priority-Based Truncation

```typescript
interface ContextItem {
  id: string;
  content: string;
  tokens: number;
  priority: number; // higher = more important
  expiresAt: number; // timestamp
  type: 'code' | 'conversation' | 'reference' | 'system';
}

class PriorityTruncator {
  private items: ContextItem[] = [];

  add(item: ContextItem): void {
    this.items.push(item);
    this.items.sort((a, b) => b.priority - a.priority);
  }

  truncateToBudget(budget: number): string[] {
    let used = 0;
    const selected: string[] = [];

    for (const item of this.items) {
      if (item.expiresAt < Date.now()) continue;
      if (used + item.tokens > budget) continue;
      selected.push(item.content);
      used += item.tokens;
    }

    return selected;
  }
}
```

### Sliding Window

```typescript
class SlidingWindowManager {
  private windowSize: number;
  private overlapSize: number;
  private segments: string[] = [];

  constructor(windowSize: number, overlapSize: number) {
    this.windowSize = windowSize;
    this.overlapSize = overlapSize;
  }

  segmentContent(content: string): string[] {
    const words = content.split(' ');
    const segments: string[] = [];
    const stride = this.windowSize - this.overlapSize;

    for (let i = 0; i < words.length; i += stride) {
      const segment = words.slice(i, i + this.windowSize);
      segments.push(segment.join(' '));
    }

    this.segments = segments;
    return segments;
  }

  getRelevant(query: string, topK: number = 3): string[] {
    const scored = this.segments.map((seg, idx) => ({
      segment: seg,
      index: idx,
      score: computeRelevance(query, seg),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK).map(s => s.segment);
  }
}

function computeRelevance(query: string, text: string): number {
  const queryTerms = query.toLowerCase().split(' ');
  const textLower = text.toLowerCase();
  return queryTerms.filter(t => textLower.includes(t)).length / queryTerms.length;
}
```

## Compression Techniques

### Semantic Compression

```typescript
interface CompressedChunk {
  summary: string;
  keyPoints: string[];
  tokenCount: number;
  originalLength: number;
  compressionRatio: number;
}

class SemanticCompressor {
  async compress(
    text: string,
    targetTokens: number
  ): Promise<CompressedChunk> {
    const originalTokens = estimateTokens(text);
    const ratio = originalTokens / targetTokens;

    let compressed: string;
    if (ratio > 10) {
      // Multi-level summarization for very long texts
      const chunks = splitIntoChunks(text, 2000);
      const summaries = await Promise.all(
        chunks.map(c => this.summarizeChunk(c))
      );
      compressed = await this.summarizeChunk(summaries.join('\n'));
    } else if (ratio > 3) {
      compressed = await this.extractiveSummary(text, targetTokens);
    } else {
      compressed = await this.abstractiveSummary(text, targetTokens);
    }

    return {
      summary: compressed,
      keyPoints: this.extractKeyPoints(compressed),
      tokenCount: estimateTokens(compressed),
      originalLength: originalTokens,
      compressionRatio: ratio,
    };
  }
}
```

## Monitoring and Metrics

### Window Usage Tracking

```typescript
interface WindowMetrics {
  model: string;
  windowSize: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  utilizationPercent: number;
  truncatedItems: number;
  compressionRatio: number;
}

class MetricsCollector {
  private metrics: WindowMetrics[] = [];

  record(metric: WindowMetrics): void {
    this.metrics.push(metric);
  }

  getAverageUtilization(model?: string): number {
    const filtered = model
      ? this.metrics.filter(m => m.model === model)
      : this.metrics;

    if (filtered.length === 0) return 0;
    return filtered.reduce((sum, m) => sum + m.utilizationPercent, 0) / filtered.length;
  }

  getAlertThresholds(): { warning: number; critical: number } {
    return { warning: 85, critical: 95 };
  }

  shouldAlert(utilization: number): 'warning' | 'critical' | null {
    const thresholds = this.getAlertThresholds();
    if (utilization >= thresholds.critical) return 'critical';
    if (utilization >= thresholds.warning) return 'warning';
    return null;
  }
}
```

## Key Points

- Allocate token budgets per section (system, history, context, output)
- Use priority-based truncation to drop least important content first
- Sliding windows with overlap maintain coherence across segments
- Apply multi-level compression for very long documents
- Monitor window utilization and set alert thresholds
- Borrow from unused budget sections when critical content needs space
- Pre-compute and cache compressed versions of static content
- Estimate tokens accurately (1 token ≈ 3/4 word in English)
