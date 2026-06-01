---
name: mobile-map-location
description: >
  Use this skill when the user says 'maps', 'location', 'map view',
  'geolocation', 'GPS', 'MapKit', 'Google Maps', 'map marker',
  'map annotation', 'location service', 'geocoding', 'reverse geocoding'.
  Integrate maps, location tracking, geofencing, and geocoding in mobile apps.
  Do NOT use for: backend location processing or web maps.
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
No preamble. No postamble. No explanations.

### Completion Criteria
- Map renders with correct region and zoom
- Markers display with clustering for >25 pins
- Location permission flow works with proper fallback
- Location updates deliver at expected interval
- Geocoding returns results with caching

### Max Response Length
6000 tokens

## Decision Trees

### Map SDK Selection
```
Cross-platform need?
├── iOS only → Apple MapKit (free, no API key, native SwiftUI/UIKit)
├── iOS + Android
│   ├── Free, no API key → MapLibre (open-source, self-host tiles)
│   ├── Rich features, Places, routing → Google Maps
│   └── Navigation SDK, traffic → Mapbox (paid after free tier)
├── Flutter → flutter_map (MapLibre) or google_maps_flutter
└── React Native → react-native-maps (Apple/Google) or MapLibre GL
```

### Location Permission Strategy
```
What location does the feature need?
├── One-time location (weather, nearby places)
│   └── requestWhenInUseAuthorization (iOS) / ACCESS_FINE_LOCATION (Android)
├── Continuous foreground tracking (ride-hailing, fitness)
│   └── requestWhenInUseAuthorization + background mode explanation
├── Background geofencing (arrival/departure triggers)
│   └── requestAlwaysAuthorization (iOS) / ACCESS_BACKGROUND_LOCATION (Android)
│   ├── iOS: must enable Background Modes > Location updates
│   └── Android: request BACKGROUND after FOREGROUND is granted
└── Approximate location only (city-level content)
    └── requestTemporaryFullAccuracyAuthorization (iOS) / ACCESS_COARSE_LOCATION
```

### Location Tracking Mode
```
What accuracy is needed?
├── Navigation, turn-by-turn → kCLLocationAccuracyBest / PRIORITY_HIGH_ACCURACY
│   └── 1-2 sec interval, high battery drain
├── Nearby places, weather → kCLLocationAccuracyHundredMeters / PRIORITY_BALANCED
│   └── 30-60 sec interval, moderate battery
├── City-level badges → significant-change / PRIORITY_LOW_POWER
│   └── 500m+ changes, very efficient
└── Region entry/exit → startMonitoringForRegion / GeofencingClient
    └── ≥100m radius (iOS), max 20 regions (iOS)
```

### Clustering Strategy
```
How many markers?
├── < 25 markers → Individual annotations (no clustering needed)
├── 25-500 markers → Platform clustering API
├── 500-5000 markers → Custom clustering with quad-tree
└── > 5000 markers → Server-side clustering + viewport filtering
```

## Workflow

### 1. Map SDK Selection
Four major map SDKs with different tradeoffs:
- **Apple MapKit**: iOS-only, free (no API key), smooth SwiftUI `Map` and UIKit `MKMapView`, flyover 3D, LookAround, limited customization
- **Google Maps**: Cross-platform, rich features (indoor maps, Street View, Places), requires API key with billing, JSON styling, directions API, Places API
- **MapLibre**: Open-source Mapbox GL fork, custom style JSON, self-hosted tiles, no API key, privacy-focused
- **Mapbox**: Custom styling, Navigation SDK, real-time traffic, pricing based on map loads

### 2. Location Permissions
Two-tier permission model on both platforms:
- iOS: `requestWhenInUseAuthorization` (foreground) vs `requestAlwaysAuthorization` (background+foreground). Keys: `NSLocationWhenInUseUsageDescription`, `NSLocationAlwaysAndWhenInUseUsageDescription`, `NSLocationTemporaryUsageDescriptionDictionary` (iOS 14+ for precise vs approximate)
- Android: `ACCESS_FINE_LOCATION` (GPS+network, precise), `ACCESS_COARSE_LOCATION` (network only, ~100m), `ACCESS_BACKGROUND_LOCATION` (must request after foreground permission is granted, Android 10+)

