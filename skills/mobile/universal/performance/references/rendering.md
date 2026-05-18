# Rendering Performance

## Jank causes

- Heavy computation on main thread
- Large/layered views in list
- Image decoding on UI thread
- Layout passes (nested, complex)

## Flutter

```dart
// Profile widget rebuilds
class _OrderCardState extends State<OrderCard> {
  @override
  Widget build(BuildContext context) {
    // Add: print('Rebuild: OrderCard');
    return Card(/* ... */);
  }
}

// Use shouldRepaint wisely in CustomPainter
@override
bool shouldRepaint(covariant CustomPainter oldDelegate) => oldDelegate.data != data;
```

## React Native

```typescript
// Use InteractionManager for post-animation work
InteractionManager.runAfterInteractions(() => {
  heavyTask();
});

// Avoid inline styles in list items
const styles = StyleSheet.create({
  card: { padding: 16, backgroundColor: '#fff' }
});
```

## iOS

```swift
// Layer rasterization for static layers
imageView.layer.shouldRasterize = true
imageView.layer.rasterizationScale = UIScreen.main.scale
```

## Android

```kotlin
// View binding over findViewById
binding = OrderListBinding.inflate(layoutInflater)
// Reuse layouts with <include>
```
