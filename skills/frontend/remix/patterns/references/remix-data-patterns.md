# Remix Data Patterns

## Dependent Data Loading

```typescript
// app/routes/users.$userId.projects.$projectId.tsx
import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData, useRouteLoaderData } from '@remix-run/react'
import { db } from '~/db.server'

export async function loader({ params }: LoaderFunctionArgs) {
  const project = await db.project.findUnique({
    where: { id: params.projectId },
    include: { tasks: true, team: true },
  })

  if (!project) throw new Response('Not Found', { status: 404 })
  return json({ project })
}

export default function ProjectDetail() {
  const { project } = useLoaderData<typeof loader>()
  // Access parent route data
  const { user } = useRouteLoaderData<typeof userLoader>(
    'routes/users.$userId',
  )

  return (
    <div>
      <h1>{project.name}</h1>
      <p>Owner: {user.name}</p>
      <h2>Tasks ({project.tasks.length})</h2>
      <ul>
        {project.tasks.map(task => (
          <li key={task.id}>{task.title}</li>
        ))}
      </ul>
    </div>
  )
}
```

## Optimistic UI with useFetcher

```typescript
// app/routes/projects.$projectId.tsx
import { json, type ActionFunctionArgs } from '@remix-run/node'
import { Form, useFetcher, useLoaderData } from '@remix-run/react'
import { db } from '~/db.server'

export async function action({ params, request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const intent = formData.get('intent')

  if (intent === 'toggle-favorite') {
    const project = await db.project.findUnique({
      where: { id: params.projectId },
    })

    await db.project.update({
      where: { id: params.projectId },
      data: { isFavorited: !project?.isFavorited },
    })

    return json({ success: true })
  }

  return null
}

export default function Project() {
  const { project } = useLoaderData<typeof loader>()
  const fetcher = useFetcher()
  const isFavorited = fetcher.formData
    ? fetcher.formData.get('intent') === 'toggle-favorite'
      ? !project.isFavorited
      : project.isFavorited
    : project.isFavorited

  return (
    <div>
      <h1>{project.name}</h1>
      <fetcher.Form method="post">
        <input type="hidden" name="intent" value="toggle-favorite" />
        <button type="submit" className={isFavorited ? 'favorited' : ''}>
          {isFavorited ? '★' : '☆'}
        </button>
      </fetcher.Form>
    </div>
  )
}
```

## Search with URL Params

```typescript
// app/routes/projects.tsx
import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { Form, useLoaderData, useSearchParams } from '@remix-run/react'
import { db } from '~/db.server'
import { useDebounce } from '~/hooks/use-debounce'

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const search = url.searchParams.get('q') || ''
  const status = url.searchParams.get('status') || 'all'
  const sort = url.searchParams.get('sort') || 'updated'

  const projects = await db.project.findMany({
    where: {
      AND: [
        search ? { name: { contains: search } } : {},
        status !== 'all' ? { status } : {},
      ],
    },
    orderBy: sort === 'updated' ? { updatedAt: 'desc' } : { name: 'asc' },
  })

  return json({ projects })
}

export default function Projects() {
  const { projects } = useLoaderData<typeof loader>()
  const [searchParams] = useSearchParams()

  return (
    <div>
      <Form method="get" className="flex gap-4 mb-6">
        <input
          name="q"
          defaultValue={searchParams.get('q') || ''}
          placeholder="Search projects..."
          type="search"
        />
        <select name="status" defaultValue={searchParams.get('status') || 'all'}>
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
        </select>
      </Form>
      <div className="grid gap-4">
        {projects.map(project => (
          <div key={project.id}>{project.name}</div>
        ))}
      </div>
    </div>
  )
}
```

## Key Points

- Use useRouteLoaderData for accessing parent route data
- Use useFetcher for non-navigation data mutations
- Implement optimistic updates with fetcher.formData
- Use Form with GET for search and filtering
- Submit forms with intent fields for multiple actions
- Use URL search params for filter state
- Implement debounced search with custom hooks
- Handle loading states with useNavigation
- Return proper 404 responses for missing resources
- Use shouldRevalidate for granular revalidation
- Implement prefetching with prefetch prop on links
- Handle file uploads with multipart form data