### 3. Map Display with Markers and Clustering
Map view configuration: initial camera position (lat/lng/zoom), min/max zoom limits, map type (standard, satellite, hybrid, terrain). Markers with title/subtitle/custom icon. Clustering for 25+ markers. Polylines for routes, polygons for areas, ground overlays.

### 4. Location Tracking Strategies
Four tracking modes: continuous high-accuracy, balanced, significant-change, region monitoring (geofencing).

### 5. Geocoding
Forward geocoding: address → coordinate. Reverse geocoding: coordinate → address. Cache results with TTL.

### 6. Map Customization and Gestures
Style customization, gesture management, map padding, animated camera updates.

## Map SDK Comparison

| Feature | MapKit | Google Maps | MapLibre | Mapbox |
|---|---|---|---|---|
| iOS | Native | Yes | Yes | Yes |
| Android | No | Yes | Yes | Yes |
| API key | No | Yes | No | Yes |
| Offline tiles | Limited | Yes (paid) | Yes | Yes (paid) |
| Custom style | Limited | Full (JSON) | Full (JSON) | Full (JSON) |
| Navigation SDK | No | Yes (paid) | No | Yes |
| Routing | Yes | Yes (paid) | Via OSRM | Yes |
| Places API | No | Yes (paid) | No | Yes |
| Cost | Free | Usage-based | Free | Usage-based |

## Implementation

### MapKit (iOS — SwiftUI)
```swift
import MapKit

struct MapView: View {
  @State private var region = MKCoordinateRegion(
    center: CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4194),
    span: MKCoordinateSpan(latitudeDelta: 0.05, longitudeDelta: 0.05)
  )
  @State private var selectedMarker: MarkerData?

  let locations: [MarkerData]

  var body: some View {
    Map(initialPosition: .region(region)) {
      ForEach(locations) { location in
        Marker(location.name, coordinate: location.coordinate)
          .tint(.red)

        if location == selectedMarker {
          Annotation(location.name, coordinate: location.coordinate) {
            VStack {
              Image(systemName: "star.fill")
              Text(location.subtitle).font(.caption)
            }
            .padding(8)
            .background(.ultraThinMaterial)
            .cornerRadius(8)
          }
        }
      }
    }
    .mapStyle(.standard)
    .mapControls {
      MapUserLocationButton()
      MapCompass()
      MapScaleView()
    }
  }
}
```

### MapKit (iOS — UIKit)
```swift
import MapKit

class MapViewController: UIViewController {
  let mapView = MKMapView()

  override func viewDidLoad() {
    super.viewDidLoad()
    view.addSubview(mapView)
    mapView.frame = view.bounds
    mapView.delegate = self
    mapView.showsUserLocation = true

    // Initial region
    let center = CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4194)
    mapView.setRegion(MKCoordinateRegion(center: center, latitudinalMeters: 1000, longitudinalMeters: 1000), animated: false)
  }
}

// Clustering with MKClusterAnnotation
extension MapViewController: MKMapViewDelegate {
  func mapView(_ mapView: MKMapView, viewFor annotation: MKAnnotation) -> MKAnnotationView? {
    if let cluster = annotation as? MKClusterAnnotation {
      let view = MKMarkerAnnotationView(annotation: cluster, reuseIdentifier: "cluster")
      view.glyphText = "\(cluster.memberAnnotations.count)"
      view.markerTintColor = .systemBlue
      return view
    }
    if let place = annotation as? PlaceAnnotation {
      let view = MKMarkerAnnotationView(annotation: place, reuseIdentifier: "marker")
      view.canShowCallout = true
      view.markerTintColor = .red
      return view
    }
    return nil
  }
}
```

