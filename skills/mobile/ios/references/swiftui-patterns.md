# SwiftUI Patterns

## NavigationStack
```swift
NavigationStack {
    List(orders) { order in
        NavigationLink(order.customerName, value: order)
    }
    .navigationDestination(for: Order.self) { order in
        OrderDetailView(order: order)
    }
}
```

## State Management
```swift
@State private var text = ""          // local
@StateObject var vm = OrderViewModel() // owned
@ObservedObject var vm: OrderViewModel // passed
@EnvironmentObject var appState: AppState // shared
@Binding var isPresented: Bool         // two-way
```

## Animations
```swift
// Implicit
Text("Hello").animation(.easeInOut, value: show)

// Explicit
withAnimation(.spring(dampingFraction: 0.6)) {
    show.toggle()
}

// Matched geometry
@Namespace var animation
Image("logo").matchedGeometryEffect(id: "logo", in: animation)
```
