# Map Integration

## Overview
Map integration provides location-based features across iOS (MapKit), Android (Google Maps), and Web (Leaflet/Mapbox). This reference covers SDK setup, annotations, geocoding, routing, clustering, and performance optimization.

## Platform-Specific Setup

### MapKit (iOS)
```swift
import MapKit
import CoreLocation

class MapViewController: UIViewController {
    @IBOutlet weak var mapView: MKMapView!
    private let locationManager = CLLocationManager()

    override func viewDidLoad() {
        super.viewDidLoad()
        mapView.delegate = self
        mapView.showsUserLocation = true
        mapView.showsCompass = true
        mapView.showsScale = true
        mapView.showsTraffic = true
        mapView.showsBuildings = true
        mapView.pointOfInterestFilter = .includingAll
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyBest
        setupInitialRegion()
    }

    func setupInitialRegion() {
        let center = CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4194)
        let span = MKCoordinateSpan(latitudeDelta: 0.05, longitudeDelta: 0.05)
        mapView.setRegion(MKCoordinateRegion(center: center, span: span), animated: false)
    }

    func setRegion(center: CLLocationCoordinate2D, radius: CLLocationDistance) {
        let region = MKCoordinateRegion(
            center: center,
            latitudinalMeters: radius,
            longitudinalMeters: radius
        )
        mapView.setRegion(region, animated: true)
    }

    func searchLocation(query: String) {
        let request = MKLocalSearch.Request()
        request.naturalLanguageQuery = query
        request.region = mapView.region
        request.resultTypes = [.pointOfInterest, .address]

        let search = MKLocalSearch(request: request)
        search.start { response, error in
            guard let response = response else {
                self.showSearchError(error)
                return
            }
            self.mapView.removeAnnotations(self.mapView.annotations)
            for item in response.mapItems {
                self.addAnnotation(item: item)
            }
            if let first = response.mapItems.first {
                self.setRegion(center: first.placemark.coordinate, radius: 1000)
            }
        }
    }

    func addAnnotation(item: MKMapItem) {
        let annotation = MKPointAnnotation()
        annotation.title = item.name
        annotation.subtitle = item.placemark.title
        annotation.coordinate = item.placemark.coordinate
        mapView.addAnnotation(annotation)
    }

    func drawRoute(from: CLLocationCoordinate2D, to: CLLocationCoordinate2D) {
        let request = MKDirections.Request()
        request.source = MKMapItem(placemark: MKPlacemark(coordinate: from))
        request.destination = MKMapItem(placemark: MKPlacemark(coordinate: to))
        request.transportType = .automobile
        request.requestsAlternateRoutes = true

        MKDirections(request: request).calculate { response, error in
            guard let route = response?.routes.first else { return }
            self.mapView.addOverlay(route.polyline, level: .aboveRoads)
            self.mapView.setVisibleMapRect(
                route.polyline.boundingMapRect,
                edgePadding: UIEdgeInsets(top: 50, left: 50, bottom: 50, right: 50),
                animated: true
            )
        }
    }
}

extension MapViewController: MKMapViewDelegate {
    func mapView(_ mapView: MKMapView, viewFor annotation: MKAnnotation) -> MKAnnotationView? {
        guard !(annotation is MKUserLocation) else { return nil }
        let id = "PinAnnotation"
        var view = mapView.dequeueReusableAnnotationView(withIdentifier: id) as? MKMarkerAnnotationView
        if view == nil {
            view = MKMarkerAnnotationView(annotation: annotation, reuseIdentifier: id)
            view?.canShowCallout = true
            view?.rightCalloutAccessoryView = UIButton(type: .detailDisclosure)
            view?.animatesWhenAdded = true
            view?.clusteringIdentifier = "cluster"
        }
        view?.annotation = annotation
        return view
    }

    func mapView(_ mapView: MKMapView, rendererFor overlay: MKOverlay) -> MKOverlayRenderer {
        if let polyline = overlay as? MKPolyline {
            let renderer = MKPolylineRenderer(polyline: polyline)
            renderer.strokeColor = .systemBlue
            renderer.lineWidth = 4
            return renderer
        }
        return MKOverlayRenderer(overlay: overlay)
    }
}

extension MapViewController: CLLocationManagerDelegate {
    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        switch manager.authorizationStatus {
        case .authorizedWhenInUse, .authorizedAlways:
            manager.startUpdatingLocation()
        case .denied, .restricted:
            showLocationPermissionAlert()
        case .notDetermined:
            manager.requestWhenInUseAuthorization()
        @unknown default:
            break
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        // Update map region or track user position
        let camera = MKMapCamera(lookingAtCenter: location.coordinate, fromDistance: 1000, pitch: 0, heading: 0)
        mapView.setCamera(camera, animated: true)
    }
}
```

