# Mobile State Management

Classifying state in mobile apps and choosing where each kind lives: ephemeral UI state, screen state, app-wide state, server cache and persisted state. Includes recommended tools per platform, survival across configuration changes and process death, and common anti-patterns.

## Kinds of State

| Kind | Example | Owner | Lifetime |
|------|---------|-------|----------|
| Ephemeral UI | Text field focus, expanded/collapsed, scroll position | View/composable/widget | View lifetime (restore where users expect) |
| Screen state | Loaded list, form values, loading/error flags | ViewModel / Notifier / store slice | Screen in back stack |
| App/session state | Signed-in user, feature flags, cart | App-scoped service/store | Session |
| Server cache | Fetched entities | Repository + cache/query library | TTL / invalidation |
| Persisted | Settings, drafts, offline data | Database / key-value store | Across launches |
| Navigation | Back stack, selected tab | Navigation library | Session, restored on recreation |

Most bugs come from storing a piece of state at the wrong level, or in two places.

## Decision Rules

1. Keep state as local as possible; lift it only when two consumers need it.
2. Server data belongs in a cache layer with invalidation (repository + DB, or a query library), not copied into global stores.
3. Derive instead of store: compute `isCheckoutEnabled` from cart + user rather than maintaining a separate flag.
4. One writer per piece of state; others send events.
5. Persist what users would be upset to lose (drafts, settings, offline queue).

## Tools by Platform

| Platform | Screen state | App state | Server cache | Persistence |
|----------|--------------|-----------|--------------|-------------|
| Android (Compose) | `ViewModel` + `StateFlow`; `rememberSaveable` for small UI state | Hilt `@Singleton` services exposing `StateFlow` | Repository + Room as source of truth | Room, DataStore |
| iOS (SwiftUI) | `@Observable` model, `@State` | Environment-injected `@Observable` objects | Repository + SwiftData/Core Data or URLCache | SwiftData, Core Data, files, `@AppStorage` for small prefs |
| Flutter | Riverpod `Notifier`/`AsyncNotifier`, Bloc/Cubit | Scoped providers | `AsyncNotifier` with caching, or repository + drift/Isar/sqflite | drift, sqflite, shared_preferences |
| React Native | `useState`/`useReducer`, Zustand slices | Zustand or Redux Toolkit | TanStack Query (or RTK Query) | MMKV, SQLite (expo-sqlite), AsyncStorage for non-sensitive small data |

## Surviving Recreation and Process Death

### Android
- Configuration changes (rotation, dark mode, resizing) recreate Activities; `ViewModel` survives them.
- Process death (system kills the app in background) destroys ViewModels. Persist small screen state with `SavedStateHandle`; reload the rest from repositories.

```kotlin
@HiltViewModel
class SearchViewModel @Inject constructor(
    private val savedState: SavedStateHandle,
    private val repo: SearchRepository,
) : ViewModel() {
    val query: StateFlow<String> = savedState.getStateFlow("query", "")

    val results: StateFlow<List<Item>> = query
        .debounce(300)
        .flatMapLatest { q -> if (q.isBlank()) flowOf(emptyList()) else repo.search(q) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    fun onQueryChange(q: String) { savedState["query"] = q }
}
```

Test process death with "Don't keep activities" or `adb shell am kill <package>` while backgrounded.

### iOS
- SwiftUI `@SceneStorage` restores small per-scene values; `@AppStorage` for preferences.
- Apps can be terminated in background; restore navigation path (`NavigationStack(path:)` with a `Codable` path) and drafts from storage.

### Flutter / React Native
- Android process death also affects Flutter and RN apps; Flutter offers `RestorationMixin` / restorable properties; RN apps should persist critical state (drafts, nav state if needed) explicitly.

## Server Cache Patterns

```ts
// React Native with TanStack Query
const orders = useQuery({
  queryKey: ['orders', userId],
  queryFn: () => api.getOrders(userId),
  staleTime: 30_000,
})

const createOrder = useMutation({
  mutationFn: api.createOrder,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders', userId] }),
})
```

- Optimistic updates: update cache immediately, roll back on error, then refetch.
- Refetch on app foreground and network reconnect (TanStack Query's `focusManager`/`onlineManager` need React Native `AppState`/NetInfo wiring).
- Key caches by user ID; clear them on sign-out.

## Global State Done Right

```dart
// Riverpod: app-wide auth state, consumed by many screens
@Riverpod(keepAlive: true)
class Session extends _$Session {
  @override
  AsyncValue<User?> build() => const AsyncData(null);   // null = signed out

  Future<void> signIn(Credentials c) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => ref.read(authRepoProvider).signIn(c));
  }

  void signOut() {
    ref.read(authRepoProvider).signOut();
    ref.invalidate(ordersProvider);   // drop user-scoped caches
    state = const AsyncData(null);
  }
}
```

App-wide state should be small: identity, entitlements, flags, maybe cart. Everything else stays screen-scoped or in caches.

## Immutability and Updates

- UI state as immutable data classes / structs / freezed classes; update with `copy`/`copyWith`.
- Avoid mutating collections in place in observable state (Compose, Riverpod and React compare references).
- Emit state from one place to avoid races; in coroutines use `MutableStateFlow.update { }` for atomic read-modify-write.

## Anti-Patterns

| Anti-pattern | Problem | Fix |
|--------------|---------|-----|
| Server data copied into a global store and edited there | Stale, inconsistent copies | Repository/cache as single source |
| Giant app-wide store for every screen | Unnecessary re-renders, coupling | Screen-scoped state |
| Boolean soup (`isLoading`, `isError`, `isEmpty` independently) | Impossible combinations | Sealed/union UI state |
| Storing derived values | Out-of-sync data | Compute on read |
| Not clearing user state on logout | Data leaks between accounts | Invalidate caches, wipe user DB tables |
| State in singletons without DI | Untestable, leaks across tests | Inject state holders |

## Checklist

- [ ] Each piece of state has one owner at the lowest level that serves all consumers
- [ ] Server data handled by a cache/repository with invalidation
- [ ] Screen state survives configuration change; critical state survives process death
- [ ] UI state immutable; updates atomic
- [ ] User-scoped caches and storage cleared on sign-out
