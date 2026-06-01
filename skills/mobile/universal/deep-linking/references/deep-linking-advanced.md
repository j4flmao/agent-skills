# Advanced Deep Linking

## Deferred Deep Linking

Standard deep links only work if the app is already installed. Deferred deep links work after a fresh install: the link is stored by an attribution SDK before download, then resolved on first app launch.

### How It Works
```
1. User taps deferred link
2. SDK stores click data (campaign, referrer, target route)
3. User is redirected to App Store / Play Store
4. User installs and launches app
5. SDK initializes and checks for pending deep link data
6. SDK callback delivers the stored link parameters
7. App navigates to the intended screen
```

### Branch.io Implementation
```typescript
import Branch from 'react-native-branch';

class DeferredDeepLinkService {
  async init() {
    const { params } = await Branch.subscribe(({ error, params }) => {
      if (error) {
        console.error('Branch init error', error);
        return;
      }
      if (params && params['~referring_link']) {
        // Deferred deep link resolved
        const targetPath = params.$deeplink_path;
        this.navigateToDeepLink(targetPath, params);
      }
    });
  }

  // Create a deferred link for sharing
  async createShareLink(path: string, campaign: string) {
    const { url } = await Branch.createBranchUniversalObject(path, {
      metadata: { campaign },
    }).generateShortUrl();
    return url;
  }
}
```

### Adjust Implementation
```swift
import Adjust

class AdjustDeepLinkService {
    func initAdjust() {
        let config = ADJConfig(appToken: "YOUR_TOKEN", environment: .production)
        config.deferredDeeplinkCallback = { deeplink in
            // Called on first launch with deferred deep link
            guard let url = deeplink else { return }
            DeepLinkRouter.shared.handle(url: url)
        }
        // Launch the deferred link after all SDK initializations complete
        config.launchDeferredDeeplink = true
        Adjust.appDidLaunch(config)
    }
}
```

## Attribution & Analytics Integration

### Campaign Tracking Parameters
```
https://app.example.com/profile/42?utm_source=facebook&utm_campaign=spring_sale&utm_content=banner_a
```

### Analytics Event Requirements
Every deep link triggered should fire analytics events:
- `deep_link_received` — link was opened (includes campaign params)
- `deep_link_navigated` — link successfully routed to screen
- `deep_link_unhandled` — link pattern not in registry
- `deep_link_auth_gated` — user redirected to login first
- `deep_link_conversion` — user completed target action after deep link

### Conversion Funnel
```
Link Tap (web) → Install (store) → First Launch → Navigate to Screen → Complete Action
       ↓              ↓              ↓               ↓                   ↓
   click_event   install_event   launch_event   navigation_event   conversion_event
```

## Advanced Route Resolution

### Version-Aware Routing
Server-side or app-side logic to handle links targeting features in newer app versions:

```typescript
interface VersionedRoute {
  minVersion: string;  // e.g., "2.0.0"
  pattern: string;
  handler: Function;
}

const versionedRoutes: VersionedRoute[] = [
  { minVersion: "2.0.0", pattern: "/profile/:id", handler: profileHandler },
  { minVersion: "3.0.0", pattern: "/story/:id", handler: storyHandler },
];

function resolveRoute(path: string, appVersion: string) {
  const match = versionedRoutes
    .filter(r => semver.gte(appVersion, r.minVersion))
    .reverse()  // Latest version first
    .find(r => matchesPath(path, r.pattern));

  if (match) return match.handler;
  // Fallback: open store to update, or show placeholder
  return () => navigateTo(UpdateRequiredScreen);
}
```

### Conditional Routing (Auth-Gated)
```swift
class DeepLinkService {
    private var pendingLink: URL?

    func handle(url: URL) {
        guard AuthManager.shared.isLoggedIn else {
            // Queue the link, redirect to login
            pendingLink = url
            NavigationManager.shared.navigate(to: .login)
            return
        }

        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: true) else {
            return
        }
        RouteRegistry.shared.resolve(path: components.path, params: extractParams(from: components))
    }

    func onLoginComplete() {
        guard let url = pendingLink else { return }
        pendingLink = nil
        handle(url: url)
    }
}
```

### A/B Testing Deep Links
Dynamically choose destination based on experiment:

```typescript
class DynamicLinkRouter {
  async resolve(url: URL): Promise<Route> {
    const experiment = ExperimentService.getVariant('deep_link_landing');

    if (experiment === 'variant_a') {
      // Route to new onboarding
      return { screen: 'OnboardingV2', params: extractParams(url) };
    } else {
      // Route to original
      return { screen: 'Home', params: {} };
    }
  }
}
```

## Multi-Link Handling

### Batch Deep Links
For marketing campaigns that send multiple links (push + deeplink + SMS), deduplicate:

```swift
class LinkDeduplicator {
    private var processedLinks = Set<String>()

    func shouldProcess(_ url: URL) -> Bool {
        let normalized = normalize(url)
        guard !processedLinks.contains(normalized) else { return false }
        processedLinks.insert(normalized)
        // Limit set size
        if processedLinks.count > 100 {
            processedLinks.removeAll()
        }
        return true
    }

    private func normalize(_ url: URL) -> String {
        // Normalize: strip query param ordering, trailing slashes, etc.
        guard var components = URLComponents(url: url, resolvingAgainstBaseURL: true) else {
            return url.absoluteString
        }
        components.queryItems?.sort { $0.name < $1.name }
        return components.url?.absoluteString ?? url.absoluteString
    }
}
```

## Server-Side Link Generation

### Signed Deep Links
Add cryptographic signature to prevent tampering:

```typescript
// Server generates signed deep link
import { createHmac } from 'crypto';

function generateSignedLink(path: string, params: Record<string, string>): string {
  const payload = JSON.stringify({ path, params, exp: Date.now() + 86400000 });
  const signature = createHmac('sha256', SECRET_KEY).update(payload).digest('hex');
  const encodedPayload = Buffer.from(payload).toString('base64url');
  return `https://app.example.com/s/${encodedPayload}?sig=${signature}`;
}

// App validates signature
function validateSignedLink(signedUrl: string): { path: string; params: Record<string, string> } | null {
  const url = new URL(signedUrl);
  const payload = url.pathname.split('/').pop()!;
  const signature = url.searchParams.get('sig')!;

  const expectedSig = createHmac('sha256', SECRET_KEY)
    .update(Buffer.from(payload, 'base64url'))
    .digest('hex');

  if (signature !== expectedSig) return null;

  const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
  if (Date.now() > decoded.exp) return null;  // Expired

  return { path: decoded.path, params: decoded.params };
}
```

### Dynamic Redirect Server
```typescript
// Server-side redirect handler (Cloudflare Worker / Vercel Edge)
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const userAgent = request.headers.get('User-Agent') || '';

  // Determine platform
  const isIOS = /iPhone|iPad|iPod/.test(userAgent);
  const isAndroid = /Android/.test(userAgent);

  if (isIOS) {
    // Try universal link
    return Response.redirect(`https://app.example.com${url.pathname}`, 302);
  } else if (isAndroid) {
    return Response.redirect(`https://app.example.com${url.pathname}`, 302);
  }

  // Desktop/web: show landing page
  return new Response(renderLandingPage(url.pathname), {
    headers: { 'Content-Type': 'text/html' }
  });
}
```
