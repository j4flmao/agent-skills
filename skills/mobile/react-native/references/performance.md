# React Native Performance

## FlatList Optimization

```typescript
<FlatList
  data={orders}
  renderItem={renderOrder}
  keyExtractor={(item) => item.id}
  getItemLayout={getItemLayout}         // Fixed height = O(1) scroll
  maxToRenderPerBatch={10}
  windowSize={5}
  removeClippedSubviews={true}          // iOS only
  initialNumToRender={10}
/>

const ITEM_HEIGHT = 80;
const getItemLayout = (_, index) => ({
  length: ITEM_HEIGHT,
  offset: ITEM_HEIGHT * index,
  index,
});
```

## Hermes Engine

```json
// app.json (Expo)
{
  "expo": {
    "jsEngine": "hermes"
  }
}
// or in Metro config
module.exports = { resolver: { unstable_enablePackageExports: true } };
```

Benefits: faster startup, less memory, smaller bundle.

## Image Optimization

```typescript
// Use explicit dimensions — avoid layout shift
<Image
  source={{ uri: order.image }}
  style={{ width: 200, height: 200 }}
  loading="lazy"
/>

// Cache with expo-image
<Image source={{ uri: order.image }} cachePolicy="memory-disk" />
```

## JS Thread

```typescript
// Move heavy work off JS thread
import InteractionManager from 'react-native';

InteractionManager.runAfterInteractions(() => {
  heavyComputation();
});
```
