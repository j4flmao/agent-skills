# Map SDKs

## Map Provider Comparison

| Feature | MapKit | Google Maps | MapLibre | Mapbox |
|---------|--------|------------|----------|--------|
| iOS native | Full | SDK required | SDK required | SDK required |
| Android native | No | SDK required | SDK required | SDK required |
| API key | No | Required (billing) | No (self-hosted) | Required (billing) |
| Custom styling | Limited | JSON style | JSON style (GL) | JSON style (GL) |
| Offline tiles | Limited | Yes (paid) | Yes | Yes (paid) |
| Navigation | Directions API | Directions + Navigation | Via OSRM | Navigation SDK |
| Clustering | Built-in | Via utility lib | Built-in | Built-in |
| Indoor maps | Limited | Yes | No | No |
| Street View | LookAround | Yes | No | No |
| Geocoding | CLGeocoder | Geocoding API | Via Nominatim | Geocoding API |
| Cost | Free | Pay-as-you-go | Free (self-hosted) | Pay-per-load |

## MapKit (iOS) — Implementation

```swift
import MapKit
import SwiftUI

struct MapContainer: UIViewRepresentable {
    @Binding var region: MKCoordinateRegion
    let annotations: [MKPointAnnotation]
    let onAnnotationTap: (MKAnnotation) -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    func makeUIView(context: Context) -> MKMapView {
        let map = MKMapView()
        map.delegate = context.coordinator
        map.showsUserLocation = true
        map.showsCompass = true
        map.showsScale = true
        map.pointOfInterestFilter = .includingAll
        map.register(MKMarkerAnnotationView.self,
                     forAnnotationViewWithReuseIdentifier: "marker")
        return map
    }

    func updateUIView(_ map: MKMapView, context: Context) {
        map.setRegion(region, animated: true)
        map.addAnnotations(annotations)
    }

    class Coordinator: NSObject, MKMapViewDelegate {
        var parent: MapContainer
        init(_ parent: MapContainer) { self.parent = parent }

        func mapView(_ map: MKMapView, viewFor annotation: MKAnnotation) -> MKAnnotationView? {
            if annotation is MKUserLocation { return nil }
            if let cluster = annotation as? MKClusterAnnotation {
                let view = MKMarkerAnnotationView(annotation: annotation,
                    reuseIdentifier: "cluster")
                view.glyphText = "\(cluster.memberAnnotations.count)"
                view.markerTintColor = .systemBlue
                return view
            }
            let view = MKMarkerAnnotationView(annotation: annotation,
                reuseIdentifier: "marker")
            view.canShowCallout = true
            view.rightCalloutAccessoryView = UIButton(type: .detailDisclosure)
            return view
        }
    }
}
```

## Google Maps — Cross-Platform

### Android (Kotlin)

```kotlin
// build.gradle.kts
dependencies {
    implementation("com.google.android.gms:play-services-maps:19.0.0")
    implementation("com.google.android.libraries.places:places:3.5.0")
    implementation("com.google.maps.android:android-maps-utils:3.8.2") // clustering
}

// Fragment with MapView
class MapFragment : Fragment() {
    private var map: GoogleMap? = null
    private lateinit var clusterManager: ClusterManager<MyItem>

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        val mapFragment = childFragmentManager
            .findFragmentById(R.id.map) as SupportMapFragment
        mapFragment.getMapAsync { googleMap ->
            map = googleMap
            setupMap(googleMap)
        }
    }

    private fun setupMap(googleMap: GoogleMap) {
        googleMap.apply {
            uiSettings.isZoomControlsEnabled = true
            uiSettings.isCompassEnabled = true
            uiSettings.isMapToolbarEnabled = false
            setMinZoomPreference(5f)
            setMaxZoomPreference(20f)
            setMapStyle(MapStyleOptions.loadRawResourceStyle(requireContext(), R.raw.map_style))

            // Clustering
            clusterManager = ClusterManager(requireContext(), this)
            setOnCameraIdleListener(clusterManager)
            clusterManager.addItems(generateItems())
            clusterManager.cluster()

            // Marker click
            setOnMarkerClickListener(clusterManager)
        }
    }
}
```

