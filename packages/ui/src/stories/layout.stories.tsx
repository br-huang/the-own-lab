import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChevronDownIcon } from 'lucide-react';

import {
  AspectRatio,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/index';

const meta = {
  title: 'Layout/Compositions',
  component: ResizablePanelGroup,
  subcomponents: { AspectRatio, Collapsible },
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Layout primitives for split panes, fixed ratios, and progressive disclosure sections.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ResizablePanelGroup>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ResizableWorkspace: Story = {
  render: () => (
    <div className="w-[860px] rounded-lg border">
      <ResizablePanelGroup direction="horizontal" className="min-h-[320px]">
        <ResizablePanel defaultSize={30} minSize={20}>
          <div className="bg-muted/40 flex h-full items-center justify-center p-6">
            Navigation panel
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={70}>
          <div className="flex h-full items-center justify-center p-6">
            Main content area
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  ),
};

export const AspectRatioAndCollapsible: Story = {
  render: () => (
    <div className="grid w-[860px] gap-6 md:grid-cols-[320px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Aspect ratio preview</CardTitle>
        </CardHeader>
        <CardContent>
          <AspectRatio ratio={16 / 9} className="bg-muted overflow-hidden rounded-md border">
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              16:9 media area
            </div>
          </AspectRatio>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Release notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Collapsible defaultOpen className="space-y-3">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between px-0">
                Shared UI rollout
                <ChevronDownIcon />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="text-muted-foreground space-y-2 text-sm">
              <p>Autodocs now includes component descriptions and prop tables.</p>
              <p>Remaining primitives are being added in grouped showcase stories.</p>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </div>
  ),
};
