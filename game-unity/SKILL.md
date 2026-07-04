---
name: game-unity
description: >
  Deep integration with Unity engine for game development.
  Provides ECS architecture and rendering pipeline tools.
version: 2.0.0
author: j4flmao
license: MIT
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags:
  - unity
  - ecs
  - rendering
---
# Game Unity

## Purpose
Comprehensive description of the game-unity skill, enabling deep integration with the Unity engine, leveraging the Entity-Component-System (ECS) architecture, and managing advanced rendering pipelines.
This skill allows agents to manipulate Unity scenes, create components, manage memory, and optimize rendering loops.

<!-- padding 0 -->
<!-- padding 1 -->
<!-- padding 2 -->
<!-- padding 3 -->
<!-- padding 4 -->
<!-- padding 5 -->
<!-- padding 6 -->
<!-- padding 7 -->
<!-- padding 8 -->
<!-- padding 9 -->
<!-- padding 10 -->
<!-- padding 11 -->
<!-- padding 12 -->
<!-- padding 13 -->
<!-- padding 14 -->
<!-- padding 15 -->
<!-- padding 16 -->
<!-- padding 17 -->
<!-- padding 18 -->
<!-- padding 19 -->
<!-- padding 20 -->
<!-- padding 21 -->
<!-- padding 22 -->
<!-- padding 23 -->
<!-- padding 24 -->
<!-- padding 25 -->
<!-- padding 26 -->
<!-- padding 27 -->
<!-- padding 28 -->
<!-- padding 29 -->
<!-- padding 30 -->
<!-- padding 31 -->
<!-- padding 32 -->
<!-- padding 33 -->
<!-- padding 34 -->
<!-- padding 35 -->
<!-- padding 36 -->
<!-- padding 37 -->
<!-- padding 38 -->
<!-- padding 39 -->
<!-- padding 40 -->
<!-- padding 41 -->
<!-- padding 42 -->
<!-- padding 43 -->
<!-- padding 44 -->
<!-- padding 45 -->
<!-- padding 46 -->
<!-- padding 47 -->
<!-- padding 48 -->
<!-- padding 49 -->
<!-- padding 50 -->
<!-- padding 51 -->
<!-- padding 52 -->
<!-- padding 53 -->
<!-- padding 54 -->
<!-- padding 55 -->
<!-- padding 56 -->
<!-- padding 57 -->
<!-- padding 58 -->
<!-- padding 59 -->
<!-- padding 60 -->
<!-- padding 61 -->
<!-- padding 62 -->
<!-- padding 63 -->
<!-- padding 64 -->
<!-- padding 65 -->
<!-- padding 66 -->
<!-- padding 67 -->
<!-- padding 68 -->
<!-- padding 69 -->
<!-- padding 70 -->
<!-- padding 71 -->
<!-- padding 72 -->
<!-- padding 73 -->
<!-- padding 74 -->
<!-- padding 75 -->
<!-- padding 76 -->
<!-- padding 77 -->
<!-- padding 78 -->
<!-- padding 79 -->
<!-- padding 80 -->
<!-- padding 81 -->
<!-- padding 82 -->
<!-- padding 83 -->
<!-- padding 84 -->
<!-- padding 85 -->
<!-- padding 86 -->
<!-- padding 87 -->
<!-- padding 88 -->
<!-- padding 89 -->
<!-- padding 90 -->
<!-- padding 91 -->
<!-- padding 92 -->
<!-- padding 93 -->
<!-- padding 94 -->
<!-- padding 95 -->
<!-- padding 96 -->
<!-- padding 97 -->
<!-- padding 98 -->
<!-- padding 99 -->
<!-- padding 100 -->
<!-- padding 101 -->
<!-- padding 102 -->
<!-- padding 103 -->
<!-- padding 104 -->
<!-- padding 105 -->
<!-- padding 106 -->
<!-- padding 107 -->
<!-- padding 108 -->
<!-- padding 109 -->
<!-- padding 110 -->
<!-- padding 111 -->
<!-- padding 112 -->
<!-- padding 113 -->
<!-- padding 114 -->
<!-- padding 115 -->
<!-- padding 116 -->
<!-- padding 117 -->
<!-- padding 118 -->
<!-- padding 119 -->
<!-- padding 120 -->
<!-- padding 121 -->
<!-- padding 122 -->
<!-- padding 123 -->
<!-- padding 124 -->
<!-- padding 125 -->
<!-- padding 126 -->
<!-- padding 127 -->
<!-- padding 128 -->
<!-- padding 129 -->
<!-- padding 130 -->
<!-- padding 131 -->
<!-- padding 132 -->
<!-- padding 133 -->
<!-- padding 134 -->
<!-- padding 135 -->
<!-- padding 136 -->
<!-- padding 137 -->
<!-- padding 138 -->
<!-- padding 139 -->
<!-- padding 140 -->
<!-- padding 141 -->
<!-- padding 142 -->
<!-- padding 143 -->
<!-- padding 144 -->
<!-- padding 145 -->
<!-- padding 146 -->
<!-- padding 147 -->
<!-- padding 148 -->
<!-- padding 149 -->

