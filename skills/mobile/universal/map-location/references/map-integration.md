# Map Integration

## Apple MapKit (iOS)

```swift
import MapKit

struct MapView: UIViewRepresentable {
  @Binding var region: MKCoordinateRegion
  let annotations: [MKPointAnnotation]

  func makeUIView(context: Context) -> MKMapView {
    let map = MKMapView()
    map.delegate = context.coordinator
    map.showsUserLocation = true
    return map
  }

  func updateUIView(_ map: MKMapView, context: Context) {
    map.setRegion(region, animated: true)
    map.addAnnotations(annotations)
  }
}
```

## Google Maps (Cross-Platform)

```kotlin
// Android — XML layout
<fragment
  android:id="@+id/map"
  android:name="com.google.android.gms.maps.SupportMapFragment"
  android:layout_width="match_parent"
  android:layout_height="match_parent" />

// Fragment callback
val mapFragment = childFragmentManager.findFragmentById(R.id.map) as SupportMapFragment
mapFragment.getMapAsync { googleMap ->
  googleMap.uiSettings.isZoomControlsEnabled = true
  googleMap.addMarker(MarkerOptions()
    .position(LatLng(37.7749, -122.4194))
    .title("San Francisco"))
}
```

```swift
// iOS
@import GoogleMaps;

let camera = GMSCameraPosition.camera(withLatitude: 37.7749, longitude: -122.4194, zoom: 12)
let mapView = GMSMapView.map(withFrame: .zero, camera: camera)
mapView.isMyLocationEnabled = true
let marker = GMSMarker()
marker.position = CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4194)
marker.title = "San Francisco"
marker.map = mapView
```

## Marker Clustering

```swift
// iOS — MKClusterAnnotation
func mapView(_ mapView: MKMapView, viewFor annotation: MKAnnotation) -> MKAnnotationView? {
  if let cluster = annotation as? MKClusterAnnotation {
    let view = MKMarkerAnnotationView(annotation: annotation, reuseIdentifier: "cluster")
    view.glyphText = "\(cluster.memberAnnotations.count)"
    return view
  }
  // Regular marker
}
```

```kotlin
// Android — ClusterManager
val clusterManager = ClusterManager<MyItem>(context, googleMap)
googleMap.setOnCameraIdleListener(clusterManager)
clusterManager.addItems(items)
clusterManager.cluster()
```

## Map Style Customization

```xml
<!-- Google Maps JSON style — dark mode -->
[
  {
    "featureType": "all",
    "elementType": "geometry",
    "stylers": [{ "color": "#242f3e" }]
  },
  {
    "featureType": "all",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#746855" }]
  }
]
```

Apply via `googleMap.setMapStyle(MapStyleOptions.loadRawResourceStyle(context, R.raw.dark_style))`.
