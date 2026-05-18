# Writing Stories Reference

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
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    disabled: { control: 'boolean' },
    onClick: { action: 'clicked' },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;
```

## Individual Stories

```tsx
export const Primary: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    children: 'Click Me',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Cancel',
  },
};

export const Disabled: Story = {
  args: {
    ...Primary.args,
    disabled: true,
  },
};
```

## Render Function

```tsx
export const WithIcon: Story = {
  render: (args) => (
    <Button {...args}>
      <svg className="h-4 w-4" viewBox="0 0 24 24">{/* icon path */}</svg>
      {args.children}
    </Button>
  ),
  args: {
    ...Primary.args,
    children: 'Save',
  },
};
```

## Play Function (Interaction Tests)

```tsx
import { userEvent, within, expect } from '@storybook/test';

export const Interactive: Story = {
  args: { ...Primary.args },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: /click me/i });

    await userEvent.click(button);
    await expect(button).toHaveFocus();

    await userEvent.hover(button);
    // Assert hover styles applied
  },
};
```

## States Coverage

```tsx
export const Loading: Story = {
  args: {
    ...Primary.args,
    loading: true,
    children: 'Saving...',
  },
};

export const LongText: Story = {
  args: {
    children: 'Super long button text that should not break layout',
    style: { maxWidth: 200 },
  },
};
```

## Responsive Stories

```tsx
export const Mobile: Story = {
  args: { ...Primary.args },
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
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

## Args Composition

```tsx
export const PrimarySmall: Story = {
  args: {
    ...Primary.args,
    size: 'sm',
  },
};

export const PrimaryLarge: Story = {
  args: {
    ...Primary.args,
    size: 'lg',
  },
};
```

## CSF 3.x Patterns Summary

| Pattern               | Usage                                      |
|-----------------------|--------------------------------------------|
| `satisfies Meta<C>`   | Type-safe meta definition                  |
| `type Story = StoryObj<typeof meta>` | Derive story type from meta |
| `args`                | Set component props per story              |
| `render`              | Custom render for complex compositions     |
| `play`                | Interaction and state testing              |
| `parameters`          | Addon config per story (viewport, a11y)    |
| `decorators`          | Wrapper components per story               |
| `argTypes`            | Control type, options, action config       |