### iOS (Swift)

```swift
import GoogleMaps

class MapViewController: UIViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        let camera = GMSCameraPosition.camera(
            withLatitude: 37.7749,
            longitude: -122.4194,
            zoom: 12
        )
        let mapView = GMSMapView.map(withFrame: .zero, camera: camera)
        mapView.settings.compassButton = true
        mapView.settings.myLocationButton = true
        mapView.isMyLocationEnabled = true
        mapView.setMinZoom(5, maxZoom: 20)
        self.view = mapView

        // Marker
        let marker = GMSMarker()
        marker.position = CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4194)
        marker.title = "San Francisco"
        marker.snippet = "California"
        marker.icon = UIImage(named: "custom_pin")
        marker.map = mapView
    }
}
```

## Marker Clustering

```swift
// iOS — MKClusterAnnotation (built-in)
func mapView(_ mapView: MKMapView, viewFor annotation: MKAnnotation) -> MKAnnotationView? {
    if let cluster = annotation as? MKClusterAnnotation {
        let view = MKMarkerAnnotationView(annotation: annotation, reuseIdentifier: "cluster")
        let count = cluster.memberAnnotations.count
        view.glyphText = count > 99 ? "99+" : "\(count)"
        view.markerTintColor = count > 50 ? .systemRed : .systemOrange
        view.animatesWhenAdded = true
        return view
    }
    // Single marker
    let view = MKMarkerAnnotationView(annotation: annotation, reuseIdentifier: "marker")
    view.canShowCallout = true
    view.animatesWhenAdded = true
    return view
}
```

```kotlin
// Android — ClusterManager (google-maps-utils)
class MyItem(
    lat: Double, lng: Double,
    val title: String,
    val snippet: String
) : ClusterItem {
    private val position: LatLng = LatLng(lat, lng)
    override fun getPosition(): LatLng = position
    override fun getTitle(): String = title
    override fun getSnippet(): String = snippet
    override fun getZIndex(): Float = 0f
}

// Custom renderer
class MyClusterRenderer(
    context: Context, map: GoogleMap, manager: ClusterManager<MyItem>
) : DefaultClusterRenderer<MyItem>(context, map, manager) {
    override fun onBeforeClusterItemRendered(item: MyItem, markerOptions: MarkerOptions) {
        markerOptions.title(item.title).snippet(item.snippet)
            .icon(BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_BLUE))
    }
    override fun onBeforeClusterRendered(cluster: Cluster<MyItem>, markerOptions: MarkerOptions) {
        markerOptions.icon(BitmapDescriptorFactory.defaultMarker(
            BitmapDescriptorFactory.HUE_ORANGE))
    }
}
```

## Map Styling

```json
// Google Maps JSON style — Dark Mode
[
  { "featureType": "all", "elementType": "geometry", "stylers": [{ "color": "#242f3e" }] },
  { "featureType": "all", "elementType": "labels.text.fill", "stylers": [{ "color": "#746855" }] },
  { "featureType": "all", "elementType": "labels.text.stroke", "stylers": [{ "color": "#242f3e" }] },
  { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#38414e" }] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#212a37" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#17263c" }] }
]
```

## Directions and Routing

```swift
// iOS — MKDirections
let request = MKDirections.Request()
request.source = MKMapItem(placemark: MKPlacemark(coordinate: sourceCoord))
request.destination = MKMapItem(placemark: MKPlacemark(coordinate: destCoord))
request.transportType = .automobile

let directions = MKDirections(request: request)
directions.calculate { response, error in
    guard let route = response?.routes.first else { return }
    mapView.addOverlay(route.polyline, level: .aboveRoads)
    // route.expectedTravelTime, route.distance, route.steps
}
```

No preamble. No postamble. No explanations.
