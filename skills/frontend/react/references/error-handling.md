# React Error Handling and Resilience

A resilient React application degrades gracefully when errors occur, ensuring the user experience is not entirely compromised.

## Table of Contents
1. [React Error Boundaries](#error-boundaries)
2. [Global Unhandled Rejection Tracking](#global-tracking)
3. [Fallback UI Patterns](#fallback-ui)
4. [API Error Normalization](#api-errors)
5. [Retry Logic and Offline Modes](#retry-and-offline)

---

## 1. React Error Boundaries

Error Boundaries catch JavaScript errors anywhere in their child component tree, log those errors, and display a fallback UI instead of crashing the whole component tree.

**Note:** They do not catch errors in:
- Event handlers
- Asynchronous code (e.g., `setTimeout` or `requestAnimationFrame` callbacks)
- Server-side rendering
- Errors thrown in the boundary itself

```tsx
import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can also log the error to an error reporting service here
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}
```

Usage:
```tsx
<ErrorBoundary fallback={<p>Something went wrong in this section.</p>}>
  <WidgetComponent />
</ErrorBoundary>
```

---

## 2. Global Unhandled Rejection Tracking

To catch errors outside of rendering (e.g., fetch failures, event handlers), you need global event listeners. Tools like Sentry or Datadog automate this.

```tsx
// Sentry Initialization Pattern
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

Sentry.init({
  dsn: "https://examplePublicKey@o0.ingest.sentry.io/0",
  integrations: [new BrowserTracing()],
  tracesSampleRate: 1.0,
  
  // Custom hook to filter out benign errors
  beforeSend(event, hint) {
    const error = hint.originalException;
    if (error && error.message.includes('ResizeObserver')) {
      return null; // Drop error
    }
    return event;
  },
});
```

---

## 3. Fallback UI Patterns

Instead of wrapping the entire application in a single Error Boundary, use targeted boundaries for different layout sections (Sidebar, Main Content, Widget).

- **Skeleton Screens:** Show during loading states to prevent layout shift.
- **Empty States:** Show when data fetching succeeds but returns no data.
- **Error States:** Displayed by the Error Boundary. Include a "Retry" button to reset the boundary state.

---

## 4. API Error Normalization

Ensure your frontend handles backend errors consistently by creating a standardized error response format and an Axios/Fetch interceptor.

```typescript
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Normalize error object
    const customError = {
      message: 'An unexpected error occurred',
      status: 500,
      code: 'UNKNOWN_ERROR',
    };

    if (error.response) {
      // Server responded with a status code outside of 2xx
      customError.message = error.response.data?.message || 'Server Error';
      customError.status = error.response.status;
      customError.code = error.response.data?.code;
    } else if (error.request) {
      // Request made but no response received (Network Error)
      customError.message = 'Network error. Please check your connection.';
      customError.status = 0;
      customError.code = 'NETWORK_ERROR';
    }

    // You can dispatch a global toast notification here
    return Promise.reject(customError);
  }
);
```

---

## 5. Retry Logic and Offline Modes

### Auto-Retries (React Query)
React Query handles retries out of the box for transient network failures.

```tsx
const { data } = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  retry: 3, // Retry failed requests 3 times
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
});
```

### Offline Mode
Detect network status to inform the user.

```tsx
import { useState, useEffect } from 'react';

export function useNetworkStatus() {
  const [isOnline, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
```

*End of Document*
