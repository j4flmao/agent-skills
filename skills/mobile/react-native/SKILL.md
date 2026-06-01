---
name: react-native
description: >
  Use this skill when the user asks about React Native, Expo, React Navigation,
  Zustand, TanStack Query, native modules, New Architecture, Hermes, or React
  Native testing.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [mobile, react-native, phase-4]
---

# React Native

## Purpose
Build React Native cross-platform applications with Expo, TanStack Query, Zustand, React Navigation, native modules, and comprehensive testing with Jest and Detox.

## Agent Protocol

### Trigger
User request includes: `react native`, `react-native`, `expo`, `rn`, `react native architecture`, `react native navigation`, `react native testing`, `native module`, `new architecture`, `hermes`.

### Input Context
- RN version (0.76+, New Architecture enabled?)
- Expo or bare workflow
- State management (Redux Toolkit, Zustand, TanStack Query)
- Navigation (React Navigation, Expo Router)
- Platform target (iOS, Android)

### Output Artifact
A markdown document containing:
- Project structure
- Component tree
- Navigation/routing setup
- State management architecture
- Native module integration
- Test plan

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick.

### Max Response Length
4096 tokens

## Workflow

### Step 1: Set Up Project Structure
Initialize with Expo and organize code with feature-based folders: features (api, components, hooks, types), shared, lib, and types.

### Step 2: Configure State Management
Use TanStack Query for server state (caching, refetching, pagination) and Zustand for lightweight client state.

### Step 3: Set Up Navigation
Configure Expo Router with file-based routing, tab navigation, and deep linking support.

### Step 4: Implement Native Module Bridges
Create native module interfaces for platform-specific features with Swift (iOS) and Kotlin (Android) implementations.

### Step 5: Write Tests
Cover queries with Jest unit tests, components with RNTL, and critical flows with Detox E2E tests.

## Architecture Decision Trees

### Expo vs Bare Workflow
```
Need native module not in Expo SDK?
├── Yes → Do you need to build it yourself?
│   ├── Yes → Bare workflow (react-native init or expo prebuild --bare)
│   └── No → Expo Dev Client with prebuild (config plugin approach)
└── No → Expo Go (managed workflow)
    Pros: OTA updates, EAS Build, no Xcode/Studio needed initially
    Cons: limited to Expo SDK modules only
```

### State Management Selection
```
Data origin?
├── Server state (API data, cached, paginated)
│   → TanStack Query — caching, refetching, optimistic updates, infinite queries
├── Client state (theme, auth token, selected item IDs)
│   → Zustand — tiny (~1KB), no boilerplate, middleware (persist, immer)
├── Form state (inputs, validation, submission)
│   → React Hook Form — performant, validation schemas (Zod), least re-renders
└── Global app state (complex, multi-reducer)
    → Redux Toolkit — mature, middleware ecosystem, DevTools
```

### New Architecture Adoption
```
Existing app or new?
├── New project → Enable immediately (Fabric + TurboModules + Codegen)
│   Fabric: synchronous JS-to-native calls (no bridge serialization)
│   TurboModules: lazy loading, typed interfaces, C++ JSI
├── Existing app, light native modules → Gradual adoption
│   Enable Fabric per-component, migrate native modules one at a time
└── Existing app, heavy native modules → Stay on old architecture until modules migrate
```

## Project Structure (Expo)

```
app/                          # Expo Router file-based
├── (tabs)/
│   ├── _layout.tsx
│   ├── orders.tsx
│   └── profile.tsx
├── orders/
│   └── [id].tsx
├── _layout.tsx
└── index.tsx
src/
├── features/
│   ├── orders/
│   │   ├── api/
│   │   │   └── useOrders.ts
│   │   ├── components/
│   │   │   └── OrderCard.tsx
│   │   ├── hooks/
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── index.ts
│   └── ...
├── shared/
│   ├── components/
│   ├── hooks/
│   └── utils/
├── lib/
│   ├── api.ts
│   └── query.ts
└── types/
    └── common.ts
```

