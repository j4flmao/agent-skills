# React Native App Flows: Startup, Auth, Deep Links, Push and Lifecycle

Step-by-step flows that most production apps implement, with the order of operations that avoids flicker, races and lost events. Navigation APIs themselves are in `navigation.md` and `navigation-routing.md`.

## 1. Cold Start Flow

```
Native launch -> splash screen visible
  -> JS bundle loads (Hermes bytecode)
  -> Root component mounts, keeps splash
  -> parallel: load fonts, read session from secure storage, run DB migrations, read remote config cache
  -> decide initial route (auth vs app)
  -> first screen renders its layout
  -> hide splash
  -> deferred work: analytics init, prefetch, OTA update check
```

```tsx
// app/_layout.tsx (Expo Router)
import * as SplashScreen from 'expo-splash-screen';
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        await Promise.all([loadFonts(), restoreSession(), runMigrations()]);
      } catch (e) {
        logger.error('Startup initialisation failed', { error: String(e) });
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const onLayout = useCallback(() => { if (ready) SplashScreen.hideAsync(); }, [ready]);
  if (!ready) return null;
  return <View style={{ flex: 1 }} onLayout={onLayout}><Slot /></View>;
}
```

Keep the critical path short: anything not needed for the first screen goes after `hideAsync`.

## 2. Authentication Flow (OAuth 2.0 / OIDC)

Use the system browser with Authorization Code + PKCE (RFC 8252). Never embed a WebView for third-party login.

```
User taps Sign in
  -> generate code_verifier + code_challenge (S256), state
  -> open system auth session (ASWebAuthenticationSession / Custom Tabs)
  -> IdP redirects to app scheme or universal link with code + state
  -> verify state, exchange code + verifier at token endpoint
  -> store refresh token in Keychain/Keystore, access token in memory
  -> set session -> router switches to authenticated group
```

Libraries: `expo-auth-session` or `react-native-app-auth`.

### Token Refresh

```ts
let refreshing: Promise<string> | null = null;

async function getAccessToken(): Promise<string> {
  if (tokenValid(memoryToken)) return memoryToken!.value;
  refreshing ??= refreshTokens().finally(() => { refreshing = null; });
  return refreshing;   // concurrent callers share one refresh request
}

http.interceptors.response.use(undefined, async (error) => {
  const original = error.config;
  if (error.response?.status === 401 && !original._retried) {
    original._retried = true;
    original.headers.Authorization = `Bearer ${await getAccessToken()}`;
    return http(original);
  }
  throw error;
});
```

On refresh failure (invalid_grant): clear secure storage and query cache, then route to sign-in. Rotate refresh tokens server side.

### Sign-out

1. Revoke refresh token at the server (best effort).
2. Delete tokens from secure storage.
3. `queryClient.clear()`, reset stores, clear user-scoped MMKV instances.
4. Unregister push token for the user.
5. Navigate to the auth group (replace, not push).

## 3. Deep Link Flow

| Link type | iOS | Android |
|-----------|-----|---------|
| Custom scheme `myapp://` | `CFBundleURLTypes` | intent filter | 
| Universal / App Links `https://example.com/...` | Associated Domains + `apple-app-site-association` | `autoVerify` intent filter + `assetlinks.json` |

Prefer verified HTTPS links; any app can register a custom scheme.

```
Link opens app
  -> cold start: initial URL via Linking.getInitialURL (router handles it)
  -> warm: 'url' event
  -> parse and validate params (schema) -> never trust IDs/flags in the URL
  -> if route requires auth and no session: store pending link, sign in, then resume
  -> navigate with replace semantics for auth redirects
```

Expo Router maps URLs to files automatically; `+native-intent.tsx` lets you rewrite incoming URLs. Firebase Dynamic Links has been shut down; use universal/app links plus your own short-link service or a vendor such as Branch.

## 4. Push Notification Flow

```
App start (authenticated)
  -> request permission at a meaningful moment (Android 13+ needs POST_NOTIFICATIONS)
  -> get device token (FCM/APNs) or Expo push token
  -> register token with backend (user id, platform, app version)
  -> listen: token refresh -> re-register
Notification received
  -> foreground: decide whether to show (setNotificationHandler)
  -> background/killed: OS shows it
User taps notification
  -> read payload (route + ids only, no sensitive data)
  -> same path as a deep link (auth gate, validation, navigate)
```

Handle the "tapped while app was killed" case with `getLastNotificationResponseAsync()` (expo-notifications) or the equivalent initial-notification API.

## 5. App Lifecycle Flow

```ts
useEffect(() => {
  const sub = AppState.addEventListener('change', (next) => {
    if (next === 'active') {
      focusManager.setFocused(true);   // TanStack Query refetches stale queries
      checkForUpdates();               // OTA, at most every N minutes
      maybeRequireBiometricUnlock();
    } else {
      focusManager.setFocused(false);
      flushAnalytics();
    }
  });
  return () => sub.remove();
}, []);
```

- iOS may suspend the app seconds after backgrounding; finish writes quickly.
- Android may kill the process; restore navigation state and form drafts from storage.
- Background tasks: `expo-background-task` (WorkManager / BGTaskScheduler), runs are opportunistic and never guaranteed.

## 6. Offline Mutation Flow

```
User action -> optimistic UI update -> write to local outbox (idempotency key)
  -> online? send now : wait for NetInfo online
  -> success: mark synced, reconcile with server response
  -> 4xx: roll back optimistic change, show error
  -> 5xx/network: keep in outbox, retry with backoff (bounded)
```

## 7. Forced Update Flow

At startup read remote config `min_supported_version`; if the installed build is older, show a blocking screen linking to the store. Use this for security fixes and breaking API changes that OTA cannot deliver.

## Checklist

- [ ] Splash hidden only after first screen layout
- [ ] Auth uses system browser + PKCE; refresh is single-flight
- [ ] Sign-out clears tokens, caches, stores and push registration
- [ ] Deep-link params validated; pending link resumed after login
- [ ] Push taps reuse the deep-link path, including cold start
- [ ] Lifecycle hooks wired to query focus and OTA checks
- [ ] Minimum-version gate exists
