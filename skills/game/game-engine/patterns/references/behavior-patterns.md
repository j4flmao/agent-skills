---
title: Behavior Patterns for Game AI & Logic
description: Finite state machines, hierarchical state machines, behavior trees, utility AI, GOAP, and event queues for game logic.
---

# Behavior Patterns — Deep Reference

## 1. Finite State Machine (FSM)

### The Simplest Correct FSM

```cpp
enum class State { Idle, Walk, Run, Attack, Dead };

class Character {
    State state = State::Idle;
public:
    void update(float dt) {
        switch (state) {
            case State::Idle:
                if (wantsToMove()) state = State::Walk;
                if (attacking())   state = State::Attack;
                break;
            case State::Walk:
                move(0.8f * dt);
                if (!padInput()) state = State::Idle;
                if (runningInput()) state = State::Run;
                break;
            case State::Run:
                move(1.4f * dt);
                if (!padInput()) state = State::Idle;
                break;
            case State::Attack:
                animPlay("attack");
                if (animFinished()) state = State::Idle;
                break;
            case State::Dead:
                break;
        }
    }
};
```

### FSM Pros/Cons

| Pros | Cons |
|------|------|
| Simple, predictable, easy to debug | Transitions explode combinatorially |
| Maps to animats | Hard to express parallel/mixed states |
| Serializes for AI (netcode) | No "doing two things at once" |

## 2. State Pattern (Objects instead of switch)

```cpp
class AIContext;  // the character/pawn

class AIState {
public:
    virtual ~AIState() = default;
    virtual void onEnter(AIContext&) {}
    virtual void update(AIContext&, float dt) = 0;
    virtual void onExit(AIContext&) {}
};

// Concrete states
class SeekState : public AIState { void update(AIContext& c, float dt) override; };
class FleeState  : public AIState { void update(AIContext& c, float dt) override; };
class IdleState  : public AIState { void update(AIContext& c, float dt) override; };

class AIContext {
    std::unique_ptr<AIState> state;
public:
    void setState(std::unique_ptr<AIState> next) {
        state->onExit(*this);
        state = std::move(next);
        state->onEnter(*this);
    }
    void update(float dt) { state->update(*this, dt); }
};
```

### Pushdown Automaton (FSM + stack)

For "move to alarm, then return to previous state" — transition stack:

```cpp
std::stack<AIState*> stateStack;
// push AlarmState, on done pop → ResumeState
```

## 3. Hierarchical State Machine (HSM)

Nested states inherit behavior from parents:

```
Combat (parent)
 ├── Melee
 ├── Ranged
 └── Support
```

If `Ranged` doesn't handle "low health", hand up to parent `Combat`. Implementation: `update` returns bool "handled"; if false, delegate to parent.

## 4. Behavior Trees

### Concepts

- **Nodes**: Control flow (Sequence, Selector, Parallel) and leaf actions.
- **Blackboard**: shared data area (`target`, `health`, `lastSeenPos`).
- **Tick**: each frame/step, tree evaluated from root.

### Structure

```
RootSelector
 ├── Sequence: CanSeeTarget → ChaseTarget
 │    ├── CheckSightRange
 │    ├── FaceTarget
 │    └── MoveToTarget
 ├── Sequence: Patrol (moveTo next waypoint)
 │    ├── HasPatrolPoint
 │    └── MovePatrol
 └── Wait
```

### Node Semantics

| Node | Behavior |
|------|----------|
| **Sequence** | Children run in order; fail if any child fails; succeed when all succeed |
| **Selector** | Children run in order; succeed on first success; fail if all fail |
| **Parallel** | Run all children (AND/OR success policy) |
| **Decorator** | Wrap one child: Invert, Repeat(N), TimeLimit, UntilSuccess |

### Implementation Sketch

```cpp
enum class Status { Success, Failure, Running };

class BTNode {
public:
    virtual ~BTNode() = default;
    virtual Status tick(Blackboard& bb) = 0;
};

class Sequence : public BTNode {
    std::vector<BTNode*> children;
public:
    Status tick(Blackboard& bb) final {
        for (auto* child : children) {
            Status s = child->tick(bb);
            if (s != Status::Success) return s;
        }
        return Status::Success;
    }
};
```

### Used by
- Unreal Behavior Trees (`UBehaviorTree`)
- Unity: Behavior Designer, PandaBT
- Dialogue systems (trees of dialogue nodes)

## 5. Utility AI (Scored behaviors)

Instead of explicit tree, compute score for each candidate behavior per tick and pick max:

```cpp
struct UtilityOption {
    const char* name;
    std::function<float(const AIContext&)> score;
};

// e.g., Heal score is high when hp low:
float healScore(const AIContext& c) { return (1.f - c.hp / c.maxHp); }
float attackScore(const AIContext& c) { return c.targetInRange() ? 1.f : 0.f; }

UtilityOption pickBest(const AIContext& c, std::vector<UtilityOption>& opts) {
    // pick max score
}
```

Good for flexible, believable adaptive behavior (The Sims, SimCity departments).

## 6. GOAP (Goal-Oriented Action Planning)

Plan actions to achieve goals given current state (A* over action graph):

```
Goal: KillPlayer
Actions: {Attack, MoveToPlayer, Reload, FindAmmo}
Preconditions → effects → plan via A*
```

Expensive; used in FEAR, Last of Us (partial) for surprising AI. Not for every unit.

## 7. Event Queues (Decouple AI from Instant Reactions)

AI often can't react instantly (no seeing through walls). Introduce reaction latency & ordering:

```cpp
struct AIEvent { uint32_t actor; AIEventType type; Vec3 pos; float time; };
std::queue<AIEvent> eventQueue;
void dispatch(const AIEvent& e) { eventQueue.push(e); }
```

- Prevents explosive instant reactions.
- Enables "investigate sound" behaviors.
- Controls when AI reacts to teammate death (by design).

## 8. Common Mistakes

1. Switch-corruption: states not mutually exclusive (one update path, two states).
2. Missing onEnter/onExit: animation/audio left in wrong state.
3. No "Running" return status in behavior trees → re-evaluating expensive path every tick.
4. FSM for parallel needs (walk AND shoot) → use parallel state sets.
5. Global event latency ignored → AI telepathy, trivialized stealth.

## 9. Rules for Behavior Code

1. Every behavior must serialize (save/load, network).
2. Expose tunables (sight range, cooldown) to inspectors, not code constants.
3. Always keep one source of truth for state transitions.
4. Test AI with synthetic inputs, not just play.
5. Decouple AI from anim/fx side effects using events.