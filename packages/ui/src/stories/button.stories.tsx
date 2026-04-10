import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArrowRightIcon, Trash2Icon } from 'lucide-react';

import { Button } from '@/index';

const meta = {
  title: 'Core/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    children: 'Continue',
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

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
