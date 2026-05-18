# Flutter Widgets

## Layout Patterns

```dart
// Responsive layout
LayoutBuilder(
  builder: (_, constraints) {
    if (constraints.maxWidth > 600) {
      return WideLayout(children: children);
    }
    return NarrowLayout(children: children);
  },
);

// ConstrainedBox for max width
ConstrainedBox(
  constraints: BoxConstraints(maxWidth: 400),
  child: form,
);
```

## Custom Widget

```dart
class OrderCard extends StatelessWidget {
  final Order order;
  final VoidCallback? onTap;

  const OrderCard({super.key, required this.order, this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Expanded(child: Text(order.customerName)),
              Text('\$${order.total}'),
            ],
          ),
        ),
      ),
    );
  }
}
```

## Theming

```dart
ThemeData(
  useMaterial3: true,
  colorSchemeSeed: Colors.blue,
  brightness: Brightness.light,
);
```
