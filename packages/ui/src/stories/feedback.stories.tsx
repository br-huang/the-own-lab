import type { Meta, StoryObj } from '@storybook/react-vite';
import { AlertCircleIcon, CheckCircle2Icon, InfoIcon } from 'lucide-react';

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Progress,
  Skeleton,
} from '@/index';

const meta = {
  title: 'Feedback/Status',
  component: Alert,
  subcomponents: { Badge, Progress, Skeleton },
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Status feedback patterns built from alert, badge, progress, and skeleton primitives.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Alert>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Alerts: Story = {
  render: () => (
    <div className="w-[520px] space-y-4">
      <Alert>
        <InfoIcon />
        <AlertTitle>Workspace ready</AlertTitle>
        <AlertDescription>
          Shared UI tokens and Storybook setup are now available.
        </AlertDescription>
      </Alert>
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>Action required</AlertTitle>
        <AlertDescription>
          A component is missing a story and should be added before release.
        </AlertDescription>
      </Alert>
    </div>
  ),
};

export const BadgesAndProgress: Story = {
  render: () => (
    <div className="w-[420px] space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Badge>Stable</Badge>
        <Badge variant="secondary">Preview</Badge>
        <Badge variant="outline">Experimental</Badge>
        <Badge variant="destructive">Deprecated</Badge>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Story coverage</span>
          <span className="text-muted-foreground">68%</span>
        </div>
        <Progress value={68} />
      </div>
    </div>
  ),
};

export const LoadingStates: Story = {
  render: () => (
    <div className="w-[360px] space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
      <div className="rounded-lg border p-4">
        <div className="mb-3 flex items-center gap-2">
          <CheckCircle2Icon className="text-muted-foreground size-4" />
          <span className="text-sm font-medium">Preparing preview</span>
        </div>
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  ),
};