### Google Maps (Android — Kotlin)
```kotlin
class MapActivity : AppCompatActivity(), OnMapReadyCallback {
  private lateinit var map: GoogleMap
  private lateinit var clusteringManager: ClusterManager<PlaceItem>

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContentView(R.layout.activity_map)
    val mapFragment = supportFragmentManager.findFragmentById(R.id.map) as SupportMapFragment
    mapFragment.getMapAsync(this)
  }

  override fun onMapReady(googleMap: GoogleMap) {
    map = googleMap
    map.uiSettings.isZoomControlsEnabled = true
    map.setMinZoomPreference(10f)

    // Enable clustering
    clusteringManager = ClusterManager(this, map)
    map.setOnCameraIdleListener(clusteringManager)
    map.setOnMarkerClickListener(clusteringManager)

    // Add items
    val items = fetchPlaces()
    clusteringManager.addItems(items.map { PlaceItem(it.lat, it.lng, it.name, it.snippet) })
    clusteringManager.cluster()

    // Custom cluster renderer
    clusteringManager.renderer = PlaceClusterRenderer(this, map, clusteringManager)
  }
}

// Custom cluster renderer
class PlaceClusterRenderer(
  context: Context, map: GoogleMap, clusterManager: ClusterManager<PlaceItem>
) : DefaultClusterRenderer<PlaceItem>(context, map, clusterManager) {
  override fun onBeforeClusterItemRendered(item: PlaceItem, markerOptions: MarkerOptions) {
    markerOptions.title(item.title).snippet(item.snippet)
      .icon(BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_RED))
  }

  override fun onBeforeClusterRendered(cluster: Cluster<PlaceItem>, markerOptions: MarkerOptions) {
    markerOptions.title("${cluster.size} places")
      .icon(BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_BLUE))
  }
}
```

### Google Maps (iOS — UIKit)
```swift
import GoogleMaps

class MapViewController: UIViewController {
  var mapView: GMSMapView!

  override func viewDidLoad() {
    super.viewDidLoad()
    let camera = GMSCameraPosition(latitude: 37.7749, longitude: -122.4194, zoom: 12)
    mapView = GMSMapView(frame: view.bounds, camera: camera)
    mapView.settings.myLocationButton = true
    mapView.isMyLocationEnabled = true
    mapView.delegate = self
    view.addSubview(mapView)

    // Marker with clustering via GMUClusterManager
    let iconGenerator = GMUDefaultClusterIconGenerator()
    let algorithm = GMUNonHierarchicalDistanceBasedAlgorithm()
    let renderer = GMUDefaultClusterRenderer(mapView: mapView, clusterIconGenerator: iconGenerator)
    let clusterManager = GMUClusterManager(map: mapView, algorithm: algorithm, renderer: renderer)
    clusterManager.cluster()
  }
}
```

### MapLibre (Android)
```kotlin
import org.maplibre.android.maps.MapLibreMap
import org.maplibre.android.maps.Style
import org.maplibre.android.annotations.MarkerOptions

class MapLibreActivity : AppCompatActivity(), OnMapReadyCallback {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    MapLibre.getInstance(this)
    setContentView(R.layout.activity_maplibre)
    val mapView = findViewById<MapView>(R.id.mapView)
    mapView.onCreate(savedInstanceState)
    mapView.getMapAsync(this)
  }

  override fun onMapReady(map: MapLibreMap) {
    map.setStyle("https://demotiles.maplibre.org/style.json") {
      // Add markers via GeoJSON source
      map.addSource(
        GeoJsonSource("places", FeatureCollection.fromFeatures(listOf(
          Feature.fromGeometry(Point.fromLngLat(-122.4194, 37.7749))
        )))
      )
      map.addLayer(SymbolLayer("places-layer", "places").withProperties(
        PropertyFactory.iconImage("marker-15"),
        PropertyFactory.iconAllowOverlap(true)
      ))
    }
  }
}
```

### Flutter — google_maps_flutter
```dart
import 'package:google_maps_flutter/google_maps_flutter.dart';

class MapScreen extends StatefulWidget {
  @override
  State<MapScreen> createState() => MapScreenState();
}

class MapScreenState extends State<MapScreen> {
  GoogleMapController? controller;
  final Set<Marker> markers = {};
  final Set<Polygon> polygons = {};
  final Set<Polyline> polylines = {};

  static const _initial = CameraPosition(
    target: LatLng(37.7749, -122.4194),
    zoom: 12,
  );

  @override
  Widget build(BuildContext context) {
    return GoogleMap(
      initialCameraPosition: _initial,
      markers: markers,
      polygons: polygons,
      polylines: polylines,
      myLocationEnabled: true,
      myLocationButtonEnabled: true,
      mapType: MapType.normal,
      onMapCreated: (ctrl) => controller = ctrl,
      onTap: (latLng) => _addMarker(latLng),
    );
  }

  void _addMarker(LatLng point) {
    setState(() {
      markers.add(Marker(
        markerId: MarkerId(point.toString()),
        position: point,
        infoWindow: InfoWindow(title: "Marker", snippet: point.toString()),
        icon: BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.hueRed),
      ));
    });
  }
}
```

