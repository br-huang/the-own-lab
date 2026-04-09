import { KernelEvent } from './shared';

export interface Workspace {
  id: string;
  name: string;
  color: string;
  icon: string;
  tabCount: number;
  isActive: boolean;
  order: number;
}

export interface WorkspaceManager {
  getWorkspace(id: string): Promise<Workspace | null>;
  getAllWorkspaces(): Promise<Workspace[]>;
  getActiveWorkspace(): Promise<Workspace>;
  createWorkspace(opts: { name: string; color?: string; icon?: string }): Promise<Workspace>;
  deleteWorkspace(id: string): Promise<void>;
  renameWorkspace(id: string, name: string): Promise<void>;
  updateWorkspace(id: string, changes: Partial<Omit<Workspace, 'id'>>): Promise<void>;
  activateWorkspace(id: string): Promise<void>;
  reorderWorkspace(id: string, newOrder: number): Promise<void>;
  onWorkspaceCreated: KernelEvent<Workspace>;
  onWorkspaceDeleted: KernelEvent<{ workspaceId: string }>;
  onWorkspaceUpdated: KernelEvent<{ workspaceId: string; changes: Partial<Workspace> }>;
  onWorkspaceActivated: KernelEvent<{ workspaceId: string; previousId: string }>;
}
