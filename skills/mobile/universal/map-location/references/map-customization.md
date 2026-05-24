# Map Customization — Markers, Clustering, Styling, Offline

## Custom Markers

### iOS — MapKit Annotations
```swift
import MapKit

// Custom annotation model
class PlaceAnnotation: MKPointAnnotation {
    let placeId: String
    let icon: UIImage
    let tint: UIColor

    init(coordinate: CLLocationCoordinate2D, title: String,
         placeId: String, icon: UIImage, tint: UIColor) {
        self.placeId = placeId
        self.icon = icon
        self.tint = tint
        super.init()
        self.coordinate = coordinate
        self.title = title
    }
}

// Custom annotation view
class PlaceMarkerView: MKMarkerAnnotationView {
    override var annotation: (any MKAnnotation)? {
        didSet {
            guard let place = annotation as? PlaceAnnotation else { return }
            markerTintColor = place.tint
            glyphImage = place.icon
            displayPriority = .required
            canShowCallout = true
            // Right callout accessory
            rightCalloutAccessoryView = UIButton(type: .detailDisclosure)
        }
    }
}

// In MKMapViewDelegate
func mapView(_ mapView: MKMapView,
             viewFor annotation: MKAnnotation) -> MKAnnotationView? {
    guard let place = annotation as? PlaceAnnotation else { return nil }

    let identifier = "PlaceMarker"
    let view = mapView.dequeueReusableAnnotationView(
        withIdentifier: identifier, for: annotation
    ) as? PlaceMarkerView ?? PlaceMarkerView(
        annotation: annotation, reuseIdentifier: identifier
    )
    return view
}
```

### Android — Google Maps Markers
```kotlin
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.model.*

class CustomMarkerManager(private val googleMap: GoogleMap) {

    fun addCustomMarker(position: LatLng, title: String, snippet: String,
                        iconResId: Int): Marker {
        val icon = BitmapDescriptorFactory.fromResource(iconResId)

        return googleMap.addMarker(
            MarkerOptions()
                .position(position)
                .title(title)
                .snippet(snippet)
                .icon(icon)
                .anchor(0.5f, 1.0f) // Center bottom
                .zIndex(10f)
                .rotation(0f)
                .flat(false) // Billboard vs ground
                .alpha(1.0f)
        )
    }

    // Custom info window
    fun setCustomInfoWindow(layoutInflater: LayoutInflater) {
        googleMap.setInfoWindowAdapter(object : GoogleMap.InfoWindowAdapter {
            override fun getInfoWindow(marker: Marker): View? = null // Default window

            override fun getInfoContents(marker: Marker): View {
                val view = layoutInflater.inflate(R.layout.custom_info_window, null)
                view.findViewById<TextView>(R.id.title).text = marker.title
                view.findViewById<TextView>(R.id.snippet).text = marker.snippet
                return view
            }
        })
    }
}
```

## Marker Clustering

### iOS — MKClusterAnnotation
```swift
import MapKit

class ClusterAnnotationView: MKAnnotationView {
    override var annotation: (any MKAnnotation)? {
        didSet {
            guard let cluster = annotation as? MKClusterAnnotation else { return }
            let count = cluster.memberAnnotations.count
            displayPriority = .defaultHigh

            // Show count badge
            let label = UILabel(frame: CGRect(x: 0, y: 0, width: 40, height: 40))
            label.text = "\(count)"
            label.textAlignment = .center
            label.backgroundColor = .systemBlue
            label.textColor = .white
            label.layer.cornerRadius = 20
            label.clipsToBounds = true
            label.font = .systemFont(ofSize: 14, weight: .bold)
            self.addSubview(label)
        }
    }
}

// In delegate — handle cluster tap
func mapView(_ mapView: MKMapView,
             didSelect view: MKAnnotationView) {
    if let cluster = view.annotation as? MKClusterAnnotation {
        // Zoom to fit cluster members
        let rect = cluster.memberAnnotations.reduce(MKMapRect.null) { partial, annotation in
            let point = MKMapPoint(annotation.coordinate)
            let rect = MKMapRect(
                origin: point,
                size: MKMapSize(width: 0, height: 0)
            )
            return partial.union(rect)
        }
        mapView.setVisibleMapRect(rect, animated: true)
    }
}
```

