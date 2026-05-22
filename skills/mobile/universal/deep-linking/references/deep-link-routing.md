# Deep Link Routing

## Route Registry

```typescript
// Route registry mapping URL patterns to navigation targets
const routeRegistry: RouteEntry[] = [
  { pattern: '/profile/:id', screen: 'ProfileScreen' },
  { pattern: '/product/:category/:productId', screen: 'ProductDetailScreen' },
  { pattern: '/search', screen: 'SearchScreen' },
  { pattern: '/search?q=:query', screen: 'SearchScreen' },
  { pattern: '/settings', screen: 'SettingsScreen', auth: true },
];
```

## URL Parser

```typescript
function parseDeepLink(url: string): DeepLinkContext {
  const parsed = new URL(url);
  const path = parsed.pathname;
  const params = Object.fromEntries(parsed.searchParams);

  for (const entry of routeRegistry) {
    const match = matchPath(entry.pattern, path);
    if (match) {
      return {
        screen: entry.screen,
        params: { ...match.params, ...params },
        requiresAuth: entry.auth ?? false,
      };
    }
  }
  return { screen: 'NotFound', params: {} };
}
```

## Navigation Handler

```typescript
function handleDeepLink(url: string): void {
  const context = parseDeepLink(url);

  if (context.requiresAuth && !authService.isLoggedIn) {
    // Queue link for post-login navigation
    navigationService.deeplinkQueue = context;
    router.push('LoginScreen');
    return;
  }

  router.push(context.screen, context.params);
}
```

## Deferred Deep Links (Branch)

```typescript
// In AppDelegate / MainActivity init
branch.initSession({ isReferrable: true }) { (params, error) in
  if let linkData = params?["$deeplink_path"] as? String {
    handleDeepLink(linkData)
  }
}
```

## Fallback URL

```
https://example.com/app-redirect?url=https://apps.apple.com/app/id123
https://example.com/app-redirect?url=https://play.google.com/store/apps/details?id=com.example
```

## Attribution Summary

| Feature | Custom URL | Universal | Deferred |
|---------|-----------|-----------|----------|
| Opens app | Yes | Yes | Yes |
| No prompt | No | Yes | Yes |
| After install | No | No | Yes |
| HTTPS required | No | Yes | Yes |
| SDK needed | No | No | Yes |
