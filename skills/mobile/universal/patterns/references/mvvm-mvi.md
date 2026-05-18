# MVVM vs MVI

## MVVM

```
User → View → ViewModel → Model
            ← observer ←
```

- View observes ViewModel state (observable, StateFlow, @Published)
- ViewModel exposes state + event handlers
- View binds — no imperative UI updates
- Best for: forms, lists, moderate complexity

## MVI

```
User → View → Intent → Model → View
                    ↓ reducer ↑
```

- Every state change is explicit via sealed class Intents
- Reducer takes (State, Intent) → new State
- Single source of truth. No side effects in reducer — handled in middleware
- Best for: complex screens with many interactive elements

## When to pick

| Factor | MVVM | MVI |
|--------|------|-----|
| Complexity | Low-Medium | Medium-High |
| Predictability | Good | Excellent |
| Boilerplate | Low | Medium |
| Debugging | Moderate | Easy (state replay) |
| Team size | Any | Medium+ |