### Android — Clustering with Google Maps Utility Library
```kotlin
import com.google.maps.android.clustering.ClusterManager
import com.google.maps.android.clustering.ClusterItem
import com.google.maps.android.clustering.view.DefaultClusterRenderer

// Cluster item
data class PlaceClusterItem(
    val id: String,
    override val position: LatLng,
    override val title: String,
    override val snippet: String
) : ClusterItem

// Renderer
class PlaceClusterRenderer(
    private val context: Context,
    map: GoogleMap,
    manager: ClusterManager<PlaceClusterItem>
) : DefaultClusterRenderer<PlaceClusterItem>(context, map, manager) {

    override fun onBeforeClusterItemRendered(
        item: PlaceClusterItem, markerOptions: MarkerOptions
    ) {
        markerOptions.title(item.title).snippet(item.snippet)
    }

    override fun onBeforeClusterRendered(
        cluster: Cluster<PlaceClusterItem>, markerOptions: MarkerOptions
    ) {
        // Custom cluster icon with count
        markerOptions.icon(
            BitmapDescriptorFactory.defaultMarker(
                BitmapDescriptorFactory.HUE_AZURE
            )
        )
    }
}

// Setup
fun setupClustering(googleMap: GoogleMap, context: Context) {
    val clusterManager = ClusterManager<PlaceClusterItem>(context, googleMap)
    clusterManager.renderer = PlaceClusterRenderer(context, googleMap, clusterManager)

    googleMap.setOnCameraIdleListener(clusterManager)
    googleMap.setOnMarkerClickListener(clusterManager)
}
```

## Polylines and Polygons

### iOS
```swift
// Route line
let coordinates = routePoints.map { $0.coordinate }
let polyline = MKPolyline(
    coordinates: coordinates,
    count: coordinates.count
)
mapView.addOverlay(polyline)

// Renderer
func mapView(_ mapView: MKMapView,
             rendererFor overlay: MKOverlay) -> MKOverlayRenderer {
    if let polyline = overlay as? MKPolyline {
        let renderer = MKPolylineRenderer(polyline: polyline)
        renderer.strokeColor = .systemBlue
        renderer.lineWidth = 4
        renderer.lineDashPattern = [10, 5] // dashed
        renderer.alpha = 0.8
        return renderer
    }
    if let polygon = overlay as? MKPolygon {
        let renderer = MKPolygonRenderer(polygon: polygon)
        renderer.fillColor = .systemBlue.withAlphaComponent(0.2)
        renderer.strokeColor = .systemBlue
        renderer.lineWidth = 2
        return renderer
    }
    return MKOverlayRenderer()
}
```

### Android
```kotlin
// Polyline
val polyline = googleMap.addPolyline(
    PolylineOptions()
        .addAll(routeCoordinates)
        .color(Color.BLUE)
        .width(8f)
        .pattern(listOf(
            PatternItem.Dash(20f),
            PatternItem.Gap(10f)
        ))
        .jointType(JointType.ROUND)
        .startCap(Cap.RoundCap())
        .endCap(Cap.RoundCap())
)

// Polygon
val polygon = googleMap.addPolygon(
    PolygonOptions()
        .addAll(boundaryPoints)
        .fillColor(Color.argb(50, 0, 0, 255))
        .strokeColor(Color.BLUE)
        .strokeWidth(3f)
        .clickable(true)
)

// Click listener
googleMap.setOnPolygonClickListener { clickedPolygon ->
    clickedPolygon.fillColor = Color.argb(100, 0, 255, 0)
}
```

## Tile Overlays

### Custom Tile Provider
```swift
class CustomTileOverlay: MKTileOverlay {
    override func url(forTilePath path: MKTileOverlayPath) -> URL {
        // Custom tile server
        return URL(string: "https://tiles.example.com/\(path.z)/\(path.x)/\(path.y).png")!
    }
}

// Add to map
let overlay = CustomTileOverlay()
overlay.canReplaceMapContent = false // Show below labels
mapView.addOverlay(overlay)

// Renderer
func mapView(_ mapView: MKMapView,
             rendererFor overlay: MKOverlay) -> MKOverlayRenderer {
    if let tile = overlay as? MKTileOverlay {
        return MKTileOverlayRenderer(tileOverlay: tile)
    }
    return MKOverlayRenderer()
}
```

### Android — TileProvider
```kotlin
val tileOverlay = googleMap.addTileOverlay(
    TileOverlayOptions()
        .tileProvider(object : UrlTileProvider(256, 256) {
            override fun getTileUrl(x: Int, y: Int, zoom: Int): URL {
                return URL("https://tiles.example.com/$zoom/$x/$y.png")
            }
        })
        .transparency(0.2f)
        .zIndex(1f)
)
```

## Map Style Customization

### Google Maps JSON Styling
```json
[
  {
    "elementType": "geometry",
    "stylers": [{"color": "#242f3e"}]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [{"color": "#746855"}]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [{"color": "#38414e"}]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{"color": "#17263c"}]
  }
]
```

