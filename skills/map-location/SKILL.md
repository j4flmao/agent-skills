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
