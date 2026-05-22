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

1. **Map provider selection** — Apple MapKit: iOS-only, no API key needed, smooth integration. Google Maps: cross-platform, rich features, requires API key. MapLibre: open-source, custom style JSON, self-hosted tiles. Mapbox: custom styling, navigation SDK.

2. **Location permissions** — `requestWhenInUseAuthorization` for foreground. `requestAlwaysAuthorization` for background (geofencing, tracking). Usage description strings mandatory in Info.plist and AndroidManifest. Justify background location at review time.

3. **Map display** — Map view with initial region. Markers with title, subtitle, and custom annotation views. Clustering for 25+ markers. Polylines for routes, polygons for areas. Map style customization (light/dark, terrain, custom tiles).

4. **Location tracking** — CLLocationManager (iOS) or FusedLocationProviderClient (Android). Subscribe to updates with appropriate accuracy (kCLLocationAccuracyBest for navigation, kCLLocationAccuracyHundredMeters for weather). Significant-change monitoring for battery efficiency. Region monitoring for geofence enter/exit.

5. **Geocoding** — Forward: address string → CLLocationCoordinate2D / LatLng. Reverse: coordinates → address string. Apple CLGeocoder, Android Geocoder, or Google Geocoding API. Rate limit (iOS: 1 req/s). Cache results in local DB with TTL. Offline geocoding for top 100 locations.

## Rules

- Request minimum location permission for the use case.
- Always include usage description strings in Info.plist and AndroidManifest.
- Background location requires user-facing justification at runtime on both platforms.
- Cluster markers when count exceeds 25 — performance degrades without it.
- Cache geocoding results with 24h TTL to reduce API costs and latency.
- Test location on real device — simulator provides limited/static location data.
- Region monitoring limited to 20 regions per app on iOS.
- Always handle location permission denial — degrade gracefully, show rationale.

## References

- `references/map-integration.md` — Map providers, markers, clustering, styling, gesture handling
- `references/location-services.md` — Permissions, GPS, geofencing, background location, battery optimization

## Handoff
Hand off to mobile-networking when offline map tile caching is needed, or mobile-perf when map rendering performance optimization is required.