### Apply Style (Android)
```kotlin
googleMap.setMapStyle(
    MapStyleOptions.loadRawResourceStyle(context, R.raw.map_style_dark)
)
```

### Apply Style (iOS)
```swift
// MapKit — light/dark/elevated
mapView.mapStyle = MKMapStyle(style: .dark)

// Google Maps iOS — JSON
mapView.mapStyle = GMSMapStyle(contentsOfFileURL: styleURL, error: nil)
```

## Offline Maps

### iOS — MapKit Offline
```swift
import MapKit

class OfflineMapManager {
    func downloadRegion(center: CLLocationCoordinate2D,
                        radius: CLLocationDistance) {
        let region = MKCoordinateRegion(
            center: center,
            latitudinalMeters: radius,
            longitudinalMeters: radius
        )

        let request = MKMapSnapshotter(
            options: MKMapSnapshotter.Options()
        )
        // For tile caching, use MKMapView's cached tiles
        // Or use MapKit JS for custom tile caching

        // For download of region:
        let rect = MKMapRect(
            origin: MKMapPoint(region.center),
            size: MKMapSize(width: radius * 2, height: radius * 2)
        )
        MKMapView.downloadMapRegion(
            for: MKMapRect.world,
            scale: MKMapScale(1000),
            resultType: .tile,
            progressHandler: { progress in
                // Monitor download progress
            },
            completionHandler: { result in
                // Tiles saved to cache
            }
        )
    }
}
```

### Android — Offline Maps (Google Maps)
```kotlin
// Use MapDownloadManager or custom tile caching
class OfflineTileCache(private val context: Context) {
    private val diskCache = DiskLruCache(...)

    fun cacheTile(x: Int, y: Int, zoom: Int, tileData: ByteArray) {
        val key = "$zoom/$x/$y"
        // Store to device storage
        val file = File(context.cacheDir, "tiles/$key.png")
        file.parentFile?.mkdirs()
        file.writeBytes(tileData)
    }

    fun getCachedTile(x: Int, y: Int, zoom: Int): ByteArray? {
        val file = File(context.cacheDir, "tiles/$zoom/$x/$y.png")
        return if (file.exists()) file.readBytes() else null
    }
}
```

## Navigation and Routing

### iOS — MKDirections
```swift
import MapKit

func calculateRoute(from source: CLLocationCoordinate2D,
                    to destination: CLLocationCoordinate2D) async throws -> [MKRoute] {
    let request = MKDirections.Request()
    request.source = MKMapItem(placemark: MKPlacemark(coordinate: source))
    request.destination = MKMapItem(placemark: MKPlacemark(coordinate: destination))
    request.transportType = .automobile
    request.requestsAlternateRoutes = true

    let directions = MKDirections(request: request)
    let response = try await directions.calculate()

    // response.routes: sorted by ETA
    // response.routes.first?.expectedTravelTime
    // response.routes.first?.polyline
    // response.routes.first?.steps (turn-by-turn)
    return response.routes
}
```

### Android — Directions Rendering
```kotlin
// Use Google Maps Directions API (server-side)
// Or OSRM for self-hosted routing

data class RouteInfo(
    val points: List<LatLng>,
    val distance: Float,
    val duration: Float,
    val polylineEncoded: String
)

fun decodePolyline(encoded: String): List<LatLng> {
    val poly = com.google.maps.android.PolyUtil.decode(encoded)
    return poly
}

fun addRouteToMap(map: GoogleMap, route: RouteInfo) {
    map.addPolyline(
        PolylineOptions()
            .addAll(decodePolyline(route.polylineEncoded))
            .color(Color.BLUE)
            .width(10f)
    )
}
```

## Platform Comparison

| Feature | MapKit | Google Maps | MapLibre |
|---|---|---|---|
| Custom markers | MKMarkerAnnotationView | MarkerOptions | Marker + SymbolLayer |
| Clustering | MKClusterAnnotation | ClusterManager (utility lib) | Built-in (SuperCluster) |
| Polylines | MKPolylineRenderer | PolylineOptions | LineLayer |
| Polygons | MKPolygonRenderer | PolygonOptions | FillLayer |
| Tile overlays | MKTileOverlay | TileOverlayOptions | RasterTileSource |
| Offline tiles | MKMapView cached | No (3rd party) | Yes (MBTiles/offline) |
| Custom style | Limited (dark/elevated) | Full JSON | Full Style JSON |
| Routing | MKDirections | Directions API (paid) | Via OSRM |
