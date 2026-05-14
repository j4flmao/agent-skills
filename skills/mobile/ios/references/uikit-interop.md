# SwiftUI / UIKit Interop

## SwiftUI in UIKit
```swift
let hostingController = UIHostingController(rootView: OrderListView())
navigationController.pushViewController(hostingController, animated: true)
```

## UIKit in SwiftUI
```swift
struct MapView: UIViewRepresentable {
    func makeUIView(context: Context) -> MKMapView {
        MKMapView()
    }
    func updateUIView(_ uiView: MKMapView, context: Context) {
        // update
    }
}

// Wrap UIKit delegate via Coordinator
class Coordinator: NSObject, MKMapViewDelegate {
    var parent: MapView
    init(_ parent: MapView) { self.parent = parent }
}
```
