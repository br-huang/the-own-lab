import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArrowRightIcon, Trash2Icon } from 'lucide-react';

import { Button } from '@/index';

const meta = {
  title: 'Core/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Primary action control with shared variants and sizes for app-wide usage.',
      },
    },
  },
  args: {
    children: 'Continue',
    variant: 'default',
    size: 'default',
    disabled: false,
  },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: ['default', 'secondary', 'outline', 'ghost', 'link', 'destructive'],
    },
    size: {
      control: 'inline-radio',
      options: ['default', 'sm', 'lg', 'icon'],
    },
    asChild: { control: 'boolean' },
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Interactive baseline button with controls for common props.',
      },
    },
  },
};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button>Default</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
      <Button variant="destructive">Delete</Button>
    </div>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button>
        Continue
        <ArrowRightIcon />
      </Button>
      <Button variant="destructive">
        <Trash2Icon />
        Remove
      </Button>
      <Button size="icon" variant="outline" aria-label="Next">
        <ArrowRightIcon />
      </Button>
    </div>
  ),
};
