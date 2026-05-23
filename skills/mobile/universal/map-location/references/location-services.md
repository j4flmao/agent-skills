# Location Services

## Permission Strings Reference

### iOS (Info.plist)
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>App needs your location to show nearby places and offers.</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>App needs background location to alert you when you're near a saved place.</string>
<key>NSLocationTemporaryUsageDescriptionDictionary</key>
<dict>
    <key>fullAccuracy</key>
    <string>App needs precise location for turn-by-turn navigation.</string>
</dict>
```

### Android (AndroidManifest.xml)
```xml
<!-- Precise GPS location -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<!-- Approximate network location (~100m accuracy) -->
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<!-- Background location (separate from foreground) -->
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
```

## Location Permission Request Flow

### iOS — CLLocationManager

```swift
import CoreLocation

class LocationManager: NSObject, CLLocationManagerDelegate {
    private let manager = CLLocationManager()
    var onAuthorizationChange: ((CLAuthorizationStatus) -> Void)?
    var onLocationUpdate: ((CLLocation) -> Void)?

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBest
        manager.distanceFilter = kCLDistanceFilterNone // every movement
    }

    func requestWhenInUse() {
        manager.requestWhenInUseAuthorization()
    }

    func requestAlways() {
        manager.requestAlwaysAuthorization()
    }

    func requestTemporaryFullAccuracy(purposeKey: String = "fullAccuracy") {
        manager.requestTemporaryFullAccuracyAuthorization(withPurposeKey: purposeKey)
    }

    func startTracking() {
        manager.startUpdatingLocation()
    }

    func stopTracking() {
        manager.stopUpdatingLocation()
    }

    // MARK: - Delegate
    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let status = manager.authorizationStatus
        let accuracy = manager.accuracyAuthorization
        switch status {
        case .authorizedAlways:
            manager.allowsBackgroundLocationUpdates = true
            manager.startUpdatingLocation()
        case .authorizedWhenInUse:
            manager.allowsBackgroundLocationUpdates = false
            manager.startUpdatingLocation()
        case .denied, .restricted:
            // Show settings redirect alert
            onAuthorizationChange?(status)
        case .notDetermined:
            break // Will prompt on first request
        @unknown default: break
        }
        onAuthorizationChange?(status)
    }

    func locationManager(_ manager: CLLocationManager,
                         didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        onLocationUpdate?(location)
    }
}
```

### Android — FusedLocationProviderClient

```kotlin
import com.google.android.gms.location.*

class LocationService(private val context: Context) {
    private val fusedClient = LocationServices.getFusedLocationProviderClient(context)
    private val locationCallback = object : LocationCallback() {
        override fun onLocationResult(result: LocationResult) {
            result.lastLocation?.let { location ->
                onLocationUpdate(location)
            }
        }
        override fun onLocationAvailability(availability: LocationAvailability) {
            if (!availability.isLocationAvailable) {
                // GPS disabled or location unavailable
            }
        }
    }

    fun requestPermissions(activity: Activity) {
        val permissions = mutableListOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            // Background location must be requested separately
            if (needsBackgroundLocation()) {
                permissions.add(Manifest.permission.ACCESS_BACKGROUND_LOCATION)
            }
        }
        ActivityCompat.requestPermissions(activity,
            permissions.toTypedArray(), LOCATION_PERMISSION_REQUEST)
    }

    fun startLocationUpdates(priority: LocationPriority = LocationPriority.HIGH_ACCURACY) {
        val request = LocationRequest.Builder(priority.toPlayServicesPriority(), 5000L)
            .setMinUpdateIntervalMillis(2000L)
            .setMaxUpdateDelayMillis(10000L)
            .setWaitForAccurateLocation(true)
            .build()

        if (hasLocationPermission()) {
            fusedClient.requestLocationUpdates(request, locationCallback,
                Looper.getMainLooper())
        }
    }

    fun stopLocationUpdates() {
        fusedClient.removeLocationUpdates(locationCallback)
    }

    private fun hasLocationPermission(): Boolean {
        return ContextCompat.checkSelfPermission(context,
            Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
    }
}

