# GraphQL Monitoring

## Overview
Monitor GraphQL APIs: resolver performance, query complexity tracking, error rate monitoring, tracing, alerting, and dashboarding.

## Resolver Performance Monitoring

```typescript
import { PluginDefinition } from '@apollo/server';

class ResolverPerformancePlugin {
  requestDidStart(): PluginDefinition {
    const startTime = Date.now();
    const resolverTimings: Map<string, number[]> = new Map();

    return {
      async executionDidStart() {
        return {
          willResolveField({ info }) {
            const fieldPath = `${info.parentType.name}.${info.fieldName}`;
            const fieldStart = Date.now();

            return () => {
              const duration = Date.now() - fieldStart;
              if (!resolverTimings.has(fieldPath)) {
                resolverTimings.set(fieldPath, []);
              }
              resolverTimings.get(fieldPath)!.push(duration);

              // Record metric
              metrics.timing('graphql.resolver.duration', duration, {
                field: fieldPath,
                operation: info.operation.operation,
              });
            };
          },
        };
      },
      async willSendResponse() {
        const totalDuration = Date.now() - startTime;
        metrics.timing('graphql.request.duration', totalDuration);

        // Detect slow resolvers
        for (const [field, timings] of resolverTimings) {
          const p99 = percentile(timings, 99);
          if (p99 > 100) { // > 100ms
            metrics.increment('graphql.slow_resolver', 1, { field });
          }
        }
      },
    };
  }
}
```

## Query Complexity Tracking

```typescript
class QueryComplexityMonitor {
  private readonly COMPLEXITY_LIMIT = 1000;
  private readonly WARN_THRESHOLD = 500;

  async trackQueryComplexity(query: string, variables: Record<string, unknown>): Promise<ComplexityReport> {
    const complexity = await this.calculateComplexity(query, variables);

    metrics.gauge('graphql.query.complexity', complexity, {
      operation: this.getOperationName(query),
    });

    if (complexity > this.WARN_THRESHOLD) {
      metrics.increment('graphql.high_complexity_query', 1, {
        operation: this.getOperationName(query),
        complexity: String(complexity),
      });
    }

    if (complexity > this.COMPLEXITY_LIMIT) {
      await AlertService.alert({
        severity: 'WARNING',
        title: 'Query complexity exceeded limit',
        message: `Query complexity ${complexity} > limit ${this.COMPLEXITY_LIMIT}`,
        metadata: { query, complexity },
      });
    }

    return { complexity, limit: this.COMPLEXITY_LIMIT, exceeded: complexity > this.COMPLEXITY_LIMIT };
  }
}
```

## Error Rate Monitoring

```typescript
interface GraphQLErrorMetrics {
  errorCode: string;
  path: string;
  operationName: string;
  userAgent?: string;
}

class GraphQLErrorMonitor {
  async recordError(error: GraphQLError, context: Record<string, unknown>): Promise<void> {
    const metrics: GraphQLErrorMetrics = {
      errorCode: error.extensions?.code as string || 'UNKNOWN',
      path: (error.path || []).join('.'),
      operationName: context.operationName as string || 'anonymous',
    };

    metrics.increment('graphql.error.count', 1, metrics);

    // Track error rate per minute
    const errorRate = await this.getErrorRate(5 * 60 * 1000); // 5 min window
    if (errorRate > 0.05) { // > 5% error rate
      await AlertService.alert({
        severity: 'CRITICAL',
        title: 'High GraphQL error rate',
        message: `Error rate: ${(errorRate * 100).toFixed(1)}%`,
        metadata: metrics,
      });
    }
  }

  async getTopErrors(days = 7): Promise<ErrorSummary[]> {
    return ErrorLog.aggregate([
      { $match: { timestamp: { $gte: new Date(Date.now() - days * 86400000) } } },
      { $group: { _id: '$errorCode', count: { $sum: 1 }, paths: { $addToSet: '$path' } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);
  }
}
```

## Apollo Tracing

```typescript
import { ApolloServerPluginInlineTrace } from '@apollo/server/plugin/inlineTrace';
import { ApolloServerPluginUsageReporting } from '@apollo/server/plugin/usageReporting';

const server = new ApolloServer({
  plugins: [
    ApolloServerPluginInlineTrace({
      includeErrors: {
        unmodified: true,
      },
    }),
    ApolloServerPluginUsageReporting({
      sendReportsImmediately: true,
      generateClientInfo({ request }) {
        const headers = request.http?.headers;
        return {
          clientName: headers?.get('apollo-client-name') || 'unknown',
          clientVersion: headers?.get('apollo-client-version') || 'unknown',
        };
      },
    }),
  ],
});
```

## OpenTelemetry Integration

```typescript
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { GraphQLRequestContext } from '@apollo/server';

class GraphQLTracingPlugin {
  requestDidStart(requestContext: GraphQLRequestContext) {
    const tracer = trace.getTracer('graphql');
    const span = tracer.startSpan('graphql.request', {
      attributes: {
        'graphql.operation': requestContext.operationName || 'anonymous',
        'graphql.document': requestContext.query?.substring(0, 200),
      },
    });

    return {
      async willSendResponse() {
        if (requestContext.errors?.length) {
          span.setStatus({ code: SpanStatusCode.ERROR });
          for (const error of requestContext.errors) {
            span.recordException(error);
          }
        }
        span.end();
      },
    };
  }
}
```

## Dashboard Metrics

```typescript
const GRAPHQL_DASHBOARD = {
  panels: [
    {
      title: 'Requests per Minute',
      metric: 'graphql.request.count',
      aggregation: 'rate',
      groupBy: ['operation'],
    },
    {
      title: 'Request Duration (p50/p95/p99)',
      metric: 'graphql.request.duration',
      aggregation: 'percentile',
      groupBy: ['operation'],
    },
    {
      title: 'Resolver Duration (p99)',
      metric: 'graphql.resolver.duration',
      aggregation: 'p99',
      groupBy: ['field'],
    },
    {
      title: 'Error Rate by Code',
      metric: 'graphql.error.count',
      aggregation: 'rate',
      groupBy: ['errorCode'],
    },
    {
      title: 'Query Complexity Distribution',
      metric: 'graphql.query.complexity',
      aggregation: 'histogram',
    },
    {
      title: 'Slowest Resolvers',
      metric: 'graphql.slow_resolver',
      aggregation: 'count',
      groupBy: ['field'],
    },
    {
      title: 'Client Usage by Version',
      metric: 'graphql.client.usage',
      aggregation: 'count',
      groupBy: ['clientVersion'],
    },
  ],
  alerts: [
    { name: 'High error rate', condition: 'error_rate > 0.05', duration: '5m' },
    { name: 'Slow resolvers', condition: 'resolver_p99 > 500ms', duration: '5m' },
    { name: 'Complexity limit hit', condition: 'complexity_exceeded > 0', duration: '1m' },
  ],
};
```

## Key Points
- Track resolver-level performance with Apollo plugins or OpenTelemetry
- Monitor query complexity: warn at 500, reject at 1000
- Alert on error rate > 5% over 5-minute window
- Use Apollo Usage Reporting to track client versions
- Trace GraphQL requests end-to-end with OpenTelemetry spans
- Build dashboards for: request rate, duration, error rate, complexity
- Identify slow resolvers (p99 > 100ms) for optimization targets
- Track top error codes weekly for trend analysis
