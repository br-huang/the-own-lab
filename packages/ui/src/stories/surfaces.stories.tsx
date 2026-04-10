import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChevronDownIcon } from 'lucide-react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Avatar,
  AvatarFallback,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ScrollArea,
  Separator,
} from '@/index';

const meta = {
  title: 'Display/Surfaces',
  component: Card,
  subcomponents: { Avatar, Accordion, ScrollArea, Separator },
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Surface primitives for grouping information, showing identity, and handling scrollable content.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

export const CardAndAvatar: Story = {
  render: () => (
    <div className="grid w-[760px] gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="flex-row items-center gap-4 space-y-0">
          <Avatar>
            <AvatarFallback>UI</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <CardTitle>UI Platform</CardTitle>
            <CardDescription>Shared primitives for all apps</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          This card demonstrates base tokens, spacing, borders, and typography.
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Changelog</CardTitle>
          <CardDescription>Recent updates to the shared library</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span>Storybook setup</span>
            <span className="text-muted-foreground">Today</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span>Sidebar added</span>
            <span className="text-muted-foreground">Earlier</span>
          </div>
        </CardContent>
      </Card>
    </div>
  ),
};

export const AccordionAndScrollArea: Story = {
  render: () => (
    <div className="grid w-[760px] gap-6 md:grid-cols-[1fr_280px]">
      <Accordion type="single" collapsible className="w-full rounded-lg border px-4">
        <AccordionItem value="item-1">
          <AccordionTrigger>Why use shared primitives?</AccordionTrigger>
          <AccordionContent>
            Shared components reduce duplication and keep visual behavior consistent across apps.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>What belongs in ui?</AccordionTrigger>
          <AccordionContent>
            Generic controls, overlays, navigation, and reusable compositions.
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <ScrollArea className="h-[220px] rounded-lg border p-4">
        <div className="space-y-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center gap-2 font-medium">
                <ChevronDownIcon className="size-4" />
                Update {index + 1}
              </div>
              <p className="text-muted-foreground text-sm">
                Shared Storybook stories make it easier to inspect surface-level consistency and
                interaction states.
              </p>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  ),
};
