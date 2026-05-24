---
name: mobile-map-location
description: >
  Use this skill when the user says 'maps', 'location', 'map view', 'geolocation', 'GPS', 'MapKit', 'Google Maps', 'map marker', 'map annotation', 'location service', 'geocoding', 'reverse geocoding'. Integrate maps, location tracking, geofencing, and geocoding in mobile apps. Do NOT use for: backend location processing or web maps.
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [mobile, maps, location, phase-7, universal]
version: "1.0.0"
author: "j4flmao"
license: "MIT"
---

# Mobile Maps & Location

## Purpose
Guide for integrating maps and location services in mobile apps: map display, location tracking, geocoding, and permissions.

## Agent Protocol

### Trigger
Phrases: "maps", "location", "map view", "geolocation", "GPS", "MapKit", "Google Maps", "map marker", "map annotation", "location service", "geocoding", "reverse geocoding"

### Input Context
- Map provider preference (Apple Maps, Google Maps, MapLibre, Mapbox)
- Location accuracy requirements (significant changes vs precise)
- Marker/annotation data and clustering needs
- Geofencing regions (if applicable)

### Output Artifact
Map integration: map view setup, marker configuration with clustering, location permission handling, tracking logic, geocoding cache.

### Response Format
```
<map-location>
<provider>{mapkit/google/maplibre config}</provider>
<permissions>{usage descriptions, request flow}</permissions>
<display>{markers, clusters, annotations, styling}</display>
<tracking>{permission, updates, geofencing}</tracking>
<geocoding>{forward, reverse, cache}</geocoding>
</map-location>
```
No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- Map renders with correct region and zoom
- Markers display with clustering for >25 pins
- Location permission flow works with proper fallback
- Location updates deliver at expected interval
- Geocoding returns results with caching

### Max Response Length
6000 tokens

## Workflow

1. **Map SDK selection** — Four major map SDKs with different tradeoffs. Apple MapKit: iOS-only, free (no API key), smooth integration with SwiftUI `Map` and UIKit `MKMapView`, flyover 3D mode, LookAround street-level view, limited customization compared to Google Maps, no Android equivalent. Google Maps: cross-platform (iOS + Android), rich features (indoor maps, Street View, places API), requires API key with billing, extensive customization (markers, polygons, heatmaps, ground overlays), styling via JSON or Cloud-based Maps Styling, direction API with turn-by-turn, Places API for search and autocomplete. MapLibre: open-source fork of Mapbox GL Native, custom style JSON (Mapbox GL style spec), self-hosted tiles (or free tile providers), no API key required, full control over data and rendering, smaller ecosystem but privacy-focused. Mapbox: custom styling, Navigation SDK with turn-by-turn, real-time traffic, optimized for trucking/logistics, pricing based on map loads (generous free tier then paid). Selection criteria: cross-platform needs, budget, feature requirements (navigation, offline tiles, custom styling), data privacy requirements.

2. **Location permissions** — Two-tier permission model on both platforms. iOS: `requestWhenInUseAuthorization` (foreground only) vs `requestAlwaysAuthorization` (background + foreground). Usage description keys in Info.plist: `NSLocationWhenInUseUsageDescription`, `NSLocationAlwaysAndWhenInUseUsageDescription`, `NSLocationTemporaryUsageDescriptionDictionary` (iOS 14+ for precise vs approximate). Precise location (`kCLLocationAccuracyBest`) requires user granting full accuracy — can request temporary full accuracy with justification string. Android: `ACCESS_FINE_LOCATION` (GPS + network, precise), `ACCESS_COARSE_LOCATION` (network only, ~100m), `ACCESS_BACKGROUND_LOCATION` (must be requested after foreground permission is granted). Android 10+ requires separate background permission request — cannot bundle with foreground. Best practice: request minimum permission for use case, request when needed (not on launch), show rationale dialog before system dialog, handle denial with settings redirect.

3. **Map display with markers and clustering** — Map view configuration: initial camera position (latitude, longitude, zoom level), min/max zoom limits, map type (standard, satellite, hybrid, terrain). Markers: position, title, subtitle, custom icon (use vector drawables for resolution independence), tint color. Callout/animation on marker tap — show info window with additional data. Clustering: for 25+ markers, use platform clustering APIs (`MKClusterAnnotation` on iOS, `ClusterManager` on Android with Google Maps, `MapLibre` has built-in clustering). Custom cluster renderer: show count badge on cluster icon, animate expansion/contraction on zoom. Polylines for routes: `MKPolyline` (iOS), `PolylineOptions` (Google Maps), with stroke color, width, pattern (solid, dashed). Polygons for areas: `MKPolygon`, `PolygonOptions` with fill color and stroke. Ground overlays for image-based layers.

