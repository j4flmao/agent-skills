# Refactoring Advanced

## Overview
Advanced refactoring covers cross-cutting concerns (logging, caching, auth), architecture-level refactoring (monolith to microservices), dependency injection refactoring, large-scale mechanical changes, and managing risk during refactoring.

## Advanced Concepts

### Concept 1: Cross-Cutting Concern Extraction
Systemic refactoring: extract logging from business logic (AOP/interceptors), extract caching (decorator pattern), extract authorization (policy pattern), extract validation (pipeline behavior), and extract telemetry (decorator). Use ASP.NET Core middleware, Java filters, or Python decorators.

### Concept 2: Monolith to Microservices
Strangler Fig pattern: identify bounded contexts, extract service per context, create anti-corruption layer, migrate traffic gradually, remove old code. Use feature flags to toggle between old monolith and new service. Database-per-service requires careful migration.

### Concept 3: Dependency Injection Refactoring
Adopt DI in legacy code: introduce interface, register in container, replace new with injection. Break static dependencies (static factory → injected factory). Constructor injection over property injection (explicit dependencies). Compose root as the only `new` location.

### Concept 4: Large-Scale Mechanical Refactoring
Codemods (jscodeshift for JS/TS, Roslyn for C#, lib2to3 for Python): script that transforms codebase. Rename across files, change signatures, move classes between modules. CI validates output compiles and tests pass. Codemods run in parallel on clean branches.

### Concept 5: Risk Management During Refactoring
Refactoring risk: introduce change markers (temporary breakpoints), feature flags for big changes, parallel implementations (old + new), dark launch (new code without user-facing effect), and rollback plan tested before deployment.

## Advanced Techniques

### Decorator Extraction (Caching)
```csharp
public class CachedUserService : IUserService {
    private readonly IUserService _inner;
    private readonly IDistributedCache _cache;
    public async Task<User> GetUser(int id) {
        var key = $"user:{id}";
        return await _cache.GetOrCreateAsync(key, () => _inner.GetUser(id));
    }
}
```

### Codemod (jscodeshift)
```javascript
module.exports = function(file, api) {
  const j = api.jscodeshift;
  return j(file.source)
    .find(j.CallExpression, { callee: { name: 'oldName' } })
    .replaceWith(path => j.callExpression(j.identifier('newName'), path.node.arguments))
    .toSource();
};
```

## Anti-Patterns

- Big Bang refactoring: weeks of work, nobody can merge
- No strangler fig pattern: trying to extract everything at once
- DI without composition root: `new` scattered everywhere
- Manual large-scale rename: miss references, broken build
- No rollback plan: stuck with partial refactoring
- Refactoring without feature flag for risky changes
- Tests not covering edges: regression on refactor
- Codemod without dry-run: break CI on first commit