### React Native — react-native-maps
```tsx
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import { Cluster } from '@react-native-map/clustering';

function MapScreen() {
  const [region, setRegion] = useState({
    latitude: 37.7749,
    longitude: -122.4194,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  return (
    <MapView
      provider={PROVIDER_GOOGLE}
      initialRegion={region}
      showsUserLocation={true}
      mapType="standard"
    >
      <Cluster radius={50}>
        {places.map(place => (
          <Marker
            key={place.id}
            coordinate={{ latitude: place.lat, longitude: place.lng }}
            title={place.name}
            description={place.address}
          >
            <Callout>
              <View>
                <Text>{place.name}</Text>
                <Text>{place.address}</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </Cluster>
    </MapView>
  );
}
```

## Location Tracking

### iOS — CLLocationManager
```swift
import CoreLocation

class LocationService: NSObject, CLLocationManagerDelegate {
  let manager = CLLocationManager()

  override init() {
    super.init()
    manager.delegate = self
    manager.desiredAccuracy = kCLLocationAccuracyBest
    manager.distanceFilter = 10  // meters
    manager.allowsBackgroundLocationUpdates = true
    manager.pausesLocationUpdatesAutomatically = true
    manager.activityType = .fitness
  }

  func requestPermission() {
    manager.requestAlwaysAuthorization()
  }

  func startTracking() {
    manager.startUpdatingLocation()
  }

  func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    guard let loc = locations.last else { return }
    // Post notification or update state
    NotificationCenter.default.post(name: .locationUpdated, object: loc)
  }

  func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
    switch manager.authorizationStatus {
    case .authorizedAlways, .authorizedWhenInUse:
      manager.startUpdatingLocation()
    case .denied, .restricted:
      // Show settings redirect alert
      break
    case .notDetermined:
      break
    @unknown default:
      break
    }
  }
}
```

### Android — FusedLocationProviderClient
```kotlin
class LocationRepository(context: Context) {
  private val fusedLocationClient = LocationServices.getFusedLocationProviderClient(context)

  fun requestPermission(activity: Activity) {
    ActivityCompat.requestPermissions(
      activity,
      arrayOf(
        Manifest.permission.ACCESS_FINE_LOCATION,
        Manifest.permission.ACCESS_COARSE_LOCATION
      ),
      LOCATION_PERMISSION_REQUEST
    )
  }

  fun startLocationUpdates(lifecycleOwner: LifecycleOwner) {
    val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 5000)
      .setMinUpdateDistanceMeters(10f)
      .build()

    val callback = object : LocationCallback() {
      override fun onLocationResult(result: LocationResult) {
        result.lastLocation?.let { location ->
          // Post to ViewModel or repository
        }
      }
    }

    fusedLocationClient.requestLocationUpdates(
      request,
      callback,
      Looper.getMainLooper()
    ).addOnSuccessListener {
      // Updates started
    }
  }

  fun getLastLocation(): Task<Location> {
    return fusedLocationClient.lastLocation
  }
}
```

## Geofencing

### iOS — CLCircularRegion
```swift
func setupGeofence(at coordinate: CLLocationCoordinate2D, radius: CLLocationDistance, id: String) {
  guard CLLocationManager.isMonitoringAvailable(for: CLCircularRegion.self) else { return }
  let region = CLCircularRegion(center: coordinate, radius: radius, identifier: id)
  region.notifyOnEntry = true
  region.notifyOnExit = true
  manager.startMonitoring(for: region)
}

func locationManager(_ manager: CLLocationManager, didEnterRegion region: CLRegion) {
  guard let circularRegion = region as? CLCircularRegion else { return }
  // Trigger entry event
  NotificationManager.showLocalNotification("Arrived at \(circularRegion.identifier)")
}

func locationManager(_ manager: CLLocationManager, didExitRegion region: CLRegion) {
  guard let circularRegion = region as? CLCircularRegion else { return }
  // Trigger exit event
}

// iOS limit: max 20 simultaneous regions
// Radius minimum: ~100m actual effective minimum
```

