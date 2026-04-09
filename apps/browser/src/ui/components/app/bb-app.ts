import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import type { Tab, Workspace } from '@kernel/interfaces';

@customElement('bb-app')
export class BbApp extends LitElement {
  @state() private tabs: Tab[] = [];
  @state() private workspaces: Workspace[] = [];
  @state() private activeWorkspaceId: string = '';
  @state() private activeTabId: string | null = null;
  @state() private sidebarWidth: number = 260;

  private unsubscribers: Array<() => void> = [];

  async connectedCallback() {
    super.connectedCallback();
    await this.fetchInitialState();
    this.subscribeToKernelEvents();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
  }

  private async fetchInitialState() {
    try {
      const [tabs, workspaces] = await Promise.all([
        window.kernel.tabs.getAllTabs(),
        window.kernel.workspaces.getAllWorkspaces(),
      ]);
      this.tabs = tabs;
      this.workspaces = workspaces;

      const activeWorkspace = await window.kernel.workspaces.getActiveWorkspace();
      this.activeWorkspaceId = activeWorkspace.id;

      const activeTab = await window.kernel.tabs.getActiveTab();
      this.activeTabId = activeTab?.id ?? null;
    } catch {
      // Kernel not ready yet — will populate via events
    }
  }

  private subscribeToKernelEvents() {
    this.unsubscribers.push(
      window.kernel.tabs.onTabCreated.subscribe((tab) => {
        this.tabs = [...this.tabs, tab];
      }),
      window.kernel.tabs.onTabClosed.subscribe(({ tabId }) => {
        this.tabs = this.tabs.filter(t => t.id !== tabId);
        if (this.activeTabId === tabId) {
          this.activeTabId = null;
        }
      }),
      window.kernel.tabs.onTabUpdated.subscribe(({ tabId, changes }) => {
        this.tabs = this.tabs.map(t =>
          t.id === tabId ? { ...t, ...changes } : t
        );
      }),
      window.kernel.tabs.onTabActivated.subscribe(({ tabId }) => {
        this.activeTabId = tabId;
        this.tabs = this.tabs.map(t => ({
          ...t,
          isActive: t.id === tabId,
        }));
      }),
      window.kernel.workspaces.onWorkspaceCreated.subscribe((ws) => {
        this.workspaces = [...this.workspaces, ws];
      }),
      window.kernel.workspaces.onWorkspaceDeleted.subscribe(({ workspaceId }) => {
        this.workspaces = this.workspaces.filter(w => w.id !== workspaceId);
      }),
      window.kernel.workspaces.onWorkspaceUpdated.subscribe(({ workspaceId, changes }) => {
        this.workspaces = this.workspaces.map(w =>
          w.id === workspaceId ? { ...w, ...changes } : w
        );
      }),
      window.kernel.workspaces.onWorkspaceActivated.subscribe(({ workspaceId }) => {
        this.activeWorkspaceId = workspaceId;
      }),
    );
  }

  static styles = css`
    :host {
      display: flex;
      height: 100vh;
      width: 100vw;
      overflow: hidden;
      background: var(--bb-bg-primary);
    }
    .right-panel {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
    }
  `;

  render() {
    return html`
      <bb-sidebar
        .tabs=${this.tabs.filter(t => t.workspaceId === this.activeWorkspaceId)}
        .workspaces=${this.workspaces}
        .activeWorkspaceId=${this.activeWorkspaceId}
        .activeTabId=${this.activeTabId}
        style="width: ${this.sidebarWidth}px"
      ></bb-sidebar>
      <div class="right-panel">
        <bb-toolbar
          .activeTab=${this.tabs.find(t => t.id === this.activeTabId) ?? null}
        ></bb-toolbar>
        <bb-content-area></bb-content-area>
      </div>
    `;
  }
}
