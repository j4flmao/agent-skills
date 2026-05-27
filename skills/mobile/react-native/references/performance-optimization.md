# React Native Performance Optimization

## Overview
React Native performance optimization focuses on reducing JavaScript thread load, optimizing rendering, managing memory, and improving startup time. Key areas include FlatList optimization, image handling, animation performance, and native module usage.

## List Optimization

### FlatList Performance
```typescript
import { FlatList, View, Text, Image } from 'react-native';

function OptimizedList() {
  const renderItem = useCallback(
    ({ item }: { item: Item }) => (
      <ListItem item={item} />
    ),
    []
  );

  const keyExtractor = useCallback(
    (item: Item) => item.id,
    []
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  return (
    <FlatList
      data={items}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={5}
      removeClippedSubviews={true}
      updateCellsBatchingPeriod={50}
      onEndReachedThreshold={0.5}
      onEndReached={handleLoadMore}
      ListEmptyComponent={<EmptyState />}
      ListFooterComponent={<LoadingSpinner />}
      ItemSeparatorComponent={Divider}
      maintainVisibleContentPosition={{
        minIndexForVisible: 0,
      }}
    />
  );
}

// Memoized list item
const ListItem = React.memo(function ListItem({ item }: { item: Item }) {
  return (
    <View style={styles.item}>
      <FastImage
        source={{ uri: item.image }}
        style={styles.image}
        cacheKey={item.id}
      />
      <Text>{item.title}</Text>
    </View>
  );
});
```

## Image Optimization

### FastImage
```typescript
import FastImage from 'react-native-fast-image';

function OptimizedImage({ uri, style }: ImageProps) {
  return (
    <FastImage
      style={style}
      source={{
        uri,
        priority: FastImage.priority.normal,
        cache: FastImage.cacheControl.immutable,
      }}
      resizeMode={FastImage.resizeMode.contain}
      onLoad={() => console.log('Image loaded')}
      onError={() => console.log('Image error')}
    />
  );
}

// Prefetch images
useEffect(() => {
  const urls = items.map((item) => item.image);
  FastImage.preload(urls.map((uri) => ({ uri })));
}, [items]);
```

## Animation Performance

### useNativeDriver
```typescript
import { Animated, Easing } from 'react-native';

function SmoothAnimation() {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      easing: Easing.ease,
      useNativeDriver: true, // Offloads animation to native thread
    }).start();
  }, []);

  return (
    <Animated.View style={{ opacity }}>
      <Text>Fading in smoothly</Text>
    </Animated.View>
  );
}
```

### Reanimated 2
```typescript
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

function GestureAnimation() {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd(() => {
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pinchGesture, panGesture)}>
      <Animated.View style={[styles.box, animatedStyle]} />
    </GestureDetector>
  );
}
```

## JavaScript Thread Optimization

### Heavy Computation
```typescript
import { useMemo, useCallback } from 'react';
import { InteractionManager } from 'react-native';

// Offload heavy work from JS thread
function useHeavyComputation(data: Item[]) {
  const [processed, setProcessed] = useState<ProcessedItem[]>([]);

  useEffect(() => {
    InteractionManager.runAfterInteractions(() => {
      const result = expensiveProcessing(data);
      setProcessed(result);
    });
  }, [data]);

  return processed;
}

// Use requestAnimationFrame for batched updates
function useSmoothUpdate(callback: () => void, deps: any[]) {
  const requestRef = useRef<number>();

  useEffect(() => {
    requestRef.current = requestAnimationFrame(() => {
      callback();
    });
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, deps);
}
```

### Hermes Engine
```javascript
// metro.config.js
module.exports = {
  transformer: {
    minifierConfig: {
      keep_classnames: false,
      keep_fnames: false,
      mangle: {
        toplevel: true,
        safari10: true,
      },
    },
  },
};
```

```javascript
// react-native.config.js
module.exports = {
  hermes: true,
  // For Android, enable Hermes in build.gradle
};

// android/app/build.gradle
project.ext.react = [
    enableHermes: true,
]
```

## Bundle Size

### Code Splitting
```typescript
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));
const ChartLibrary = lazy(() => import('./ChartLibrary'));

function Dashboard() {
  const [showChart, setShowChart] = useState(false);

  return (
    <View>
      <Button title="Show Chart" onPress={() => setShowChart(true)} />
      <Suspense fallback={<LoadingSpinner />}>
        {showChart && <HeavyComponent />}
      </Suspense>
    </View>
  );
}
```

## Key Points
- FlatList with getItemLayout for fixed-height items
- React.memo prevents unnecessary list item re-renders
- FastImage provides image caching and prefetching
- useNativeDriver keeps animations on the native thread
- Reanimated 2 enables 60fps gesture animations
- Hermes engine reduces startup time and memory usage
- InteractionManager defers heavy work after navigation
- requestAnimationFrame batches UI updates
- Lazy loading reduces initial bundle size
- RemoveClippedSubviews for offscreen views
- maintainVisibleContentPosition for chat/messages
- PureComponent/React.memo for child components
- Use production builds for performance testing
- Enable Hermes for Android in build.gradle
- ProGuard strips unused code in Android release builds
- RAM bundles for efficient module loading
- Flipper and react-native-performance for profiling
- Avoid inline functions in render
- Minimize bridge traffic between JS and native
- useCallback and useMemo prevent unnecessary computations
- Console.log statements impact production performance
