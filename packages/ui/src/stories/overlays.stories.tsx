import type { Meta, StoryObj } from '@storybook/react-vite';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/index';

const meta = {
  title: 'Overlay/Patterns',
  component: Popover,
  subcomponents: { HoverCard, Tooltip, Sheet, Drawer, AlertDialog },
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Overlay primitives for lightweight hints, side panels, drawers, and confirmation flows.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Popover>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PopoverHoverAndTooltip: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">Open popover</Button>
        </PopoverTrigger>
        <PopoverContent className="space-y-2">
          <p className="font-medium">Shared overlay</p>
          <p className="text-muted-foreground text-sm">
            Useful for lightweight contextual controls.
          </p>
        </PopoverContent>
      </Popover>

      <HoverCard openDelay={0}>
        <HoverCardTrigger asChild>
          <Button variant="ghost">Hover card</Button>
        </HoverCardTrigger>
        <HoverCardContent>
          <p className="font-medium">Preview details</p>
          <p className="text-muted-foreground text-sm">
            Great for non-blocking secondary information.
          </p>
        </HoverCardContent>
      </HoverCard>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="secondary">Tooltip</Button>
        </TooltipTrigger>
        <TooltipContent>Shared action hint</TooltipContent>
      </Tooltip>
    </div>
  ),
};

export const SheetDrawerAndAlertDialog: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline">Open sheet</Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Project settings</SheetTitle>
            <SheetDescription>
              Configure a side panel without leaving the page.
            </SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>

      <Drawer>
        <DrawerTrigger asChild>
          <Button variant="outline">Open drawer</Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Mobile action sheet</DrawerTitle>
            <DrawerDescription>
              Useful for bottom-aligned flows on smaller viewports.
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <Button>Confirm</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive">Open alert dialog</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete story?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone and will remove the example from the
              shared showcase.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  ),
};
