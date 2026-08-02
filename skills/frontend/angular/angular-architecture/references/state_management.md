# State Management Architecture

## RxJS BehaviorSubject (Lightweight State)
For small to medium applications, a simple store using `BehaviorSubject` is often sufficient and avoids boilerplate.

```typescript
@Injectable({ providedIn: 'root' })
export class UserStateService {
  private userSubject = new BehaviorSubject<User | null>(null);
  user$ = this.userSubject.asObservable();

  updateUser(user: User) {
    this.userSubject.next(user);
  }
}
```

## NgRx & Redux Pattern (Enterprise State)
NgRx applies the Redux pattern to Angular, utilizing RxJS. Best for complex state, high interaction, and predictable debugging (time-travel).

### Core Concepts:
- **Store**: Single source of truth.
- **Actions**: Unique events describing state changes (`[User API] Load Users Success`).
- **Reducers**: Pure functions mapping `(previousState, action) => newState`.
- **Selectors**: Memoized functions to slice and derive specific state for components.
- **Effects**: Side-effect model for async operations (e.g., API calls), listening to actions and dispatching new ones.

```typescript
// Selector Example
export const selectUserFeature = createFeatureSelector<UserState>('users');
export const selectAllUsers = createSelector(
  selectUserFeature,
  (state) => state.users
);
```
