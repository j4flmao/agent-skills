# Map and Location Skill

## Overview
Map integration provides location-based features including interactive maps, geocoding, routing, and location tracking. This skill covers platform-specific APIs (MapKit, Google Maps, Mapbox), cross-platform solutions, and location services.

## Decision Tree: Map Platform Selection

### Which Map SDK to Use?
```
Target platforms:
├── iOS-only → Apple MapKit (free, integrated, no API key)
├── Android-only → Google Maps (rich features, needs API key)
├── Cross-platform (iOS + Android) → Google Maps for both, or Mapbox
├── React Native → react-native-maps (uses native SDKs)
├── Flutter → flutter_map (OpenStreetMap) or google_maps_flutter
├── Web → Leaflet (free, OpenStreetMap), Mapbox GL JS, or Google Maps JS
└── Cross-platform + Web → Mapbox GL (unified API across all platforms)
```

### Feature Requirements Decision
```
What map features do I need?
├── Show a static location → Simple annotation/marker (any SDK)
├── User location tracking → Core Location (iOS) / Fused Location (Android)
├── Search/geocoding → MKLocalSearch (iOS) / Places API (Android/Web)
├── Turn-by-turn navigation → Mapbox Navigation SDK or Google Navigation
├── Custom map styles → Mapbox Studio (most flexible) or Google Maps styling
├── Offline maps → Mapbox offline or Google Maps offline tiles
├── Indoor maps → Google Maps Indoor or custom solution
├── Heatmaps / data visualization → Google Maps Heatmap or Deck.gl + Mapbox
├── Route optimization → Google OR-Tools or Mapbox Optimization API
└── Real-time location sharing → WebSocket + location SDK
```

## Platform Integration Patterns

### MapKit (iOS) Pattern
```swift
import MapKit

class MapManager: NSObject {
    private let mapView: MKMapView
    private let locationManager = CLLocationManager()

    init(mapView: MKMapView) {
        self.mapView = mapView
        super.init()
        setupMap()
    }

    private func setupMap() {
        mapView.delegate = self
        mapView.showsUserLocation = true
        mapView.showsCompass = true
        mapView.showsScale = true
        locationManager.delegate = self
        requestLocationPermission()
    }

    func addAnnotation(at coordinate: CLLocationCoordinate2D, title: String, subtitle: String? = nil) {
        let annotation = MKPointAnnotation()
        annotation.coordinate = coordinate
        annotation.title = title
        annotation.subtitle = subtitle
        mapView.addAnnotation(annotation)
    }

    func searchNearby(query: String, radius: CLLocationDistance = 1000) {
        let request = MKLocalSearch.Request()
        request.naturalLanguageQuery = query
        request.region = MKCoordinateRegion(
            center: mapView.userLocation.coordinate,
            latitudinalMeters: radius,
            longitudinalMeters: radius
        )
        MKLocalSearch(request: request).start { response, error in
            guard let items = response?.mapItems else { return }
            items.forEach { self.addAnnotation(
                at: $0.placemark.coordinate,
                title: $0.name ?? "",
                subtitle: $0.placemark.title
            )}
        }
    }

    private func requestLocationPermission() {
        locationManager.requestWhenInUseAuthorization()
    }
}

extension MapManager: MKMapViewDelegate {
    func mapView(_ mapView: MKMapView, viewFor annotation: MKAnnotation) -> MKAnnotationView? {
        guard !(annotation is MKUserLocation) else { return nil }
        let id = "marker"
        let view = mapView.dequeueReusableAnnotationView(withIdentifier: id)
            as? MKMarkerAnnotationView ?? MKMarkerAnnotationView(annotation: annotation, reuseIdentifier: id)
        view.canShowCallout = true
        view.animatesWhenAdded = true
        return view
    }
}
```