### Android — GeofencingClient
```kotlin
class GeofenceRepository(context: Context) {
  private val geofencingClient = LocationServices.getGeofencingClient(context)

  fun addGeofence(lat: Double, lng: Double, radius: Float, id: String) {
    val geofence = Geofence.Builder()
      .setRequestId(id)
      .setCircularRegion(lat, lng, radius)
      .setExpirationDuration(Geofence.NEVER_EXPIRE)
      .setTransitionTypes(Geofence.GEOFENCE_TRANSITION_ENTER or Geofence.GEOFENCE_TRANSITION_EXIT)
      .build()

    val request = GeofencingRequest.Builder()
      .setInitialTrigger(GeofencingRequest.INITIAL_TRIGGER_ENTER)
      .addGeofence(geofence)
      .build()

    geofencingClient.addGeofences(request, geofencePendingIntent)
  }

  private val geofencePendingIntent: PendingIntent by lazy {
    val intent = Intent(context, GeofenceBroadcastReceiver::class.java)
    PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT)
  }
}

class GeofenceBroadcastReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    GeofencingEvent.fromIntent(intent)?.let { event ->
      if (event.hasError()) return@let
      event.triggeringGeofences?.forEach { geofence ->
        when (event.geofenceTransition) {
          Geofence.GEOFENCE_TRANSITION_ENTER -> {
            // Show notification
          }
          Geofence.GEOFENCE_TRANSITION_EXIT -> {
            // Clean up state
          }
        }
      }
    }
  }
}
```

## Geocoding

### iOS — CLGeocoder
```swift
import CoreLocation

class GeocodingService {
  private let geocoder = CLGeocoder()
  private var cache = NSCache<NSString, CLPlacemark>()

  func forwardGeocode(_ address: String) async throws -> CLLocationCoordinate2D? {
    if let cached = cache.object(forKey: address as NSString) {
      return cached.location?.coordinate
    }
    let placemarks = try await geocoder.geocodeAddressString(address)
    guard let placemark = placemarks.first else { return nil }
    cache.setObject(placemark, forKey: address as NSString)
    return placemark.location?.coordinate
    // Rate limit: MAX 1 request per second
  }

  func reverseGeocode(_ coordinate: CLLocationCoordinate2D) async throws -> String? {
    let location = CLLocation(latitude: coordinate.latitude, longitude: coordinate.longitude)
    let placemarks = try await geocoder.reverseGeocodeLocation(location)
    guard let placemark = placemarks.first else { return nil }
    return [placemark.subThoroughfare, placemark.thoroughfare, placemark.locality]
      .compactMap { $0 }
      .joined(separator: " ")
  }
}
```

### Android — Geocoder
```kotlin
class GeocodingRepository(private val context: Context) {
  private val cache = LruCache<String, Address>(100)

  fun forwardGeocode(address: String): List<Address> {
    cache.get(address)?.let { return listOf(it) }
    if (!Geocoder.isPresent()) return emptyList()

    val geocoder = Geocoder(context, Locale.getDefault())
    val addresses = geocoder.getFromLocationName(address, 5)
    addresses?.firstOrNull()?.let { cache.put(address, it) }
    return addresses.orEmpty()
  }

  fun reverseGeocode(lat: Double, lng: Double): String? {
    if (!Geocoder.isPresent()) return null

    val geocoder = Geocoder(context, Locale.getDefault())
    val addresses = geocoder.getFromLocation(lat, lng, 1)
    return addresses?.firstOrNull()?.let {
      "${it.getAddressLine(0)}"
    }
  }
}
```

## Map Styling

### Google Maps JSON Style
```json
{
  "style": "light",
  "elements": [
    {
      "featureType": "poi",
      "elementType": "labels",
      "stylers": [{"visibility": "off"}]
    },
    {
      "featureType": "road",
      "elementType": "geometry",
      "stylers": [{"color": "#ffffff"}]
    },
    {
      "featureType": "water",
      "elementType": "geometry",
      "stylers": [{"color": "#a0d8f1"}]
    },
    {
      "featureType": "landscape",
      "elementType": "geometry",
      "stylers": [{"color": "#f5f5f5"}]
    }
  ]
}
```

### MapKit Style Configuration
```swift
// SwiftUI
Map(initialPosition: .region(region))
  .mapStyle(.standard(elevation: .realistic, pointsOfInterest: .excludingAll))
  .mapStyle(.imagery)    // Satellite
  .mapStyle(.hybrid)

// UIKit
mapView.preferredConfiguration = MKStandardMapConfiguration(
  elevationStyle: .realistic,
  emphasisStyle: .muted
)
```

