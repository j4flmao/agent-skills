# React Native Fundamentals

## Overview
React Native (RN) is Meta's framework for building mobile apps using React and JavaScript/TypeScript. It renders native UI components via a JavaScript-to-native bridge (or JSI in the New Architecture). Hermes is the default JavaScript engine starting from RN 0.70.

## Core Concepts

### JS Thread and Bridge
JS thread handles React logic and state. Bridge serializes JSON messages between JS and native. Expensive JS computations block the JS thread causing frame drops. New Architecture (JSI) reduces bridge overhead with direct native method calls.

### Components and Props
Core components: `View`, `Text`, `ScrollView`, `FlatList`, `Pressable`, `TextInput`, `Image`, `Modal`. Custom components compose core ones. Props pass data and callbacks parent-to-child. Style with `StyleSheet.create()` (no CSS — Flexbox layout).

### State and Lifecycle
`useState` for local component state. `useEffect` for side effects (network, subscriptions). `useCallback`/`useMemo` for performance. Component lifecycle: mount (constructor → render → useEffect), update (re-render → useEffect cleanup), unmount (useEffect cleanup).

### Navigation
`@react-navigation/native` with stack, tab, and drawer navigators. `navigation.navigate('Screen')` for type-safe routing using TypeScript. Deep linking configuration for universal links / custom schemes. `useNavigation` hook for non-screen components.

## Architecture Patterns

### Component Architecture
Presentational components (pure UI, no business logic) vs Container components (state, logic, data fetching). Custom hooks encapsulate reusable logic. Context API for lightweight global state. Zustand or Redux Toolkit for complex state.

### TanStack Query
Server state management for async data. `useQuery` for fetching, `useMutation` for writes. Automatic caching, background refetch, pagination, optimistic updates. Stale-while-revalidate strategy. Reduces boilerplate vs manual useEffect + useState.

### Expo vs Bare Workflow
Expo: managed workflow with OTA updates, built-in APIs, EAS Build. Bare: full native control, custom native modules, CocoaPods/Gradle. Prefer Expo for most apps — can eject to bare if needed. Expo SDK covers 90%+ of common APIs.

## Data Management

### AsyncStorage
Simple key-value storage (limited to ~6MB). Async, not encrypted. Use for non-sensitive preferences only. Migrate to MMKV for larger storage needs. `@react-native-async-storage/async-storage` is the standard package.

### MMKV
Fast key-value storage from WeChat (used in production). Synchronous reads, 30x faster than AsyncStorage. Supports encryption and shared instances between processes. Preferred for large data and performance-critical storage.

### WatermelonDB
SQLite-based relational DB for React Native. Lazy loading (only fetch visible records). Reactive queries via `observe()`. Sync adapter for offline-first with server. Best for complex local data (lists, nested relationships).

## Security Fundamentals

### react-native-keychain
Wrapper for iOS Keychain and Android EncryptedSharedPreferences. Store tokens and credentials securely. Face ID / fingerprint biometric unlock. `SECURITY_LEVEL.ANY` vs `SECURITY_LEVEL.SECURE_SOFTWARE`.

### SSL Pinning
Use `react-native-ssl-pinning` or OkHttp's CertificatePinner (Android) + URLSession delegate (iOS). Pin public key hashes. Include backup pins for key rotation. Test with mitmproxy to verify pinning works.

## Build & Dependency Management

### Metro Bundler
JS bundler for React Native. Config in `metro.config.js`. Supports symlinks, asset resolution, and transformer customization. Bundle for release with `npx react-native bundle --platform ios --dev false`.

### Hermes Engine
Default JS engine (RN 0.70+). Pre-compiled bytecode for faster startup. Reduced memory usage vs JavaScriptCore. Enable in `metro.config.js` and build config. Compatible with most JS features (check hermes compat table for edge cases).

### EAS Build (Expo)
Cloud build service for Expo apps. `eas build --platform all` for both platforms. `eas submit` for store submission. `eas update` for OTA JS updates (no App Store review). Configure in `eas.json`.

## Testing

### Jest + React Native Testing Library
Jest for unit tests. `@testing-library/react-native` for component tests (queries: `getByText`, `getByTestId`, `getByRole`). `userEvent` for realistic user interactions. Mock native modules with `jest.mock`.

### Detox
E2E testing for React Native. Gray box testing (knows React component tree). `device.launchApp`, `element(by.id('id'))`, `expect(element).toBeVisible()`. Run on CI with detox CLI. Test critical user journeys only.

## Key Points
- Hermes default engine (RN 0.70+) for faster startup
- TanStack Query for server state management
- Expo for most apps (EAS Build, OTA updates)
- MMKV over AsyncStorage for performance-critical storage
- react-native-keychain for secure credential storage
- react-native-screens + react-native-gesture-handler for native navigation perf
- New Architecture (Fabric + TurboModules) reduces bridge overhead
- StyleSheet.create for styles (inline styles are slower)
- FlatList with getItemLayout for optimized lists
- Detox for E2E tests; Jest + RNTL for unit/component tests
