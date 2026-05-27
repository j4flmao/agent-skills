# React Native Navigation and Routing

## Overview
React Navigation is the standard navigation library for React Native. It provides stack, tab, drawer, and modal navigators with deep linking, type safety, and animation support.

## Stack Navigator

### Basic Stack
```typescript
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

type RootStackParamList = {
  Home: undefined;
  Profile: { userId: string };
  Settings: { section?: string };
  PostDetails: { postId: string; title: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: { backgroundColor: '#f4511e' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Overview' }}
        />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={({ route }) => ({
            title: `User ${route.params.userId}`,
            headerRight: () => (
              <Button title="Edit" onPress={() => {}} />
            ),
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

### Navigation in Components
```typescript
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Home'
>;

function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();

  return (
    <View>
      <Button
        title="View Profile"
        onPress={() =>
          navigation.navigate('Profile', { userId: '123' })
        }
      />
      <Button
        title="Go to Settings"
        onPress={() =>
          navigation.navigate('Settings', { section: 'notifications' })
        }
      />
    </View>
  );
}

function ProfileScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'Profile'>>();
  const { userId } = route.params;

  return <Text>User ID: {userId}</Text>;
}
```

## Tab Navigator

### Bottom Tabs
```typescript
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';

type TabParamList = {
  Feed: undefined;
  Search: undefined;
  Notifications: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Feed':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Search':
              iconName = focused ? 'search' : 'search-outline';
              break;
            case 'Notifications':
              iconName = focused ? 'notifications' : 'notifications-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'help';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: 'tomato',
        tabBarInactiveTintColor: 'gray',
        tabBarBadge: route.name === 'Notifications' ? 3 : undefined,
      })}
    >
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
```

## Drawer Navigator

### Drawer Navigation
```typescript
import { createDrawerNavigator } from '@react-navigation/drawer';

type DrawerParamList = {
  Dashboard: undefined;
  Orders: undefined;
  Customers: undefined;
  Analytics: undefined;
};

const Drawer = createDrawerNavigator<DrawerParamList>();

function CustomDrawerContent(props: DrawerContentProps) {
  return (
    <DrawerContentScrollView {...props}>
      <DrawerItemList {...props} />
      <DrawerItem
        label="Help"
        onPress={() => Linking.openURL('https://help.example.com')}
        icon={({ color, size }) => (
          <Ionicons name="help-circle" size={size} color={color} />
        )}
      />
      <View style={{ borderTopWidth: 1, marginTop: 20 }}>
        <DrawerItem
          label="Logout"
          onPress={() => {/* handle logout */}}
          icon={({ color, size }) => (
            <Ionicons name="log-out" size={size} color={color} />
          )}
        />
      </View>
    </DrawerContentScrollView>
  );
}

function DrawerNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        drawerStyle: { backgroundColor: '#f5f5f5' },
        drawerLabelStyle: { fontSize: 16 },
      }}
    >
      <Drawer.Screen name="Dashboard" component={DashboardScreen} />
      <Drawer.Screen name="Orders" component={OrdersScreen} />
      <Drawer.Screen name="Customers" component={CustomersScreen} />
      <Drawer.Screen name="Analytics" component={AnalyticsScreen} />
    </Drawer.Navigator>
  );
}
```

## Deep Linking

### Deep Link Configuration
```typescript
import { Linking } from 'react-native';

const linking = {
  prefixes: ['myapp://', 'https://myapp.example.com'],
  config: {
    screens: {
      Home: '',
      Profile: 'user/:userId',
      PostDetails: 'post/:postId',
      Settings: {
        path: 'settings/:section?',
        screens: {
          Notifications: 'notifications',
          Privacy: 'privacy',
        },
      },
    },
  },
};

function App() {
  return (
    <NavigationContainer
      linking={linking}
      fallback={<Text>Loading...</Text>}
      onUnhandledAction={(action) => {
        console.log('Unhandled navigation:', action);
      }}
    >
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="PostDetails" component={PostDetailsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

## Nested Navigation

### Combining Navigators
```typescript
function RootNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Main" component={TabNavigator}
        options={{ headerShown: false }} />
      <Stack.Screen name="Modal" component={ModalScreen}
        options={{ presentation: 'modal' }} />
      <Stack.Screen name="PostDetails" component={PostDetailsScreen} />
    </Stack.Navigator>
  );
}

// Navigation across nested navigators
function FeedScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  return (
    <Button
      title="Open Modal"
      onPress={() => navigation.navigate('Modal')}
    />
  );
}
```

## Key Points
- React Navigation provides stack, tab, drawer, and modal navigators
- Type-safe navigation with TypeScript generics
- NavigationContainer wraps the entire navigation tree
- useNavigation hook accesses navigation prop in any component
- useRoute hook accesses current route parameters
- Screen options configure headers, animations, and transitions
- Deep linking connects external URLs to specific screens
- Nested navigators combine different navigation patterns
- Linking configuration maps URL patterns to screens
- Custom drawer content for branded navigation
- Tab badges show notification counts
- Header customization with left, right, and title components
- Modal presentation for overlay screens
- Navigation state persistence with AsyncStorage
- Authentication flow pattern (conditional navigation)
- useFocusEffect for screen lifecycle callbacks
- Navigation event listeners for complex flows
- Bottom tab navigator supports swipe gestures
- Material top tabs for horizontal category navigation
- NavigationContainer's onStateChange for analytics