## Offline Maps

### MapLibre Offline
```kotlin
// MapLibre supports offline tiles natively
MapLibre.registerFileSource(context)
val offlineManager = MapLibre.getOfflineManager(context)

offlineManager.createOfflineRegion(
  OfflineTilePyramidRegionDefinition(
    styleUrl = "https://demotiles.maplibre.org/style.json",
    bounds = LatLngBounds.from(38.0, -123.0, 37.0, -122.0),
    minZoom = 10,
    maxZoom = 15,
    pixelRatio = 1.0f
  ),
  byteArrayOf()
) { region ->
  region.setDownloadState(OfflineRegion.STATE_ACTIVE)
}
```

### Google Maps Offline (Android)
```kotlin
val offlineManager = OfflineManager.getInstance(context)
offlineManager.createOfflineRegion(
  OfflineMapRegion(
    LatLngBounds(swLatLng, neLatLng),
    10,   // minZoom
    15    // maxZoom
  ),
  object : OfflineManager.OfflineRegionCallback { }
)
```

## Performance Considerations
- Cluster markers when count exceeds 25 — rendering degrades quadratically without it
- Use vector tiles over raster tiles for smoother zoom and smaller size
- Cache geocoding results with 24h TTL to reduce API costs and latency
- Limit visible markers to viewport bounds — remove markers outside visible region
- Use lightweight marker icons (vector drawables, not PNG bitmaps)
- Debounce map region change callbacks to avoid excessive API calls
- Pre-fetch tiles for likely regions (user's city, destination areas)
- For >1000 markers: use server-side clustering based on zoom level
- Monitor memory usage — heavy GeoJSON layers can cause OOM
- Disable unnecessary gesture recognizers when not needed
- Reduce animation duration for camera moves below 300ms

## Testing Location
- Test on real device — simulators provide limited/static location data
- Use GPX files for simulated route testing in Xcode
- Android: set mock location app in Developer Options for testing
- Test permission denial: partially grant, fully deny, grant then revoke
- Test background location with device asleep (iOS requires real device)
- Test geofence transitions with controlled location simulation
- Test low accuracy mode (approximate vs precise on iOS 14+)
- Test no GPS (airplane mode, WiFi-only tablet)

## Anti-Patterns
- **Requesting always authorization when when-in-use suffices**: Lowers App Store approval chances. Request minimum permission level
- **No permission rationale before system dialog**: User denies without context. Show custom dialog explaining why first
- **Region monitoring limit ignored**: iOS caps at 20 regions. Monitor larger encompassing regions
- **No geocoding rate limit**: CLGeocoder drops requests after 1/sec. Queue and throttle
- **Map UI freezes from heavy markers**: Large marker sets on main thread cause jank. Cluster and use lightweight annotations
- **Simulator-only testing**: Fails on real devices. Always test location on hardware
- **Background location without justification**: App Store rejection. Provide clear, user-facing reason
- **No fallback when location denied**: App grays out with no explanation. Show settings redirect with clear ask
- **Storing locations without user consent**: Privacy violation. State in permission string, allow deletion
- **Continuous tracking when app backgrounded unnecessarily**: Battery drain. Use significant-change or geofencing
- **No geocoding cache**: Every address lookup incurs cost/latency. Cache with TTL
- **Hardcoded API keys in client**: Google Maps key exposed. Restrict by bundle ID/package name in Cloud Console
- **Excessive marker animations**: Drains battery on map interaction. Limit animation to select markers

## References
- `references/geofencing-patterns.md` — Geofencing Patterns for Mobile
- `references/location-privacy.md` — Location Privacy
- `references/location-services.md` — Location Services
- `references/map-customization.md` — Map Customization
- `references/map-integration.md` — Map Integration
- `references/map-sdks.md` — Map SDKs

## Handoff
After map/location integration, hand off to:
- `mobile/universal/networking` — Offline map tile caching, Places API requests
- `mobile/universal/performance` — Map rendering optimization, clustering perf
- `mobile/universal/security` — API key restriction, location data privacy
- `mobile/universal/testing` — Location simulation testing
- `mobile/universal/camera-media` — AR location overlays
- `mobile/android` — Google Maps config, Play Services
- `mobile/ios` — MapKit, CoreLocation