## State Management — TanStack Query + Zustand

```typescript
// api/orders.ts
export function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: () => api.getOrders(),
    staleTime: 5 * 60 * 1000, // 5 min
    gcTime: 30 * 60 * 1000,   // 30 min cache (formerly cacheTime)
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['orders', id],
    queryFn: () => api.getOrder(id),
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateOrderInput) => api.createOrder(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });
}

// stores/orderStore.ts
interface OrderStore {
  selectedId: string | null;
  filter: OrderFilter;
  setFilter: (f: OrderFilter) => void;
  selectOrder: (id: string) => void;
  reset: () => void;
}

export const useOrderStore = create<OrderStore>()(
  persist(
    (set) => ({
      selectedId: null,
      filter: { status: undefined, query: '' },
      setFilter: (filter) => set({ filter }),
      selectOrder: (id) => set({ selectedId: id }),
      reset: () => set({ selectedId: null, filter: { status: undefined, query: '' } }),
    }),
    { name: 'order-store' }
  )
);
```

## Navigation — Expo Router

```typescript
// app/(tabs)/_layout.tsx
export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="orders" options={{ title: 'Orders' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

// app/(tabs)/orders.tsx
export default function OrdersScreen() {
  const { data: orders, isLoading, error } = useOrders();
  const filter = useOrderStore((s) => s.filter);

  if (isLoading) return <ActivityIndicator />;
  if (error) return <ErrorMessage message={error.message} />;

  return (
    <FlatList
      data={orders}
      renderItem={({ item }) => <OrderCard order={item} />}
      keyExtractor={(item) => item.id}
      refreshing={isLoading}
      onRefresh={() => useOrders()}
    />
  );
}
```

## Native Module Bridge

```typescript
// src/lib/payment.ts
import { NativeModules, Platform } from 'react-native';

const { PaymentModule } = NativeModules;

export async function processPayment(amount: number, currency: string): Promise<string> {
  try {
    return await PaymentModule.processPayment(amount, currency);
  } catch (error) {
    if (Platform.OS === 'ios') {
      // Fallback for simulator (no Apple Pay)
      return `sim_payment_${Date.now()}`;
    }
    throw error;
  }
}
```

### iOS Swift Implementation

```swift
@objc(PaymentModule)
class PaymentModule: NSObject {
  @objc
  func processPayment(_ amount: Double, currency: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock) {
    // Apple Pay / Stripe integration
    resolve("payment_\(UUID().uuidString)")
  }

  @objc
  static func requiresMainQueueSetup() -> Bool { false }
}
```

### Android Kotlin Implementation

```kotlin
@ReactMethod
fun processPayment(amount: Double, currency: String,
  promise: Promise) {
  // Google Pay / Stripe integration
  promise.resolve("payment_${UUID.randomUUID()}")
}
```

## Testing

### Unit Test (Jest)

```typescript
describe('useOrders', () => {
  it('returns orders on success', async () => {
    const { result } = renderHook(() => useOrders(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
  });

  it('returns error on failure', async () => {
    mockServer.use(getOrdersError());
    const { result } = renderHook(() => useOrders(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
```

### Component Test (RNTL)

```typescript
it('renders order list with items', () => {
  render(<OrderListScreen />);
  expect(screen.getByText('Order #1')).toBeOnTheScreen();
  expect(screen.getByText('Order #2')).toBeOnTheScreen();
});

it('shows empty state', () => {
  render(<OrderListScreen orders={[]} />);
  expect(screen.getByText(/no orders/i)).toBeOnTheScreen();
});
```

### E2E (Detox)

```typescript
describe('Order Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('creates a new order', async () => {
    await by.id('create-order').tap();
    await by.id('customer-name').typeText('Alice');
    await by.id('submit-order').tap();
    await expect(by.text('Order created')).toBeVisible();
  });
});
```

