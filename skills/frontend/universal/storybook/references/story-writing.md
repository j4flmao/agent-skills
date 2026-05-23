# Story Writing Reference

## CSF 3.x Structure

```tsx
// Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
    loading: { control: 'boolean' },
    onClick: { action: 'clicked' },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;
```

## Story Variants

```tsx
export const Primary: Story = {
  args: { variant: 'primary', size: 'md', children: 'Click Me' },
};

export const Secondary: Story = {
  args: { variant: 'secondary', children: 'Cancel' },
};

export const Ghost: Story = {
  args: { variant: 'ghost', children: 'More info' },
};

export const Disabled: Story = {
  args: { ...Primary.args, disabled: true },
};

export const Loading: Story = {
  args: { ...Primary.args, loading: true, children: 'Saving...' },
};

export const LongText: Story = {
  args: { children: 'Super long button text that should not break layout' },
};
```

## Render Function (Complex Compositions)

Use when the component needs wrapping elements or composition:

```tsx
export const WithIcon: Story = {
  render: (args) => (
    <Button {...args}>
      <svg className="h-4 w-4" viewBox="0 0 24 24"><path d="..." /></svg>
      {args.children}
    </Button>
  ),
  args: { ...Primary.args, children: 'Save' },
};
```

## Play Function (Interaction Tests)

```tsx
import { userEvent, within, expect, fn } from '@storybook/test';

export const Interactive: Story = {
  args: { onClick: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: /click me/i });
    await userEvent.click(button);
    await expect(button).toHaveFocus();
    expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

export const FormSubmit: Story = {
  args: { onSubmit: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText('Email');
    await userEvent.type(input, 'test@example.com');
    await userEvent.click(canvas.getByRole('button', { name: /submit/i }));
    expect(args.onSubmit).toHaveBeenCalledWith({ email: 'test@example.com' });
  },
};
```

## Args Composition

```tsx
export const PrimarySmall: Story = {
  args: { ...Primary.args, size: 'sm' },
};

export const PrimaryLarge: Story = {
  args: { ...Primary.args, size: 'lg' },
};
```

## Decorators

```tsx
// Per-story decorator
export const Centered: Story = {
  args: { ...Primary.args },
  decorators: [
    (Story) => (
      <div className="flex h-64 items-center justify-center bg-gray-100">
        <Story />
      </div>
    ),
  ],
};
```

## Parameters for Addon Configuration

```tsx
export const Mobile: Story = {
  args: { ...Primary.args },
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
};

export const DarkMode: Story = {
  args: { ...Primary.args },
  parameters: {
    themes: { themeOverride: 'dark' },
  },
};
```

## States Coverage Matrix

| State | Why Test | Example |
|-------|----------|---------|
| Default | Base rendering | Primary variant, md size |
| Hover | Visual feedback | test via play: `userEvent.hover()` |
| Active | Press state | test via play: `userEvent.pointer({ keys: '[MouseDown]' })` |
| Disabled | Non-interactive | `disabled: true` |
| Loading | Async state | `loading: true` |
| Error | Validation state | `error: "Invalid input"` |
| Empty (lists) | No data | `items: []` |
| Long content | Text overflow | `children: "very long text..."` |
| Mobile viewport | Responsive | `parameters.viewport` |

## CSF 3.x Patterns Summary

| Pattern | Usage |
|---------|-------|
| `satisfies Meta<C>` | Type-safe meta definition |
| `type Story = StoryObj<typeof meta>` | Derive story type from meta |
| `args` | Set component props per story |
| `render` | Custom render for complex compositions |
| `play` | Interaction and state testing |
| `parameters` | Addon config per story (viewport, a11y) |
| `decorators` | Wrapper components per story |
| `argTypes` | Control type, options, action config |