4. **Location tracking strategies** — Four tracking modes with different accuracy and power profiles. (a) Continuous high-accuracy: `kCLLocationAccuracyBest` / `PRIORITY_HIGH_ACCURACY` with 1-2 sec interval — for navigation, running tracking. High battery drain. (b) Balanced: `kCLLocationAccuracyHundredMeters` / `PRIORITY_BALANCED_POWER_ACCURACY` with 30-60 sec interval — for weather, nearby places. (c) Significant-change: `startMonitoringSignificantLocationChanges` (iOS) or `PRIORITY_LOW_POWER` (Android) — triggered only when device moves ~500m. Battery efficient, suitable for location badges, city-level features. (d) Region monitoring (geofencing): define circular regions with radius ≥100m (iOS) or adjustable (Android). Max 20 regions per app on iOS. Enter/exit callbacks. For background location, iOS requires `allowsBackgroundLocationUpdates = true` and the "Background Modes → Location updates" capability. Android requires `ACCESS_BACKGROUND_LOCATION` permission. Both require strong justification at app review.

5. **Geocoding** — Forward geocoding: address string → coordinate. Reverse geocoding: coordinate → address string. Platform APIs: Apple `CLGeocoder` (free, rate-limited to 1 request per second, no API key), Android `Geocoder` (free, may not be available on all devices, uses Google backend), Google Geocoding API (paid via API key, higher rate limits, richer results, additional data like place ID, formatted address components). Best practices: cache geocoding results in local DB with TTL (24 hours for addresses, unlimited for place IDs), batch geocode when possible, show approximate location while geocoding, handle "no results found" gracefully, provide manual address entry fallback. For offline geocoding, bundle top 100-500 locations in app bundle, or use offline geocoding libraries (Nominatim with offline data, Mapbox offline geocoding).

6. **Map customization and gestures** — Map style customization: Google Maps JSON style (light/dark/night), MapKit `mapStyle` with light/dark/elevated, MapLibre custom style JSON. Service layer styling for Google Maps: programmatic style updates via `map.setMapStyle()`. Gesture handling: map pinch-to-zoom, rotate, tilt — enable/disable via `uiSettings.isZoomGesturesEnabled` (Google Maps) or `mapView.isZoomEnabled` (MapKit). Custom gesture recognizers for marker interactions. Map padding to account for UI overlays (toolbars, bottom sheets, floating buttons) using `setPadding()` (Google Maps) or `layoutMargins` (MapKit). Animated camera updates: smooth transitions between locations with `animateCamera()` (Google Maps) or `setRegion(animated: true)` (MapKit).

## Map SDK Comparison

| Feature | MapKit | Google Maps | MapLibre | Mapbox |
|---------|--------|------------|----------|--------|
| iOS | Native | Yes | Yes | Yes |
| Android | No | Yes | Yes | Yes |
| API key required | No | Yes | No | Yes |
| Offline tiles | Limited | Yes (paid) | Yes | Yes (paid) |
| Custom style | Limited | Full (JSON) | Full (JSON) | Full (JSON) |
| Navigation SDK | No | Yes (paid) | No | Yes |
| Routing/Directions | Yes | Yes (paid) | Via OSRM | Yes |

## Best Practices

- Request minimum location permission for the use case (when-in-use vs always)
- Include usage description strings in Info.plist and AndroidManifest — app rejection if missing
- Cluster markers when count exceeds 25 — performance degrades quadratically without it
- Cache geocoding results with 24h TTL to reduce API costs and latency
- Test location on real device — simulators provide limited/static location data

## Common Pitfalls

- **Region monitoring limit**: iOS caps at 20 simultaneous monitored regions. Monitor larger regions that encompass smaller areas.
- **Simulator location static**: Simulators don't generate real location updates. Use GPX files or custom location simulation.
- **Background location rejected**: Apple and Google review background location usage. Must provide compelling user-facing justification.
- **Geocoding rate limit exceeded**: `CLGeocoder` silently drops requests after 1/sec. Implement request throttling.
- **Map UI freezes**: Map rendering on main thread can jank UI. Use lighter markers, reduce cluster count, defer heavy annotation.

## Configuration Reference

```xml
<!-- AndroidManifest.xml location permissions -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
```

## References

- `references/map-sdks.md` — Map providers, markers, clustering, styling, gesture handling
- `references/location-services.md` — Permissions, GPS, geofencing, background location, battery optimization
- `references/map-integration.md` — Map SDK integration, cross-platform map usage, MapKit/Google Maps setup
- `references/geofencing-patterns.md` — Region monitoring, significant location change, visit monitoring, battery optimization, geofence transitions, background execution
- `references/map-customization.md` — Custom markers, clustering, polylines/polygons, tile overlays, style customization, offline maps, routing/navigation

## Handoff
Hand off to mobile-networking when offline map tile caching is needed, or mobile-perf when map rendering performance optimization is required.
