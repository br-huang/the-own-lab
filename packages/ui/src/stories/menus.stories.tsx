import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChevronsUpDownIcon, CommandIcon, SparklesIcon } from 'lucide-react';

import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from '@/index';

const meta = {
  title: 'Navigation/Menus',
  component: Command,
  subcomponents: { DropdownMenu, ContextMenu, Menubar },
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Command and menu primitives for searchable actions, top navigation menus, and contextual menus.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Command>;

export default meta;

type Story = StoryObj<typeof meta>;

export const CommandPalette: Story = {
  render: () => (
    <div className="w-[520px] rounded-lg border shadow-sm">
      <Command>
        <CommandInput placeholder="Search components and actions..." />
        <CommandList>
          <CommandEmpty>No matching action found.</CommandEmpty>
          <CommandGroup heading="Quick actions">
            <CommandItem>
              <SparklesIcon />
              Generate stories
              <CommandShortcut>G S</CommandShortcut>
            </CommandItem>
            <CommandItem>
              <CommandIcon />
              Open command docs
              <CommandShortcut>D O</CommandShortcut>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Recent">
            <CommandItem>Button</CommandItem>
            <CommandItem>Sidebar</CommandItem>
            <CommandItem>Chart</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  ),
};

export const MenuPatterns: Story = {
  render: () => (
    <div className="flex flex-wrap items-start gap-6">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            Actions
            <ChevronsUpDownIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Duplicate</DropdownMenuItem>
          <DropdownMenuItem>Rename</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>New Story</MenubarItem>
            <MenubarItem>Open Docs</MenubarItem>
            <MenubarSeparator />
            <MenubarItem>Export</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>View</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>Show Grid</MenubarItem>
            <MenubarItem>Toggle Theme</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>

      <ContextMenu>
        <ContextMenuTrigger className="bg-muted text-muted-foreground flex h-28 w-56 items-center justify-center rounded-lg border border-dashed text-sm">
          Right click this area
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem>Inspect</ContextMenuItem>
          <ContextMenuItem>Copy link</ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem variant="destructive">Remove</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  ),
};