### Google Maps (Android) Pattern
```kotlin
class MapHelper(private val googleMap: GoogleMap) {
    private val markerMap = mutableMapOf<String, Marker>()

    fun configure() {
        googleMap.uiSettings.apply {
            isZoomControlsEnabled = true
            isCompassEnabled = true
            isMapToolbarEnabled = true
            isMyLocationButtonEnabled = true
        }
        googleMap.setMinZoomPreference(5f)
        googleMap.setMaxZoomPreference(20f)
    }

    fun addMarker(id: String, latLng: LatLng, title: String, snippet: String? = null) {
        val marker = googleMap.addMarker(
            MarkerOptions()
                .position(latLng)
                .title(title)
                .snippet(snippet)
                .icon(BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_RED))
        )
        marker?.tag = id
        marker?.let { markerMap[id] = it }
    }

    fun animateToLocation(latLng: LatLng, zoom: Float = 15f) {
        googleMap.animateCamera(
            CameraUpdateFactory.newLatLngZoom(latLng, zoom),
            500,
            null
        )
    }

    fun drawRoute(points: List<LatLng>, color: Int = 0xFF0000FF.toInt(), width: Float = 5f) {
        googleMap.addPolyline(
            PolylineOptions()
                .addAll(points)
                .color(color)
                .width(width)
                .geodesic(true)
        )
    }
}
```

## Location Services

### Permission Handling
```
iOS:
  - NSLocationWhenInUseUsageDescription (foreground only)
  - NSLocationAlwaysUsageDescription (background tracking)
  - CLLocationManager.requestWhenInUseAuthorization()
  - CLLocationManager.requestAlwaysAuthorization()

Android:
  - ACCESS_FINE_LOCATION (GPS precise)
  - ACCESS_COARSE_LOCATION (WiFi/cell approximate)
  - ACCESS_BACKGROUND_LOCATION (background, Android 10+)
  - Request at runtime (Android 6+)
  - Check LocationManager.isProviderEnabled()

Web:
  - navigator.permissions.query({ name: 'geolocation' })
  - navigator.geolocation.getCurrentPosition()
  - navigator.geolocation.watchPosition()
```

### Background Location Tracking
```swift
// iOS background tracking
locationManager.allowsBackgroundLocationUpdates = true
locationManager.pausesLocationUpdatesAutomatically = true
locationManager.activityType = .fitness  // or .automotiveNavigation

// Significant-change location service (battery efficient)
locationManager.startMonitoringSignificantLocationChanges()
```

## Web Map Integration

### Leaflet Pattern
```javascript
import L from 'leaflet';

const map = L.map('map').setView([51.505, -0.09], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors',
  maxZoom: 19,
}).addTo(map);

const marker = L.marker([51.5, -0.09])
  .bindPopup('A pretty popup.')
  .addTo(map);

// Geolocation
map.locate({ setView: true, maxZoom: 16 });
map.on('locationfound', (e) => {
  L.marker(e.latlng).addTo(map).bindPopup('You are here').openPopup();
});
```

## Key Anti-Patterns
- **Hardcoding API keys**: Use environment variables or secure storage
- **Requesting location on app launch without context**: Ask when feature needs it
- **Not handling permission denial gracefully**: Show explanation, not crash
- **Too many markers without clustering**: Causes performance issues over ~500 markers
- **No offline fallback**: Cache tiles or show empty state gracefully
- **Excessive location polling**: Drains battery; use significant-change or appropriate intervals
- **Not setting map bounds**: Always constrain visible area
- **Ignoring map tile attribution**: Required by OpenStreetMap terms
- **No map region limits**: Prevents users from getting lost in empty areas
- **Accessing location on main thread**: Always use async location APIs

## Implementation Patterns

### Reactive Location Provider (Swift)

```swift
import CoreLocation
import Combine

class ReactiveLocationProvider: NSObject {
    private let manager = CLLocationManager()
    private let subject = PassthroughSubject<CLLocation, Error>()
    
    var publisher: AnyPublisher<CLLocation, Error> {
        subject.eraseToAnyPublisher()
    }
    
    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBest
        manager.distanceFilter = 10
    }
    
    func start(background: Bool = false) {
        let status = manager.authorizationStatus
        switch status {
        case .notDetermined:
            manager.requestWhenInUseAuthorization()
        case .authorizedWhenInUse where background:
            manager.requestAlwaysAuthorization()
        case .authorizedAlways, .authorizedWhenInUse:
            manager.startUpdatingLocation()
        case .denied, .restricted:
            subject.send(completion: .failure(LocationError.denied))
        @unknown default:
            break
        }
    }
    
    func stop() {
        manager.stopUpdatingLocation()
    }
}

extension ReactiveLocationProvider: CLLocationManagerDelegate {
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        subject.send(location)
    }
    
    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        subject.send(completion: .failure(error))
    }
}
```

