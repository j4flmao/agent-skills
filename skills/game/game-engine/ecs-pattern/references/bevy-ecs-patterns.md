---
title: Bevy ECS Patterns
description: Rust-native ECS patterns in Bevy — queries, bundles, states, commands, events, scheduling, and idiomatic data-oriented Rust game architecture.
---

# Bevy ECS Patterns

## Core Concepts

Bevy's ECS is a Rust-native, auto-parallel scheduler with compile-time safety. No null pointers, no data races (enforced by Rust's borrow checker + ECS rules).

```rust
use bevy::prelude::*;

#[derive(Component)]
struct Velocity(Vec3);

#[derive(Component)]
struct Health(f32);

fn movement_system(
    time: Res<Time>,
    mut query: Query<(&mut Transform, &Velocity)>,
) {
    for (mut transform, velocity) in query.iter_mut() {
        transform.translation += velocity.0 * time.delta_seconds();
    }
}
```

## Queries

### Basic Queries

```rust
// Read-only access to Transform and Velocity
fn read_positions(query: Query<(&Transform, &Velocity)>) {
    for (transform, velocity) in query.iter() {
        // ...
    }
}

// Mutable access
fn update_positions(mut query: Query<&mut Transform>) {
    for mut transform in query.iter_mut() {
        transform.translation.x += 1.0;
    }
}
```

### Filters

```rust
// With/Without component filters
fn only_player(query: Query<&Transform, With<Player>>) {}
fn without_frozen(query: Query<&mut Transform, Without<Frozen>>) {}

// Changed<T> — only run when T changed
fn on_health_change(query: Query<&Health, Changed<Health>>) {
    for health in query.iter() {
        // runs only when Health was modified this frame
    }
}
```

### ParamSet (Aliased Mutability)

When two queries would borrow the same data mutably (forbidden by Rust):

```rust
fn safe_both(
    mut set: ParamSet<(
        Query<&mut Transform, With<Enemy>>,
        Query<&mut Transform, With<Player>>,
    )>,
) {
    let mut enemies = set.p0();  // borrow enemies mutably
    let mut players = set.p1();  // borrow players mutably
    // safe: disjoint filters ensure no aliasing
    for mut t in players.iter_mut() {
        t.translation.x += 1.0;
    }
}
```

## Components

### Standard Components

```rust
#[derive(Component)]
struct Position(Vec3);

#[derive(Component)]
struct Collider { radius: f32 }

// Zero-sized "tag" components
#[derive(Component)]
struct IsPlayer;

#[derive(Component)]
struct Dead;
```

### Bundles (Spawn Presets)

```rust
#[derive(Bundle)]
struct PlayerBundle {
    sprite: SpriteBundle,
    velocity: Velocity,
    health: Health,
    tag: IsPlayer,
}

commands.spawn(PlayerBundle {
    sprite: SpriteBundle { /* ... */ },
    velocity: Velocity(Vec3::ZERO),
    health: Health(100.0),
    tag: IsPlayer,
});
```

### Required Components (Bevy 0.12+)

```rust
#[derive(Component)]
#[require(Transform, SpriteBundle, Visibility)]
struct Player {
    health: f32,
}
// spawning Player automatically adds Transform + SpriteBundle + Visibility
```

## States (App-Level State Machines)

```rust
#[derive(States, Clone, Copy, PartialEq, Eq, Hash, Debug, Default)]
enum GamePhase {
    #[default]
    MainMenu,
    Playing,
    GameOver,
}

// Only run systems in Playing state
app.add_systems(Update, (
    input_system,
    movement_system.after(input_system),
    physics_system.after(movement_system),
).in_set(OnUpdate(GamePhase::Playing)));

// Transition
fn game_over_checker(
    query: Query<&Health>,
    mut next_state: ResMut<NextState<GamePhase>>,
) {
    for health in query.iter() {
        if health.0 <= 0.0 {
            next_state.set(GamePhase::GameOver);
            return;
        }
    }
}
```

## Events

```rust
#[derive(Event)]
struct DamageEvent {
    target: Entity,
    amount: f32,
}

fn spawn_damage_event(commands: Commands, mut ev_damage: EventWriter<DamageEvent>) {
    ev_damage.send(DamageEvent { target: Entity::PLACEHOLDER, amount: 10.0 });
}

fn apply_damage(
    mut query: Query<&mut Health>,
    mut ev_damage: EventReader<DamageEvent>,
) {
    for event in ev_damage.read() {
        if let Ok(mut health) = query.get_mut(event.target) {
            health.0 -= event.amount;
        }
    }
}
```

## Commands (Deferred Mutation)

```rust
fn spawn_entities(mut commands: Commands) {
    commands.spawn((
        SpriteBundle { /* ... */ },
        Velocity(Vec3::new(1.0, 0.0, 0.0)),
        Health(100.0),
    ));
}

fn destroy_dead(
    mut commands: Commands,
    query: Query<Entity, With<Dead>>,
) {
    for entity in query.iter() {
        commands.entity(entity).despawn();
    }
}
```

## Resources (Singletons)

```rust
#[derive(Resource)]
struct WaveConfig {
    spawn_interval: f32,
    max_enemies: u32,
}

impl Default for WaveConfig {
    fn default() -> Self {
        Self { spawn_interval: 2.0, max_enemies: 50 }
    }
}

fn setup(mut commands: Commands) {
    commands.insert_resource(WaveConfig { spawn_interval: 1.5, max_enemies: 100 });
}
```

## Observer Systems (Reactive ECS)

Bevy 0.14+ supports observers — reactions to specific component mutations:

```rust
fn on_health_zero(trigger: Trigger<OnRemove, Health>, mut commands: Commands) {
    commands.entity(trigger.entity()).insert(Dead);
}

app.add_observer(on_health_zero);
```

## Common Bevy ECS Patterns

### Spatial Hashing for Broad-Phase

```rust
#[derive(Resource)]
struct SpatialHash {
    cell_size: f32,
    cells: HashMap<(i32, i32), Vec<Entity>>,
}
```

### Entity Map (Lookup by Tag)

```rust
#[derive(Resource, Default)]
struct PlayerEntity(Option<Entity>);

fn setup_player(mut map: ResMut<PlayerEntity>, query: Query<Entity, With<IsPlayer>>) {
    map.0 = query.iter().next();
}
```

### Despawn Recursively

```rust
fn despawn_children(
    mut commands: Commands,
    parent_query: Query<Entity, With<DespawnRecursive>>,
) {
    for entity in parent_query.iter() {
        commands.entity(entity).despawn_recursive();
    }
}
```

## Performance Tips

1. **Use `Changed<T>`** to skip systems entirely when data hasn't changed.
2. **Use `Without<T>`** filters to avoid iterating irrelevant entities.
3. **Avoid `Option<&T>` in queries** — it forces the query to scan all archetypes.
4. **Prefer `Local<T>`** (per-system state) over `ResMut<T>` when possible.
5. **Batch operations**: use `for` over query, not per-entity `query.get(entity)`.

## References

- Bevy Book: https://docs.rs/bevy/latest/bevy/
- Bevy Cheatsheet: https://bevy-cheatbook.github.io/
- Bevy examples: https://github.com/bevyengine/bevy/tree/main/examples
- Bevy ECS design: https://github.com/bevyengine/bevy/blob/main/crates/bevy_ecs/README.md