### Google Maps (Android)
```kotlin
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.OnMapReadyCallback
import com.google.android.gms.maps.SupportMapFragment
import com.google.android.gms.maps.model.*
import com.google.android.gms.location.*

class MapActivity : AppCompatActivity(), OnMapReadyCallback {
    private lateinit var googleMap: GoogleMap
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private val markers = mutableListOf<Marker>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_map)
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        val mapFragment = supportFragmentManager.findFragmentById(R.id.map) as SupportMapFragment
        mapFragment.getMapAsync(this)
    }

    override fun onMapReady(map: GoogleMap) {
        googleMap = map
        googleMap.uiSettings.apply {
            isZoomControlsEnabled = true
            isCompassEnabled = true
            isMyLocationButtonEnabled = true
            isMapToolbarEnabled = true
            isRotateGesturesEnabled = true
            isScrollGesturesEnabled = true
            isTiltGesturesEnabled = true
        }
        googleMap.setMinZoomPreference(5f)
        googleMap.setMaxZoomPreference(20f)
        googleMap.setOnMapClickListener { latLng -> addMarker(latLng, "Selected Location") }
        googleMap.setOnMarkerClickListener { marker ->
            showInfoWindow(marker)
            true
        }
        googleMap.setOnInfoWindowClickListener { marker ->
            openDetailView(marker)
        }
        enableMyLocation()
    }

    private fun addMarker(position: LatLng, title: String, snippet: String? = null): Marker {
        val marker = googleMap.addMarker(
            MarkerOptions()
                .position(position)
                .title(title)
                .snippet(snippet)
                .icon(BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_RED))
                .alpha(0.9f)
                .anchor(0.5f, 1.0f)
        )
        markers.add(marker!!)
        return marker
    }

    private fun addClusteredMarkers(positions: List<LatLng>) {
        // For production, use Google Maps Clustering library
        // implementation 'com.google.maps.android:android-maps-utils:3.5+'
        if (positions.size > 50) {
            // Enable cluster manager
            val clusterManager = ClusterManager<MyClusterItem>(this, googleMap)
            googleMap.setOnCameraIdleListener(clusterManager)
            positions.forEach { pos ->
                clusterManager.addItem(MyClusterItem(pos.lat, pos.lng, "Title", "Snippet"))
            }
            clusterManager.cluster()
        } else {
            positions.forEach { addMarker(it, "Location") }
        }
    }

    private fun drawPolyline(points: List<LatLng>, color: Int = 0xFF2196F3.toInt()) {
        googleMap.addPolyline(
            PolylineOptions()
                .addAll(points)
                .color(color)
                .width(6f)
                .jointType(JointType.ROUND)
                .startCap(SquareCap())
                .endCap(ButtCap())
        )
    }

    private fun drawPolygon(points: List<LatLng>, fillColor: Int, strokeColor: Int) {
        googleMap.addPolygon(
            PolygonOptions()
                .addAll(points)
                .fillColor(fillColor)
                .strokeColor(strokeColor)
                .strokeWidth(2f)
        )
    }

    private fun enableMyLocation() {
        if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
            googleMap.isMyLocationEnabled = true
            fusedLocationClient.lastLocation.addOnSuccessListener { location ->
                location?.let {
                    val latLng = LatLng(it.latitude, it.longitude)
                    googleMap.moveCamera(CameraUpdateFactory.newLatLngZoom(latLng, 15f))
                }
            }
        } else {
            requestPermissions(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION), LOCATION_PERMISSION_CODE)
        }
    }
}
```

## Geocoding

