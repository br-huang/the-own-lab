import type { Meta, StoryObj } from '@storybook/react-vite';
import { toast } from 'sonner';

import { Button, Toaster } from '@/index';

const meta = {
  title: 'Feedback/Toast',
  component: Toaster,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Shared Sonner toaster with project theme tokens applied to toast surfaces, descriptions, and action buttons.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Toaster>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Toaster />
      <Button
        onClick={() =>
          toast('Storybook updated', {
            description: 'Autodocs and more primitive stories were added.',
          })
        }
      >
        Show default toast
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast.success('Release ready', {
            description: 'All validation tasks passed for the ui package.',
          })
        }
      >
        Show success toast
      </Button>
      <Button
        variant="destructive"
        onClick={() =>
          toast.error('Action failed', {
            description: 'A required story is still missing.',
          })
        }
      >
        Show error toast
      </Button>
    </div>
  ),
};
