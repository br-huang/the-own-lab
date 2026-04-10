import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
} from 'ui';
import type { SidebarNode } from '@/types/docs';

interface Props {
  sidebar: SidebarNode[];
  title?: string;
  mode: 'desktop' | 'mobile';
}

function SidebarTree({ nodes }: { nodes: SidebarNode[] }) {
  return (
    <SidebarMenu>
      {nodes.map((node) => (
        <SidebarTreeNode key={node.kind === 'link' ? node.href : node.title} node={node} />
      ))}
    </SidebarMenu>
  );
}

function SidebarTreeNode({ node }: { node: SidebarNode }) {
  if (node.kind === 'link') {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={node.active} tooltip={node.title}>
          <a href={node.href} aria-current={node.active ? 'page' : undefined}>
            <span>{node.title}</span>
          </a>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <Collapsible defaultOpen={node.expanded}>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton>
            <span>{node.title}</span>
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {node.children.map((child) =>
              child.kind === 'link' ? (
                <SidebarMenuSubItem key={child.href}>
                  <SidebarMenuSubButton href={child.href} isActive={child.active}>
                    <span>{child.title}</span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ) : (
                <li key={child.title} className="list-none">
                  <SidebarTree nodes={[child]} />
                </li>
              ),
            )}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}

function SidebarTreeContent({ sidebar }: { sidebar: SidebarNode[] }) {
  return (
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Documentation</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarTree nodes={sidebar} />
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );
}

export default function DocsSidebar({ sidebar, title, mode }: Props) {
  if (mode === 'mobile') {
    return (
      <SidebarProvider className="min-h-0 w-auto" defaultOpen={false}>
        <SidebarTrigger className="md:hidden" />
        <Sidebar side="left" variant="sidebar">
          <div className="border-sidebar-border border-b px-4 py-3">
            <p className="text-sidebar-foreground text-sm font-medium">{title ?? 'Documentation'}</p>
          </div>
          <SidebarTreeContent sidebar={sidebar} />
        </Sidebar>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider className="min-h-0 w-full" defaultOpen>
      <Sidebar side="left" variant="sidebar" collapsible="none">
        <SidebarTreeContent sidebar={sidebar} />
      </Sidebar>
    </SidebarProvider>
  );
}