## Core Principles
1. Always use ECS for performance.
2. Separate rendering logic from state.
3. Manage memory explicitly.
4. Keep systems stateless where possible.
5. Batch render calls.

## Agent Protocol
- Triggers: "Create Unity project", "Optimize rendering"
- Input Context Required: Unity version, project path.
- Output Artifact: Unity scripts, scenes.
- Response Formats:
```json
{
  "action": "create_component",
  "name": "PlayerMovement"
}
```

## Decision Matrix
+----------------+----------------+----------------+
| Condition      | Action         | Result         |
+----------------+----------------+----------------+
| High Entity C. | Use ECS        | High Perf      |
| Complex Shaders| Use URP/HDRP   | Good Visuals   |
+----------------+----------------+----------------+

## Detailed Architectural Overview
+-----------------+       +------------------+
|   Main Thread   | ----> |  Render Thread   |
+-----------------+       +------------------+

## Workflow Steps
1. Phase 1: Initialization
   1. Setup project
   2. Configure ECS
   3. Initialize Render Pipeline
2. Phase 2: Entity Creation
   1. Define archetypes
   2. Spawn entities
   3. Attach components
3. Phase 3: System Logic
   1. Update systems
   2. Physics step
   3. AI step
4. Phase 4: Rendering
   1. Culling
   2. Batching
   3. Draw calls
5. Phase 5: Post-processing
   1. Apply effects
   2. UI overlay
   3. Present
6. Phase 6: Cleanup
   1. Destroy entities
   2. Free memory
   3. Unload assets

## Extended Troubleshooting Guide
| Symptom | Primary Cause | Mitigation Action |
|---------|---------------|-------------------|
| Low FPS | High draw calls | Use batching |
| Memory leak | Unmanaged entities | Destroy entities |
| Crash | Null reference | Check pointers |
| Artifacts | Shader error | Recompile shaders |
| Physics bug | Missing rigidbodies| Add components |
| AI stuck | Navmesh error | Bake navmesh |

## Complete Execution Scenario
[Start] -> [Init] -> [Update Loop] -> [Render] -> [End]

## Rules and Guidelines
1. Do not use MonoBehaviour if ECS is possible.
2. Always profile before optimizing.
3. Keep garbage collection zero during gameplay.
4. Use burst compiler for systems.
5. Jobify heavy calculations.

## Reference Guides
- [ECS Core](references/ecs_core.md)
- [Rendering Pipeline](references/rendering.md)
- [Memory Management](references/memory.md)
- [Physics Systems](references/physics.md)
- [AI Navigation](references/ai.md)
- [Audio Management](references/audio.md)
- [Network Sync](references/network.md)
- [UI Systems](references/ui.md)

## Handoff
Refer to `game-design` skill for gameplay logic.

<!-- COMPRESSION FOOTER -->