### Geocoding Service (Cross-Platform)

```python
from typing import Optional, Tuple
import aiohttp
import asyncio

class GeocodingService:
    def __init__(self, provider: str = "nominatim", api_key: Optional[str] = None):
        self.provider = provider
        self.api_key = api_key
        self.session: Optional[aiohttp.ClientSession] = None

    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self

    async def __aexit__(self, *args):
        await self.session.close()

    async def geocode(self, address: str) -> Optional[Tuple[float, float]]:
        if self.provider == "nominatim":
            url = "https://nominatim.openstreetmap.org/search"
            params = {"q": address, "format": "json", "limit": 1}
            headers = {"User-Agent": "LocationSkill/1.0"}
        elif self.provider == "google":
            url = "https://maps.googleapis.com/maps/api/geocode/json"
            params = {"address": address, "key": self.api_key}
            headers = {}
        else:
            raise ValueError(f"Unknown provider: {self.provider}")

        async with self.session.get(url, params=params, headers=headers) as resp:
            data = await resp.json()
            if self.provider == "nominatim" and data:
                return (float(data[0]["lat"]), float(data[0]["lon"]))
            elif self.provider == "google" and data.get("results"):
                loc = data["results"][0]["geometry"]["location"]
                return (loc["lat"], loc["lng"])
            return None

    async def reverse_geocode(self, lat: float, lng: float) -> Optional[str]:
        if self.provider == "nominatim":
            url = "https://nominatim.openstreetmap.org/reverse"
            params = {"lat": lat, "lon": lng, "format": "json"}
        elif self.provider == "google":
            url = "https://maps.googleapis.com/maps/api/geocode/json"
            params = {"latlng": f"{lat},{lng}", "key": self.api_key}
        else:
            raise ValueError(f"Unknown provider: {self.provider}")

        async with self.session.get(url, params=params) as resp:
            data = await resp.json()
            if self.provider == "nominatim" and data:
                return data.get("display_address")
            elif self.provider == "google" and data.get("results"):
                return data["results"][0]["formatted_address"]
            return None
```

### Marker Clustering Algorithm

```typescript
interface MapPoint {
  lat: number;
  lng: number;
  data: any;
}

class MarkerCluster {
  private grid: Map<string, MapPoint[]> = new Map();
  private gridSize: number;

  constructor(gridSize: number = 0.01) {
    this.gridSize = gridSize;
  }

  addMarker(point: MapPoint): void {
    const key = this.getGridKey(point.lat, point.lng);
    const cluster = this.grid.get(key) || [];
    cluster.push(point);
    this.grid.set(key, cluster);
  }

  private getGridKey(lat: number, lng: number): string {
    const latIdx = Math.floor(lat / this.gridSize);
    const lngIdx = Math.floor(lng / this.gridSize);
    return `${latIdx}:${lngIdx}`;
  }

  getClusters(zoom: number): Array<{ center: MapPoint; count: number }> {
    const adjustedSize = this.gridSize * Math.pow(2, 15 - zoom);
    const clusters: Array<{ center: MapPoint; count: number }> = [];

    for (const [, points] of this.grid) {
      if (points.length === 1) {
        clusters.push({ center: points[0], count: 1 });
      } else {
        const avgLat = points.reduce((s, p) => s + p.lat, 0) / points.length;
        const avgLng = points.reduce((s, p) => s + p.lng, 0) / points.length;
        clusters.push({
          center: { lat: avgLat, lng: avgLng, data: null },
          count: points.length,
        });
      }
    }
    return clusters;
  }
}
```

### Route Optimization (TSP Solver)

```typescript
interface LatLng {
  lat: number;
  lng: number;
}

function haversineDistance(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const aVal = sinDLat * sinDLat +
    Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) *
    sinDLng * sinDLng;
  return R * 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
}

function optimizeRoute(points: LatLng[], startIndex: number = 0): LatLng[] {
  const remaining = [...points];
  const route: LatLng[] = [remaining.splice(startIndex, 1)[0]];
  
  while (remaining.length > 0) {
    const last = route[route.length - 1];
    let nearestIdx = 0;
    let minDist = Infinity;
    
    for (let i = 0; i < remaining.length; i++) {
      const dist = haversineDistance(last, remaining[i]);
      if (dist < minDist) {
        minDist = dist;
        nearestIdx = i;
      }
    }
    route.push(remaining.splice(nearestIdx, 1)[0]);
  }
  return route;
}
```

