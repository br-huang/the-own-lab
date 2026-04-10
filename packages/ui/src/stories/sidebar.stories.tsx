import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  BarChart3Icon,
  BookOpenIcon,
  HomeIcon,
  Settings2Icon,
} from 'lucide-react';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/index';

const meta = {
  title: 'Navigation/Sidebar',
  component: Sidebar,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Sidebar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Button variant="outline" className="justify-start">
            UI Workspace
          </Button>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive tooltip="Overview">
                    <HomeIcon />
                    <span>Overview</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Components">
                    <BookOpenIcon />
                    <span>Components</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Analytics">
                    <BarChart3Icon />
                    <span>Analytics</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Settings">
                    <Settings2Icon />
                    <span>Settings</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <div className="flex items-center gap-3 border-b p-4">
          <SidebarTrigger />
          <div>
            <p className="font-medium">Shared UI Storybook</p>
            <p className="text-muted-foreground text-sm">
              Preview the sidebar with real layout context.
            </p>
          </div>
        </div>
        <div className="grid gap-4 p-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Navigation primitives</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              The sidebar lives in the shared package so apps can reuse the same
              layout shell.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Theme validation</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              Toggle the Storybook theme toolbar to verify sidebar tokens in
              both light and dark mode.
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  ),
};