### Forward Geocoding (Address -> Coordinates)
```swift
// iOS
let geocoder = CLGeocoder()
geocoder.geocodeAddressString("1600 Amphitheatre Parkway, Mountain View, CA") { placemarks, error in
    guard let placemark = placemarks?.first else { return }
    let coordinate = placemark.location?.coordinate
}

// Android
val geocoder = Geocoder(this, Locale.getDefault())
val addresses = geocoder.getFromLocationName("1600 Amphitheatre Parkway, Mountain View, CA", 1)
addresses?.first?.let { address ->
    val lat = address.latitude
    val lng = address.longitude
}
```

### Reverse Geocoding (Coordinates -> Address)
```swift
// iOS
let location = CLLocation(latitude: 37.7749, longitude: -122.4194)
geocoder.reverseGeocodeLocation(location) { placemarks, error in
    guard let placemark = placemarks?.first else { return }
    let address = [
        placemark.subThoroughfare,
        placemark.thoroughfare,
        placemark.locality,
        placemark.administrativeArea,
        placemark.postalCode,
        placemark.country
    ].compactMap { $0 }.joined(separator: ", ")
}

// Android
val addresses = geocoder.getFromLocation(37.7749, -122.4194, 1)
addresses?.first?.let { address ->
    val fullAddress = (0..address.maxAddressLineIndex).map { address.getAddressLine(it) }
}
```

## Map Gesture Handling
- **Pan**: Default 2-finger drag
- **Zoom**: Pinch to zoom, double-tap zoom in, 2-finger tap zoom out
- **Rotate**: 2-finger rotate gesture
- **Tilt**: 2-finger vertical swipe
- **Click**: Single tap to place marker or trigger action
- **Long press**: Context menu or custom action
- **Custom gestures**: Use UIGestureRecognizer (iOS) or setOnGestureListener (Android)

## Performance Optimization

### Annotation/Marker Management
- Use **clustering** for >50 markers: `MKClusterAnnotation` (iOS), `ClusterManager` (Android)
- **Canvas markers** for Web: Use canvas-based rendering for thousands of markers
- **Viewport filtering**: Only show markers in current visible region
- **Lazy loading**: Load markers on region change, not all at once
- **Marker pooling**: Reuse marker views instead of creating new ones

### Tile Caching
```swift
// iOS tile overlay
let template = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
let overlay = MKTileOverlay(urlTemplate: template)
overlay.canReplaceMapContent = false
mapView.addOverlay(overlay, level: .aboveLabels)
```

### Battery Optimization for Location
- Use **significant-change** location service for background
- Set appropriate **distance filter** (not every meter)
- Use **region monitoring** instead of continuous GPS
- Batch location updates and process periodically
- Stop location updates when app goes to background (unless navigation)

## Key Points
- Request location permissions before accessing location in context
- Use MapKit on iOS and Google Maps on Android (native SDKs)
- Web maps: Leaflet (free, lightweight) or Mapbox GL (custom styling)
- Cross-platform: Mapbox GL for unified API across platforms
- Show user location with appropriate accuracy level
- Implement custom annotations and markers with callouts
- Use clustering for large numbers of annotations (>50)
- Support map gesture controls: zoom, pan, rotate, tilt
- Implement search with MKLocalSearch (iOS) or Places API (Android)
- Show callout views with additional information on marker tap
- Handle map region changes for responsive search and loading
- Draw polylines for routes and polygons for areas
- Use heat maps for data density visualization (Google Maps Utils)
- Cache map tiles for offline use (when needed)
- Implement geocoding for address <-> coordinate conversion
- Handle location permission denial with user-friendly messaging
- Debounce region change callbacks to avoid excessive API calls
- Use GeoJSON for complex geographic data structures
- Combine map with camera for augmented reality views

## Key Anti-Patterns
- **Requesting location on launch without context**: Ask when feature needs it
- **No clustering at scale**: Thousands of markers without clustering crashes
- **Hardcoded API keys**: Use environment variables or secure storage
- **Missing error handling for network failures**: Show cached tiles gracefully
- **Not optimizing for battery**: Continuous GPS drains battery fast
- **Ignoring safe area/notch**: Map controls hidden behind UI elements
- **Not handling map reuse correctly**: Memory leaks from unremoved observers
