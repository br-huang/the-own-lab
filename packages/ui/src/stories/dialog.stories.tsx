import type { Meta, StoryObj } from '@storybook/react-vite';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
} from '@/index';

const meta = {
  title: 'Overlay/Dialog',
  component: Dialog,
  subcomponents: { DialogContent },
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Modal dialog primitives built on Radix, suitable for focused tasks that interrupt the current flow.',
      },
    },
  },
} satisfies Meta<typeof Dialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Typical profile-edit modal using the shared header, body, and footer slots.',
      },
    },
  },
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Open Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            Update the shared profile details used by your team.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" defaultValue="Rong" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="handle">Handle</Label>
            <Input id="handle" defaultValue="@rong" />
          </div>
        </div>
        <DialogFooter>
          <Button>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};
