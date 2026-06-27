# State Management

## Overview
State management in Remix fundamentally differs from traditional React SPAs (Single Page Applications). Instead of relying heavily on complex client-side state management libraries (like Redux, MobX, or Zustand) for server state, Remix uses the URL, Loaders, and Actions as the primary mechanisms for state synchronization.

## 1. The URL is the Source of Truth
In Remix, the URL should dictate what data is shown on the screen.

### Search Parameters for Filtering
```typescript
import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData, useSubmit, Form } from '@remix-run/react';
import { db } from '~/utils/db.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const status = url.searchParams.get('status') || 'active';
  
  const tasks = await db.task.findMany({ where: { status } });
  return json({ tasks, status });
}

export default function TaskList() {
  const { tasks, status } = useLoaderData<typeof loader>();
  const submit = useSubmit();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    submit(e.target.form); // Automatically updates URL and triggers loader
  };

  return (
    <div>
      <Form method="get">
        <select name="status" defaultValue={status} onChange={handleChange}>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="all">All</option>
        </select>
      </Form>
      <ul>
        {tasks.map(task => <li key={task.id}>{task.title}</li>)}
      </ul>
    </div>
  );
}
```

## 2. Server State Synchronization
Remix automatically revalidates (re-runs loaders) after an Action completes. This guarantees that your UI is always reflecting the most recent server state without manual cache invalidation.

```text
+---------------------+
| User Submits Form   |
+---------+-----------+
          |
          v
+---------+-----------+
| Action Function     | (Mutates Database)
+---------+-----------+
          |
          v
+---------+-----------+
| All Active Loaders  | (Re-run automatically)
+---------+-----------+
          |
          v
+---------+-----------+
| UI Re-renders       | (With fresh data)
+---------------------+
```

## 3. Optimistic UI
While Remix automatically revalidates, network latency still exists. Optimistic UI makes apps feel instantaneous.

```typescript
import { useFetcher } from '@remix-run/react';

export default function TaskItem({ task }) {
  const fetcher = useFetcher();
  
  // Optimistically assume the mutation succeeds
  const isCompleted = fetcher.formData 
    ? fetcher.formData.get('status') === 'completed'
    : task.status === 'completed';

  return (
    <li>
      <span style={{ textDecoration: isCompleted ? 'line-through' : 'none' }}>
        {task.title}
      </span>
      <fetcher.Form method="post" action="/tasks/update">
        <input type="hidden" name="id" value={task.id} />
        <input type="hidden" name="status" value={isCompleted ? 'active' : 'completed'} />
        <button type="submit">Toggle</button>
      </fetcher.Form>
    </li>
  );
}
```

## 4. Client-Only State
For purely ephemeral UI state (e.g., whether a modal is open, or a dropdown is toggled), standard React `useState` and `useReducer` remain the correct choices.

```typescript
import { useState } from 'react';

export default function UserProfile() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div>
      <button onClick={() => setIsModalOpen(true)}>Edit Profile</button>
      {isModalOpen && (
        <div className="modal">
          {/* Modal Content */}
          <button onClick={() => setIsModalOpen(false)}>Close</button>
        </div>
      )}
    </div>
  );
}
```

## 5. Global Client State Context
If you need to share client-only state across many components (e.g., theme preferences before they are saved to a cookie), React Context is appropriate.

## Best Practices
1. Prefer URL state (search params) over `useState` for filters and pagination.
2. Rely on Remix's automatic revalidation instead of manually managing server state in the client.
3. Use `useFetcher` for mutations that don't require navigation.
4. Implement Optimistic UI for frequently used interactions.
5. Keep ephemeral UI state locally in components using `useState`.

## Anti-Patterns
1. Using Redux or Apollo Client to cache server data.
2. Passing data deeply down the component tree manually instead of using `useLoaderData` in nested routes.
3. Forgetting to handle loading states using `useNavigation`.
4. Over-using React Context for things that should be in the URL.
5. Modifying state directly instead of allowing Remix Actions to handle mutations.
