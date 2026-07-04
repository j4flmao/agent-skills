---
name: "Unreal Engine 5 C++ Best Practices"
description: >
  Comprehensive guide and skill documentation for developing
  high-performance, scalable game architectures in Unreal Engine 5 C++.
  Includes deep dives into UObject, Actor lifecycles, and Garbage Collection.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
type: "skill"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags:
  - unreal-engine-5
  - cpp
  - game-development
  - architecture
---

# Unreal Engine 5 C++ Best Practices

## Purpose
This skill encapsulates advanced methodologies, architectural patterns, and performance optimizations required for production-ready Unreal Engine 5 C++ development. It focuses on the proper use of the UObject framework, Actor lifecycles, Garbage Collection, Macros/Reflection, and memory management.

## Core Principles
1. **Embrace the UObject Ecosystem**: Leverage standard UE macros (`UCLASS`, `UPROPERTY`, `UFUNCTION`) for reflection, serialization, and GC.
2. **Strict Memory Management**: Never use raw pointers for UObjects; always use `TObjectPtr`, `TWeakObjectPtr`, or `TSharedPtr`.
3. **Data-Driven Design**: Keep configurations external via DataAssets and JSON to reduce hardcoded values and recompilation times.
4. **Performance First**: Minimize Tick functions. Use events, delegates, and TimerManager for periodic checks instead of per-frame operations.
5. **Component-Based Architecture**: Keep monolithic Actor classes small by distributing functionality across reusable `UActorComponent` instances.

## Agent Protocol
**Triggers**: "Optimize UE5 code", "Refactor Actor class", "Implement UObject GC safe pointers"
**Input Context Required**: Snippets of C++ code, headers, or architectural descriptions.
**Output Artifact**: Refactored C++ headers and implementation files, adhering to UE5 coding standards.
**Response Formats**:
```json
{
  "refactored_classes": ["UMyActorComponent", "AMyGameMode"],
  "optimizations_applied": ["Replaced Tick with FTimerManager", "Swapped raw pointers to TObjectPtr"]
}
```

## Decision Matrix
```text
Is the object a game entity placed in the world?
├── YES -> Use AActor
└── NO
    ├── Does it need to be serialized/replicated?
    │   ├── YES -> Use UObject
    │   └── NO -> Use standard C++ class or FStruct
```

## Detailed Architectural Overview
```text
+-------------------+
|     UWorld        |
+--------+----------+
         |
         v
+--------+----------+      +-------------------+
|  AGameModeBase    | ---> | UGameInstance     |
+--------+----------+      +-------------------+
         |
         v
+--------+----------+
|  APlayerController|
+--------+----------+
         | (Possesses)
         v
+--------+----------+
|      APawn        |
+-------------------+
```

## Workflow Steps
1. **Analysis Phase**
   1. Review existing header files for proper macro usage.
   2. Identify UObject-derived classes.
   3. Check pointer safety.
2. **Refactoring Phase**
   1. Upgrade pointers to UE5 standards (`TObjectPtr`).
   2. Move Tick logic to event-based architecture.
   3. Encapsulate logic in UActorComponents.
3. **Data Externalization Phase**
   1. Create `UDataAsset` classes.
   2. Expose properties to Blueprint.
   3. Remove hardcoded strings and magic numbers.
4. **Optimization Phase**
   1. Audit `#include` statements (CoreMinimal vs Engine.h).
   2. Inline small functions.
   3. Review RPC and replication costs.
5. **Testing Phase**
   1. Run Automation framework tests.
   2. Profile using Unreal Insights.
   3. Verify memory leaks using `stat memory`.
6. **Deployment Phase**
   1. Package with appropriate Build.cs settings.
   2. Integrate with CI/CD.
   3. Verify binary sizes.

## Extended Troubleshooting Guide
| Symptom | Primary Cause | Mitigation Action |
|---------|---------------|-------------------|
| Game Crash on GC | Raw pointers to UObject | Replace with `TObjectPtr` and ensure `UPROPERTY()` is used. |
| Blueprint compilation failure | Mismatched macros | Check `BlueprintReadWrite` vs `BlueprintCallable`. |
| Memory Leak | Unreleased `TSharedPtr` | Break circular dependencies using `TWeakPtr`. |
| Stuttering | Expensive Tick logic | Use `FTimerManager` or offload to async threads. |
| Replication failures | Missing `GetLifetimeReplicatedProps` | Implement standard property replication macros. |
| Long compilation times | Monolithic `#include`s | Use Forward Declarations and specific module headers. |

## Complete Execution Scenario
```text
[Request] -> [Scan Headers] -> [Refactor Pointers] -> [Optimize Includes] -> [Generate Patch]
```

## Rules and Guidelines
1. Do not use `<iostream>`, use `UE_LOG`.
2. Do not use `std::string`, use `FString`, `FName`, or `FText`.
3. Do not use `std::vector`, use `TArray`.
4. Always forward declare classes in headers when possible.
5. Prefix classes correctly (`A` for Actor, `U` for UObject, `F` for Structs).

## Reference Guides
- [Architecture Patterns](references/architecture-patterns.md)
- [State Management](references/state-management.md)
- [Performance Optimization](references/performance-optimization.md)
- [Security Best Practices](references/security-best-practices.md)
- [Testing Strategies](references/testing-strategies.md)
- [Deployment Pipelines](references/deployment-pipelines.md)
- [Error Handling](references/error-handling.md)
- [Code Organization](references/code-organization.md)

## Handoff
Refer to general C++ coding standards if UE-specific guidelines are not sufficient.

<!-- COMPRESSION_FOOTER: ue5-cpp-skill-v2 -->
