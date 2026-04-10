import type { Meta, StoryObj } from '@storybook/react-vite';

import { Input, Label, Textarea } from '@/index';

const meta = {
  title: 'Forms/Input',
  component: Input,
  subcomponents: { Textarea },
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Shared text input primitives for standard forms, settings panels, and inline editing.',
      },
    },
  },
  args: {
    type: 'email',
    placeholder: 'name@example.com',
    disabled: false,
  },
} satisfies Meta<typeof Input>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div className="w-[360px] space-y-2">
      <Label htmlFor="email">Email</Label>
      <Input id="email" {...args} />
    </div>
  ),
};

export const FormStack: Story = {
  render: () => (
    <div className="w-[420px] space-y-4">
      <div className="space-y-2">
        <Label htmlFor="project-name">Project Name</Label>
        <Input id="project-name" placeholder="UI Storybook" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" placeholder="Shared showcase for components and themes." />
      </div>
    </div>
  ),
};