## Hermes + Metro Config

```javascript
// metro.config.js
module.exports = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true, // reduces bundle size by inlining modules
      },
    }),
  },
};
```

## Performance Patterns

- `FlatList` over `ScrollView` for lists — virtualization prevents rendering off-screen items
- `getItemLayout` for fixed-height items (avoids measurement, 2x faster scroll)
- `React.memo` + `useCallback` for expensive child components
- `InteractionManager.runAfterInteractions` for deferring heavy work after navigation transitions
- `InteractionManager` for deferring non-critical work until animations complete
- `useNativeDriver: true` on all Animated values (except layout/position which need native driver)
- `StyleSheet.create()` over object literals — creates styles once, not every render
- `Image` with `resizeMode` and cached via FastImage or expo-image
- `console.log` removal in production — use `__DEV__` guard or babel-plugin-transform-remove-console

## Hermes-Specific Optimizations

- Enable Hermes for all release builds (default in RN 0.70+)
- `--bundle-output` with `--minify` for production bundles
- Prefer `globalThis` over `global` for cross-hermes compatibility
- Avoid Proxy, Symbol.toStringTag, and other unsupported ES6 features
- `hermes-engine` prebuilt in RN 0.70+ — no separate installation needed

## Expo-Specific Features

- EAS Build for cloud builds (no local Xcode/Android Studio needed)
- EAS Submit for App Store / Play Store uploads
- EAS Update for OTA JavaScript updates (skip app review for JS-only changes)
- `expo-dev-client` for custom native modules with Expo workflow
- `expo-build-properties` for native build configuration from app.json
- Config plugins for native project modifications without ejecting

## Anti-Patterns

- **Inline styles**: Each render creates new objects — use StyleSheet.create
- **setState for server data**: Cache, refetch, and invalidate via TanStack Query — never store API data in React state
- **Direct navigation prop passing**: Use navigation hooks (useNavigation, useRouter) — don't thread navigator through props
- **Magic strings for routes**: Use typed route constants — Expo Router file-based routes reduce this issue
- **Unbounded FlatList**: Always specify `maxToRenderPerBatch`, `windowSize`, and `removeClippedSubviews`
- **setState in render**: Causes infinite re-renders — move to useEffect or event handlers
- **Component with too many responsibilities**: Split into container + presentation components
- **Redux for everything**: TanStack Query for server, Zustand for local, Redux only if you already use it
- **Bare workflow without need**: Expo manages complex tooling — only eject (prebuild) when you absolutely need to

## Rules

- Server state belongs in TanStack Query — not in Zustand or Redux
- Client state (UI state, selected IDs, filters) belongs in Zustand
- FlatList over ScrollView for lists with virtualization enabled
- Native modules must have TypeScript interface + iOS Swift + Android Kotlin implementations
- Avoid inline styles — use StyleSheet.create or styled components
- Hermes enabled by default for production builds
- KeyboardAvoidingView wrapping for text input screens
- Use expo-image or FastImage for cached network images (not Image component)
- Enable inlineRequires in Metro config for bundle size reduction
- React.memo components that render often but rarely change props
- Test with jest instead of mocha — built-in, faster, snapshot support
- Detox for E2E — Appium is slower, less reliable for RN
- Expo EAS Update for OTA JS updates — native changes still require app store submission

## References
  - references/architecture.md — React Native Architecture
  - references/navigation-routing.md — React Native Navigation and Routing
  - references/navigation.md — React Native Navigation
  - references/performance-optimization.md — React Native Performance Optimization
  - references/performance.md — React Native Performance
  - references/react-native-advanced.md — React Native Advanced Topics
  - references/react-native-fundamentals.md — React Native Fundamentals
  - references/testing.md — React Native Testing
## Handoff

Hand off to `mobile/universal/deployment/SKILL.md` for build and deployment.