## Production Considerations

- **Map tile caching**: Cache map tiles locally (LRU cache of 500MB max) to reduce network requests by 60-80% on repeated views. Set appropriate cache-control headers on tile server responses.
- **Location accuracy vs. battery**: Use significant-change location service for non-navigation apps. For navigation, reduce update frequency to 1 update per 5 seconds when moving, stop updates when stationary.
- **Offline maps strategy**: Download map regions at 2 zoom levels above minimum required. Use vector tiles (MBTiles format) for efficient offline storage. Pre-cache geocoding results for common queries.
- **Map load performance**: Lazy-load map SDKs (dynamic import) to avoid impacting initial page load. Pre-initialize the map view with a low-zoom default before animating to user location.
- **API rate limiting**: Geocoding APIs have strict rate limits (2-50 req/s). Implement a client-side token bucket and queue requests during rapid pan operations.

## Security Considerations

- **API key protection**: Never embed map API keys in client-side code. Use proxy endpoints or key restriction by HTTP referrer/application bundle ID.
- **Location data privacy**: User location is PII in GDPR/CCPA. Anonymize location data by reducing precision (round to 3 decimal places ~111m) before storing or transmitting.
- **Geofencing consent**: Implement explicit user consent flows for geofencing features. Store consent receipts with timestamps for compliance audits.
- **Map data attribution**: Map data (OpenStreetMap, etc.) requires attribution. Display attribution in a non-removable location on the map view.
- **Reverse geocoding data exposure**: Reverse geocoding can reveal home addresses from coordinates. Cache results server-side to avoid leaking address patterns through timing attacks.

## Anti-Patterns Expanded

| Anti-Pattern | Why It Fails | Correct Approach |
|---|---|---|
| Hardcoding API keys in source code | Keys committed to git, exposed in compiled apps | Use environment variables or secure keychain services |
| Requesting location on app launch without context | Users deny permissions when unsure why needed | Request location when a specific feature requires it, with explanation |
| Not handling permission denial gracefully | App crashes or shows blank map | Show explanation card with settings deep-link |
| Too many markers without clustering | Browser/device freezes beyond ~500 markers | Use clustering (grid-based or distance-based) for >100 markers |
| No offline fallback for maps | Blank screen when network is unavailable | Cache tile data and show stale tiles with freshness indicator |
| Excessive location polling | Battery drain (GPS uses 300mW+ continuous) | Use significant-change or region monitoring for most use cases |
| Not setting map bounds and max zoom | Users can pan into empty ocean areas | Constrain visible region and zoom levels (min/max) |
| Accessing location APIs on main thread | UI freezes during location lookup | Always use async methods and delegate callbacks |
| No throttle on map region change handlers | Performance degradation during rapid panning | Debounce region change handlers by 300-500ms |
| Ignoring tile usage limits | Unexpected billing from tile provider | Set tile request budget and use caching aggressively |

## Performance Optimization

- **Vector tiles over raster tiles**: Vector tiles are 60-80% smaller than raster tiles and render faster on GPU-accelerated devices.
- **Viewport-based rendering**: Only render markers and overlays within the current visible viewport. Cull objects more than 2x the viewport extent.
- **Canvas rendering for heatmaps**: Use Canvas API (not DOM markers) for data visualizations with >1000 points. Enable hardware acceleration.
- **Prefetch tiles at lower zoom**: When user stops panning, prefetch tiles at 1-2 zoom levels higher for smooth zoom-in experience.
- **Cluster on the server**: For large datasets (>10K markers), pre-compute clusters on the server and return clustered data based on viewport bounds.
- **Simplify polylines**: Use the Ramer-Douglas-Peucker algorithm to reduce polyline vertex count by 70-90% without visible quality loss.
- **Lazy-load POI details**: Show marker popups with placeholder data first, then fetch details asynchronously. Cache POI responses in local storage.
