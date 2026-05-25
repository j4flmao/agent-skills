# Design System Testing

## Testing Pyramid for Design Systems

```
      ╱╲
     ╱  ╲        Visual/Chromatic (few)
    ╱    ╲
   ╱──────╲      Integration stories (some)
  ╱        ╲
 ╱──────────╲    Unit + A11y tests (many)
╱            ╲
```

## Unit Testing Patterns

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Submit</Button>)
    expect(screen.getByRole('button')).toHaveTextContent('Submit')
  })

  it('applies variant classes correctly', () => {
    const { rerender } = render(<Button variant="primary">Btn</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-primary')

    rerender(<Button variant="ghost">Btn</Button>)
    expect(screen.getByRole('button')).toHaveClass('hover:bg-accent')
  })

  it('handles click events', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled when disabled prop is set', () => {
    render(<Button disabled>Click</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('shows loading state', () => {
    render(<Button loading>Save</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
    expect(screen.getByText('Save')).toBeInTheDocument()
  })
})
```

## Accessibility Testing

```typescript
import { axe } from 'jest-axe'

it('has no accessibility violations', async () => {
  const { container } = render(
    <div>
      <label htmlFor="name">Name</label>
      <Input id="name" />
    </div>
  )
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})

// Run a11y on every component variant
const variants = ['primary', 'secondary', 'ghost'] as const
it.each(variants)('Button variant %s is accessible', async (variant) => {
  const { container } = render(<Button variant={variant}>Test</Button>)
  expect(await axe(container)).toHaveNoViolations()
})
```

## Visual Regression Testing

```typescript
// Chromatic storybook addon
import { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'

const meta = { component: Button, title: 'Components/Button' } satisfies Meta<typeof Button>
export default meta

export const Primary: StoryObj = { args: { variant: 'primary', children: 'Click Me' } }
export const Secondary: StoryObj = { args: { variant: 'secondary', children: 'Cancel' } }
export const Disabled: StoryObj = { args: { ...Primary.args, disabled: true } }
export const Loading: StoryObj = { args: { ...Primary.args, loading: true } }

// Chromatic compares screenshots on every PR
```

## Interaction Testing

```typescript
import { userEvent, within, expect, fn } from '@storybook/test'

export const Interactive: StoryObj = {
  args: { onClick: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button'))
    expect(args.onClick).toHaveBeenCalled()
  },
}
```

## Snapshot Testing (Use Sparingly)

```typescript
it('matches snapshot', () => {
  const { container } = render(<Button variant="primary">Submit</Button>)
  expect(container).toMatchSnapshot()
})
```

Snapshots are brittle. Use only for stable, rarely-changing components. Prefer Chromatic for visual diffs.

## Responsive Testing

```typescript
it('renders mobile and desktop layouts', () => {
  const { container: mobile } = render(<ResponsiveCard />)
  expect(mobile.firstChild).toHaveStyle({ flexDirection: 'column' })

  // Simulate desktop
  window.innerWidth = 1024
  window.dispatchEvent(new Event('resize'))
  expect(mobile.firstChild).toHaveStyle({ flexDirection: 'row' })
})
```

## Test Coverage Targets

| Area | Target | Tool |
|------|--------|------|
| Component rendering | 100% | Testing Library |
| Variant rendering | 100% | Testing Library |
| Event handling | 100% | userEvent |
| Accessibility | 100% | jest-axe |
| Visual regression | All stories | Chromatic |
| Interaction stories | Key flows | Storybook play |
| Responsive states | 2+ breakpoints | Chromatic viewports |

## Testing Checklist

- [ ] Every component has a rendering test
- [ ] Every variant has a rendering test
- [ ] Every event handler is tested (click, change, keydown)
- [ ] Disabled/loading states are tested
- [ ] Accessibility violations = 0 per variant
- [ ] Visual regression tested for all stories
- [ ] Keyboard navigation tested for interactive components
- [ ] Ref forwarding verified for interactive elements
- [ ] className prop merging works correctly
