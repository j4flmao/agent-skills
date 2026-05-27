# Map Integration

## MapKit Setup

```swift
import MapKit

class MapViewController: UIViewController {
    @IBOutlet weak var mapView: MKMapView!

    override func viewDidLoad() {
        super.viewDidLoad()
        mapView.delegate = self
        mapView.showsUserLocation = true
        mapView.showsCompass = true
        mapView.showsScale = true
        mapView.showsTraffic = true

        setupInitialRegion()
        addAnnotations()
    }

    func setupInitialRegion() {
        let center = CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4194)
        let span = MKCoordinateSpan(latitudeDelta: 0.05, longitudeDelta: 0.05)
        mapView.setRegion(MKCoordinateRegion(center: center, span: span), animated: false)
    }

    func addAnnotations() {
        let annotation = MKPointAnnotation()
        annotation.title = "San Francisco"
        annotation.subtitle = "California"
        annotation.coordinate = CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4194)
        mapView.addAnnotation(annotation)
    }

    func searchLocation(query: String) {
        let request = MKLocalSearch.Request()
        request.naturalLanguageQuery = query
        request.region = mapView.region

        let search = MKLocalSearch(request: request)
        search.start { response, error in
            guard let response = response else { return }

            for item in response.mapItems {
                let annotation = MKPointAnnotation()
                annotation.title = item.name
                annotation.coordinate = item.placemark.coordinate
                self.mapView.addAnnotation(annotation)
            }

            if let firstItem = response.mapItems.first {
                self.mapView.setRegion(
                    MKCoordinateRegion(
                        center: firstItem.placemark.coordinate,
                        span: MKCoordinateSpan(latitudeDelta: 0.05, longitudeDelta: 0.05)
                    ),
                    animated: true
                )
            }
        }
    }
}

extension MapViewController: MKMapViewDelegate {
    func mapView(_ mapView: MKMapView, viewFor annotation: MKAnnotation) -> MKAnnotationView? {
        guard !(annotation is MKUserLocation) else { return nil }

        let identifier = "PinAnnotation"
        var annotationView = mapView.dequeueReusableAnnotationView(withIdentifier: identifier) as? MKMarkerAnnotationView

        if annotationView == nil {
            annotationView = MKMarkerAnnotationView(annotation: annotation, reuseIdentifier: identifier)
            annotationView?.canShowCallout = true
            annotationView?.rightCalloutAccessoryView = UIButton(type: .detailDisclosure)
        }

        annotationView?.annotation = annotation
        return annotationView
    }
}
```

## Google Maps Integration

```kotlin
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.OnMapReadyCallback
import com.google.android.gms.maps.SupportMapFragment
import com.google.android.gms.maps.model.*

class MapActivity : AppCompatActivity(), OnMapReadyCallback {
    private lateinit var googleMap: GoogleMap

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_map)

        val mapFragment = supportFragmentManager
            .findFragmentById(R.id.map) as SupportMapFragment
        mapFragment.getMapAsync(this)
    }

    override fun onMapReady(map: GoogleMap) {
        googleMap = map
        googleMap.uiSettings.apply {
            isZoomControlsEnabled = true
            isCompassEnabled = true
            isMyLocationButtonEnabled = true
            isMapToolbarEnabled = true
        }

        googleMap.setOnMapClickListener { latLng ->
            addMarker(latLng, "Selected Location")
        }

        googleMap.setOnMarkerClickListener { marker ->
            showInfoWindow(marker)
            true
        }

        val sydney = LatLng(-33.8688, 151.2093)
        googleMap.moveCamera(CameraUpdateFactory.newLatLngZoom(sydney, 12f))
    }

    private fun addMarker(position: LatLng, title: String): Marker {
        return googleMap.addMarker(
            MarkerOptions()
                .position(position)
                .title(title)
                .icon(BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_RED))
        )!!
    }
}
```

## Key Points

- Request location permissions before accessing location
- Use MapKit on iOS and Google Maps on Android
- Show user location with appropriate accuracy
- Implement custom annotations and markers
- Use clustering for large numbers of annotations
- Support map gesture controls (zoom, pan, rotate)
- Implement search with MKLocalSearch or Places API
- Show callout views with additional information
- Handle map region changes for responsive search
- Draw polylines and polygons for routes and areas
- Use heat maps for data density visualization
- Cache map tiles for offline use