enum class LocationPriority(val value: Int) {
    HIGH_ACCURACY(Priority.PRIORITY_HIGH_ACCURACY),    // GPS + Network
    BALANCED(Priority.PRIORITY_BALANCED_POWER_ACCURACY), // ~100m, battery efficient
    LOW_POWER(Priority.PRIORITY_LOW_POWER),             // ~1km, very efficient
    PASSIVE(Priority.PRIORITY_PASSIVE);                 // Only receive from other apps

    fun toPlayServicesPriority(): Int = value
}
```

## Geofencing

### Android — GeofencingClient

```kotlin
class GeofenceManager(private val context: Context) {
    private val geofencingClient = LocationServices.getGeofencingClient(context)

    fun addGeofence(lat: Double, lng: Double, radius: Float, id: String) {
        val geofence = Geofence.Builder()
            .setRequestId(id)
            .setCircularRegion(lat, lng, radius)
            .setTransitionTypes(Geofence.GEOFENCE_TRANSITION_ENTER or
                                Geofence.GEOFENCE_TRANSITION_EXIT)
            .setExpirationDuration(Geofence.NEVER_EXPIRE)
            .setLoiteringDelay(30000) // 30 seconds before dwell trigger
            .build()

        val request = GeofencingRequest.Builder()
            .setInitialTrigger(GeofencingRequest.INITIAL_TRIGGER_ENTER)
            .addGeofence(geofence)
            .build()

        if (ActivityCompat.checkSelfPermission(context,
                Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
            geofencingClient.addGeofences(request, geofencePendingIntent)
        }
    }

    fun removeGeofence(id: String) {
        geofencingClient.removeGeofences(listOf(id))
    }
}
```

### iOS — CLCircularRegion

```swift
class GeofenceMonitor: NSObject, CLLocationManagerDelegate {
    private let manager = CLLocationManager()

    func startMonitoring(center: CLLocationCoordinate2D, radius: CLLocationDistance, id: String) {
        guard CLLocationManager.isMonitoringAvailable(for: CLCircularRegion.self) else { return }
        let region = CLCircularRegion(center: center, radius: radius, identifier: id)
        region.notifyOnEntry = true
        region.notifyOnExit = true
        manager.startMonitoring(for: region)
    }

    func locationManager(_ manager: CLLocationManager,
                         didEnterRegion region: CLRegion) {
        // Handle enter
    }

    func locationManager(_ manager: CLLocationManager,
                         didExitRegion region: CLRegion) {
        // Handle exit
    }
}
```

## Battery Optimization

| Use Case | iOS Accuracy | Android Priority | Interval | Power |
|----------|-------------|-----------------|----------|-------|
| Real-time navigation | `kCLLocationAccuracyBestForNavigation` | `PRIORITY_HIGH_ACCURACY` | 1 sec | Very High |
| Running/Walking | `kCLLocationAccuracyBest` | `PRIORITY_HIGH_ACCURACY` | 2-5 sec | High |
| Weather/Local news | `kCLLocationAccuracyHundredMeters` | `PRIORITY_BALANCED_POWER_ACCURACY` | 5-15 min | Medium |
| Location badge | `kCLLocationAccuracyKilometer` | `PRIORITY_LOW_POWER` | 30+ min | Low |
| Step counting | Significant-change | `PRIORITY_PASSIVE` | On move | Very Low |
| Geofencing | Region monitoring | Geofencing API | On transition | Low |

## Background Location Guidelines

iOS:
- Enable "Background Modes → Location updates" capability in Xcode
- Set `allowsBackgroundLocationUpdates = true` on CLLocationManager
- Set `pausesLocationUpdatesAutomatically = true` to save battery when stopped
- App review requires clear user-facing justification for background location

Android:
- `ACCESS_BACKGROUND_LOCATION` must be requested separately (after foreground)
- On Android 11+, background permission request shows system dialog explaining usage
- `FusedLocationProviderClient` automatically manages battery via Google Play Services

No preamble. No postamble. No explanations.
