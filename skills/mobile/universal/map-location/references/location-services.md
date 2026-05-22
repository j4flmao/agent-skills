# Location Services

## Permission Strings

### iOS (Info.plist)
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>App needs location to show nearby places</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>App needs background location for geofence alerts</string>
<key>NSLocationTemporaryUsageDescriptionDictionary</key>
<dict>
  <key>fullAccuracy</key>
  <string>App needs precise location for turn-by-turn navigation</string>
</dict>
```

### Android (AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
```

## CLLocationManager (iOS)

```swift
let manager = CLLocationManager()
manager.delegate = self
manager.desiredAccuracy = kCLLocationAccuracyBest
manager.allowsBackgroundLocationUpdates = true

func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
  switch manager.authorizationStatus {
  case .authorizedAlways, .authorizedWhenInUse: manager.startUpdatingLocation()
  case .denied, .restricted: // Show settings redirect
  case .notDetermined: manager.requestWhenInUseAuthorization()
  }
}
```

## FusedLocationProvider (Android)

```kotlin
val fusedClient = LocationServices.getFusedLocationProviderClient(context)

val request = LocationRequest.Builder(
  Priority.PRIORITY_HIGH_ACCURACY, 5000L // 5 sec interval
)
  .setWaitForAccurateLocation(true)
  .setMinUpdateIntervalMillis(2000L)
  .build()

val callback = object : LocationCallback() {
  override fun onLocationResult(result: LocationResult) {
    result.lastLocation?.let { /* use lat/lng */ }
  }
}

fusedClient.requestLocationUpdates(request, callback, Looper.getMainLooper())
```

## Geofencing

```kotlin
// Android — GeofencingClient
val geofence = Geofence.Builder()
  .setRequestId("store_123")
  .setCircularRegion(lat, lng, 100f) // 100m radius
  .setTransitionTypes(Geofence.GEOFENCE_TRANSITION_ENTER)
  .setExpirationDuration(Geofence.NEVER_EXPIRE)
  .build()
```

```swift
// iOS — CLCircularRegion
let region = CLCircularRegion(center: coord, radius: 100, identifier: "store_123")
region.notifyOnEntry = true
locationManager.startMonitoring(for: region)
```

## Battery Optimization

| Use Case | Accuracy | Update Interval | Power |
|----------|----------|-----------------|-------|
| Navigation | Best / PRIORITY_HIGH_ACCURACY | 1-2 sec | High |
| Weather/News | HundredMeters / BALANCED | 5-15 min | Medium |
| Step counting | Significant-change only | On move | Low |
| Geofencing | Varies | On region transition | Low |

- Always call `stopUpdatingLocation()` when location no longer needed.
- Use `significantLocationChangeMonitor` / `PRIORITY_LOW_POWER` for non-critical updates.
