# React Context and Custom Hooks

## Overview
React Context provides a way to share values across the component tree without prop drilling. Custom hooks encapsulate reusable stateful logic. This reference covers context creation, providers, consumers, compound hooks, and performance optimization.

## Context API

### Creating and Using Context
```tsx
import { createContext, useContext, useState, type ReactNode } from 'react';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string) => {
    const response = await api.login({ email, password });
    setUser(response.user);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: user !== null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

### Using the Context
```tsx
// App.tsx
function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

// ProfilePage.tsx
function ProfilePage() {
  const { user, logout } = useAuth();

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

## Custom Hooks

### State Management Hook
```tsx
import { useState, useCallback } from 'react';

function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    const valueToStore = value instanceof Function ? value(storedValue) : value;
    setStoredValue(valueToStore);
    window.localStorage.setItem(key, JSON.stringify(valueToStore));
  }, [key, storedValue]);

  return [storedValue, setValue] as const;
}
```

### Async Hook
```tsx
import { useState, useEffect, useCallback } from 'react';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

function useAsync<T>(asyncFn: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await asyncFn();
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    execute();
  }, [execute]);

  return { data, loading, error, refetch: execute };
}
```

### Debounce Hook
```tsx
import { useState, useEffect } from 'react';

function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Usage in search
function SearchComponent() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 500);
  const { data: results } = useAsync(
    () => api.search(debouncedQuery),
    [debouncedQuery]
  );

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
      />
      {results && <SearchResults results={results} />}
    </div>
  );
}
```

## Composed Contexts

### Multiple Providers
```tsx
import { createContext, useContext } from 'react';

// Individual contexts
const ThemeContext = createContext<ThemeContextType>(null!);
const UserContext = createContext<UserContextType>(null!);
const ConfigContext = createContext<ConfigContextType>(null!);

// Combined provider
function AppProvider({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider>
      <ThemeProvider>
        <UserProvider>
          {children}
        </UserProvider>
      </ThemeProvider>
    </ConfigProvider>
  );
}

// Composed consumer hook
function useAppContext() {
  const theme = useContext(ThemeContext);
  const user = useContext(UserContext);
  const config = useContext(ConfigContext);

  return { theme, user, config };
}
```

## Performance Optimization

### Context Splitting
```tsx
// BAD: Single context with all state
interface AppState {
  user: User | null;
  theme: 'light' | 'dark';
  notifications: Notification[];
  settings: Settings;
}

// GOOD: Split into focused contexts
const UserStateContext = createContext<User | null>(null);
const UserDispatchContext = createContext<React.Dispatch<UserAction>>(null!);

const ThemeContext = createContext<ThemeContextType>(null!);
const NotificationContext = createContext<NotificationContextType>(null!);
```

### Memoizing Context Values
```tsx
function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      theme,
      toggleTheme: () => setTheme((t) => (t === 'light' ? 'dark' : 'light')),
    }),
    [theme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
```

### useMemo and useCallback in Hooks
```tsx
function useCounter(initialValue: number = 0) {
  const [count, setCount] = useState(initialValue);

  const increment = useCallback(() => setCount((c) => c + 1), []);
  const decrement = useCallback(() => setCount((c) => c - 1), []);
  const reset = useCallback(() => setCount(initialValue), [initialValue]);

  const derivedValue = useMemo(() => {
    return {
      doubled: count * 2,
      squared: count * count,
      isPositive: count > 0,
    };
  }, [count]);

  return { count, increment, decrement, reset, ...derivedValue };
}
```

## Error Boundaries

### Error Boundary Hook Pattern
```tsx
import { Component, type ReactNode, type ErrorInfo } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <h1>Something went wrong</h1>;
    }
    return this.props.children;
  }
}
```

## Key Points
- Context eliminates prop drilling for shared state
- Custom hooks encapsulate reusable stateful logic
- Always provide a default value or handle undefined context
- Split large contexts to prevent unnecessary re-renders
- Memoize context values with useMemo
- Custom hooks should start with "use" prefix
- Combine multiple small contexts rather than one large one
- useCallback and useMemo optimize hook performance
- Custom hooks compose like regular functions
- Error boundaries catch rendering errors gracefully
- Context provider nesting order matters for component hierarchy
- Local state is preferred over context for non-shared data
- Custom hooks can return multiple values as tuple or object
- TypeScript improves context and hook type safety
- useReducer is preferable for complex state logic in hooks
