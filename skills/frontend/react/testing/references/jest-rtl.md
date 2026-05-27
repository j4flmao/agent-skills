# Jest and React Testing Library Patterns

## Overview
Jest is a JavaScript test runner with built-in assertions, mocking, and code coverage. React Testing Library (RTL) encourages testing components from user perspectives. This reference covers test structure, queries, events, async patterns, mocking, and best practices.

## Test Structure

### Basic Test Setup
```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Greeting } from './Greeting';

describe('Greeting', () => {
  it('renders the greeting text', () => {
    render(<Greeting name="Alice" />);
    expect(screen.getByText('Hello, Alice!')).toBeInTheDocument();
  });

  it('updates greeting when name changes', async () => {
    const user = userEvent.setup();
    render(<Greeting name="Alice" />);

    await user.click(screen.getByRole('button', { name: /change/i }));
    expect(screen.getByText('Hello, Bob!')).toBeInTheDocument();
  });
});
```

## Queries

### Query Types and Priority
```typescript
import { render, screen } from '@testing-library/react';

it('demonstrates query priorities', () => {
  render(<MyComponent />);

  // Priority 1: Accessible to everyone
  screen.getByRole('button', { name: /submit/i });
  screen.getByLabelText(/email/i);
  screen.getByPlaceholderText('Enter your name');
  screen.getByText(/welcome/i);
  screen.getByDisplayValue('default value');

  // Priority 2: Semantic queries
  screen.getByAltText('User avatar');
  screen.getByTitle('Close dialog');

  // Priority 3: Test IDs (last resort)
  screen.getByTestId('submit-button');
});
```

## User Events

### Realistic User Interactions
```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

it('handles form submission', async () => {
  const user = userEvent.setup();
  const onSubmit = jest.fn();
  render(<LoginForm onSubmit={onSubmit} />);

  await user.type(screen.getByLabelText(/email/i), 'user@example.com');
  await user.type(screen.getByLabelText(/password/i), 'password123');
  await user.click(screen.getByRole('button', { name: /sign in/i }));

  expect(onSubmit).toHaveBeenCalledWith({
    email: 'user@example.com',
    password: 'password123',
  });
});

it('handles keyboard navigation', async () => {
  const user = userEvent.setup();
  render<NavigationMenu />;

  await user.tab();
  expect(screen.getByText('Home')).toHaveFocus();

  await user.keyboard('{ArrowDown}');
  expect(screen.getByText('About')).toHaveFocus();

  await user.keyboard('{Enter}');
  expect(screen.getByText('About Page')).toBeInTheDocument();
});
```

## Async Patterns

### Waiting for Elements
```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

it('shows loading state while fetching', async () => {
  render(<UserProfile userId="123" />);

  expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

  const name = await screen.findByText('Alice Johnson');
  expect(name).toBeInTheDocument();
  expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
});

it('waits for async update', async () => {
  const user = userEvent.setup();
  render<DataLoader />;

  await user.click(screen.getByRole('button', { name: /load/i }));

  await waitFor(() => {
    expect(screen.getByTestId('data-list').children).toHaveLength(10);
  });
});
```

## Mocking

### Module Mocking
```typescript
// Mock an entire module
jest.mock('../../services/api');

import { fetchUsers } from '../../services/api';
import { UsersList } from './UsersList';

const mockUsers = [
  { id: '1', name: 'Alice', email: 'alice@example.com' },
  { id: '2', name: 'Bob', email: 'bob@example.com' },
];

it('renders users from API', async () => {
  (fetchUsers as jest.Mock).mockResolvedValue(mockUsers);
  render(<UsersList />);

  expect(await screen.findByText('Alice')).toBeInTheDocument();
  expect(screen.getByText('Bob')).toBeInTheDocument();
});

it('handles API error', async () => {
  (fetchUsers as jest.Mock).mockRejectedValue(new Error('Network error'));
  render(<UsersList />);

  expect(await screen.findByText(/error/i)).toBeInTheDocument();
});
```

### Partial Mocking
```typescript
// Mock specific functions from a module
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));
```

## Context Providers

### Testing with Providers
```typescript
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { AuthProvider } from '../../contexts/AuthContext';
import { UserProfile } from './UserProfile';

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ThemeProvider>
      <AuthProvider>
        {ui}
      </AuthProvider>
    </ThemeProvider>
  );
}

it('renders profile with dark theme', () => {
  renderWithProviders(<UserProfile />);
  expect(screen.getByTestId('profile-card')).toHaveStyle({
    backgroundColor: '#1a1a1a',
  });
});
```

## Router Testing

### Memory Router
```typescript
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import userEvent from '@testing-library/user-event';

it('navigates to user detail', async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={['/users']}>
      <Routes>
        <Route path="/users" element={<UsersList />} />
        <Route path="/users/:id" element={<UserDetail />} />
      </Routes>
    </MemoryRouter>
  );

  await user.click(screen.getByText('View Alice'));
  expect(screen.getByText('Alice Johnson Details')).toBeInTheDocument();
});
```

## Custom Render

### Reusable Render Function
```typescript
// test-utils.tsx
import { render, type RenderOptions } from '@testing-library/react';
import { ThemeProvider } from '../contexts/ThemeContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialRoute?: string;
}

function customRender(
  ui: React.ReactElement,
  options?: CustomRenderOptions
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}

export * from '@testing-library/react';
export { customRender as render };
```

## Coverage

### Coverage Configuration
```javascript
// jest.config.js
module.exports = {
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
  ],
  coverageThresholds: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: -10,
    },
  },
};
```

## Key Points
- Prefer accessible queries (role, label, text) over test IDs
- Use userEvent over fireEvent for realistic interactions
- findBy* queries wait for elements to appear asynchronously
- waitFor handles arbitrary async assertions
- Module mocking with jest.mock replaces dependencies
- Custom render functions reduce boilerplate for providers
- MemoryRouter tests routing without a browser
- Cleanup happens automatically between tests
- Mock service worker (MSW) for API mocking at network level
- Coverage thresholds enforce minimum test quality
- Snapshot testing catches unexpected UI changes
- Test behavior, not implementation details
- Avoid testing internal state - test rendered output
- Use data-testid as a last resort for element queries
- Group related tests in describe blocks
- Keep tests focused on a single behavior
- Clear mocks between tests with beforeEach
- Use jest.spyOn for existing object method mocking
