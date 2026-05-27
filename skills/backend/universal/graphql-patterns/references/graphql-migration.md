# GraphQL Migration

## Overview
Migrate from REST to GraphQL or evolve existing GraphQL schemas: incremental adoption, schema stitching, federation migration, versioning, and rollback strategies.

## Incremental REST to GraphQL Migration

```typescript
class MigrationStrategy {
  // Phase 1: Coexistence — run REST and GraphQL side by side
  async phase1Coexistence(): Promise<void> {
    // Same underlying services, both REST and GraphQL endpoints active
    // GraphQL resolvers call the same service layer as REST controllers
    // Monitor both, compare performance
  }

  // Phase 2: GraphQL gateway in front of REST APIs
  async phase2GraphQLGateway(): Promise<void> {
    // GraphQL resolvers call existing REST endpoints
    // No changes to REST services needed
  }
}

// REST-to-GraphQL wrapper resolvers
const resolvers = {
  Query: {
    user: async (_, { id }, { auth }) => {
      // Call existing REST endpoint through GraphQL
      const response = await fetch(`https://api.example.com/users/${id}`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      if (!response.ok) throw new Error('User not found');
      return response.json();
    },
    users: async (_, { first, after }) => {
      const url = new URL('https://api.example.com/users');
      url.searchParams.set('limit', String(first));
      if (after) url.searchParams.set('cursor', after);

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      return transformToConnection(await response.json());
    },
  },
};
```

## Schema Evolution

```typescript
class SchemaVersionManager {
  private readonly schemaVersions: Map<string, string> = new Map();

  // Version 1: Initial schema
  private readonly v1Schema = `
    type Query {
      user(id: ID!): User
      users(first: Int, after: String): UserConnection
    }

    type User {
      id: ID!
      name: String!
      email: String!
    }
  `;

  // Version 2: Add phone field
  private readonly v2Schema = `
    type Query {
      user(id: ID!): User
      users(first: Int, after: String): UserConnection
    }

    type User {
      id: ID!
      name: String!
      email: String!
      phone: String  # New optional field
    }
  `;

  // Deprecation strategy
  private readonly v3Schema = `
    type User {
      id: ID!
      name: String!
      email: String! @deprecated(reason: "Use emailAddress instead")
      emailAddress: String!
      phone: String
    }
  `;
}
```

## Federation Migration

```typescript
// Migration from monolithic GraphQL to federated supergraph
// Step 1: Identify bounded contexts
const BOUNDED_CONTEXTS = {
  users: { service: 'user-service', port: 4001 },
  orders: { service: 'order-service', port: 4002 },
  payments: { service: 'payment-service', port: 4003 },
  inventory: { service: 'inventory-service', port: 4004 },
};

// Step 2: Extract subgraphs one at a time
class SubgraphExtractor {
  async extractSubgraph(
    subgraphName: string,
    types: string[],
    monolithicSchema: string
  ): Promise<string> {
    const subgraphSchema = `
      extend schema
        @link(url: "https://specs.apollo.dev/federation/v2.0",
              import: ["@key", "@shareable"])

      type ${types[0]} @key(fields: "id") {
        id: ID!
        # Only the types/fields owned by this subgraph
      }
    `;
    return subgraphSchema;
  }

  async validateExtraction(subgraphName: string): Promise<boolean> {
    // Run supergraph composition
    // Verify no breaking changes
    // Run integration tests
    return true;
  }
}
```

## Backward Compatibility

```typescript
class SchemaCompatibilityChecker {
  async checkBreakingChanges(oldSchema: string, newSchema: string): Promise<BreakingChange[]> {
    const breaking: BreakingChange[] = [];

    // Check for removed fields
    // Check for changed types
    // Check for removed enum values
    // Check for arguments that became required
    // Check for non-null to nullable changes

    return breaking;
  }

  async validateClientQueries(
    oldSchema: string,
    newSchema: string,
    persistedQueries: string[]
  ): Promise<ValidationResult> {
    const failed: string[] = [];

    for (const query of persistedQueries) {
      try {
        await validateQuery(newSchema, query);
      } catch {
        failed.push(query);
      }
    }

    return {
      valid: failed.length === 0,
      failedQueries: failed,
      totalQueries: persistedQueries.length,
    };
  }
}
```

## Rollback Strategy

```typescript
class SchemaRollback {
  private deployHistory: Array<{
    schema: string;
    timestamp: Date;
    version: string;
  }> = [];

  async deploySchema(schema: string, version: string): Promise<void> {
    // Canary deploy to 10% of traffic
    await this.canaryDeploy(schema, 0.1);

    // Monitor for 15 minutes
    const errors = await this.monitorErrors(15 * 60 * 1000);
    if (errors > this.threshold) {
      await this.rollbackToPrevious();
      return;
    }

    // Gradual rollout
    await this.canaryDeploy(schema, 0.5);
    await this.monitorErrors(15 * 60 * 1000);

    // Full rollout
    await this.canaryDeploy(schema, 1.0);
    this.deployHistory.push({ schema, timestamp: new Date(), version });
  }

  async rollbackToPrevious(): Promise<void> {
    const previous = this.deployHistory[this.deployHistory.length - 2];
    if (!previous) throw new Error('No previous schema to rollback to');

    // Deploy previous schema
    await this.deploySchema(previous.schema, `${previous.version}-rollback`);
    this.deployHistory.pop();

    await AlertService.send({
      severity: 'CRITICAL',
      title: 'GraphQL schema rollback',
      message: `Rolled back from ${this.deployHistory[this.deployHistory.length - 1].version} to ${previous.version}`,
    });
  }
}
```

## Key Points
- Run REST and GraphQL side by side during migration (no big bang)
- Use GraphQL gateway pattern to call existing REST endpoints
- Extract subgraphs one at a time when migrating to federation
- Never remove fields without deprecation notice (minimum 6 months)
- Validate all persisted queries against new schema before deployment
- Canary deploy schema changes: 10% → 50% → 100%
- Monitor error rates during rollouts, auto-rollback on threshold breach
- Keep deploy history for rollback capability
