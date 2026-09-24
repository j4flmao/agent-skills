# Skills Master Summary

Generated: 2026-09-19

## Totals

| Metric | Count |
|--------|-------|
| Skills (SKILL.md) | 641 |
| SKILL.md lines | 249,901 |
| Reference files | 3,942 |
| Reference lines | 1,678,927 |
| Grand total lines | 1,928,828 |

## Skills by Category

| Category | Skills |
|----------|--------|
| ai | 12 |
| architecture | 7 |
| aspirational | 1 |
| backend | 91 |
| blockchain | 19 |
| cloud-native | 18 |
| core | 4 |
| cybersecurity | 7 |
| data | 39 |
| data-science | 4 |
| design | 7 |
| desktop | 10 |
| dev-loop | 12 |
| devops | 69 |
| ecommerce | 5 |
| embedded-systems | 6 |
| enterprise | 18 |
| frontend | 60 |
| fundamental-truths | 4 |
| game | 29 |
| devops | 70 |
| hardware-acceleration | 11 |
| harness-engineering | 2 |
| languages | 14 |
| low-level | 5 |
| management | 18 |
| ml | 17 |
| mobile | 28 |
| niche | 8 |
| personas | 17 |
| planning | 13 |
| playbooks | 3 |
| product | 9 |
| prompt-engineering | 4 |
| quality | 11 |
| quality-assurance | 2 |
| quantum-computing | 8 |
| rnd | 6 |
| security | 23 |
| seo | 4 |
| site-reliability-engineering | 4 |
| system-design | 4 |
| tools | 3 |
| web | 4 |

## Deep Game Pillars (2026-09-19)

The `game/` tree was expanded from 14 to 29 skills across three pillars — game kernel (engine core), game server, and client engine. Each new skill ships a SKILL.md plus exactly 6 deep reference files.

### Pillar 1 — Game Engine Core (game/game-engine/)

| Skill | SKILL lines | Ref lines |
|-------|-------------|-----------|
| memory-management | 300 | 962 |
| job-system | 222 | 713 |
| platform-abstraction | 201 | 644 |
| asset-pipeline | 164 | 662 |
| math-foundation | 197 | 669 |
| render-graph | 136 | 622 |

### Pillar 2 — Game Server (game/game-server/)

| Skill | SKILL lines | Ref lines |
|-------|-------------|-----------|
| authoritative-server | 179 | 626 |
| interest-management | 118 | 560 |
| matchmaking-lobby | 122 | 574 |
| anti-cheat-server | 130 | 555 |
| scaling-architecture | 131 | 561 |

### Pillar 3 — Client Engine (game/client-engine/)

| Skill | SKILL lines | Ref lines |
|-------|-------------|-----------|
| animation-systems | 122 | 532 |
| input-systems | 117 | 504 |
| level-streaming | 107 | 501 |
| audio-engine | 112 | 509 |

### Game reference files

- `game-development/vulkan/references/` — initialization, swapchain, render passes/pipelines, sync, memory, compute/RT (1,029 lines)
- `game-engine/ecs-pattern/references/` — archetype storage, scheduling, Unity DOTS, Bevy, EnTT/Flecs, netcode (1,310 lines)
- `game-engine/patterns/references/` — game loop, components, memory/pools, spatial, behavior, rendering (1,082 lines)
- Each pillar skill above carries 6 references (see per-skill Ref lines column)

### Supporting deliverables

- `.claude/rules/game-engine-guidelines.md` — agent rules for game engine code
- `personas/lead-tech-game-engine/SKILL.md` — Lead Tech Game Engine persona
- All 6 agent routing rule files (`.claude` / `.codex` / `.gemini` / `.github` / `.opencode` / `.cursor`) updated to route the 15 new pillar skills