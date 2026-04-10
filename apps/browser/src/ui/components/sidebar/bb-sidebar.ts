import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Tab, Workspace } from '@kernel/interfaces';

@customElement('bb-sidebar')
export class BbSidebar extends LitElement {
  @property({ type: Array }) tabs: Tab[] = [];
  @property({ type: Array }) workspaces: Workspace[] = [];
  @property({ type: String }) activeWorkspaceId: string = '';
  @property({ type: String }) activeTabId: string | null = null;

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      background: var(--bb-bg-secondary);
      border-right: 1px solid var(--bb-border);
      height: 100%;
      overflow: hidden;
      /* macOS traffic light spacing */
      padding-top: 38px;
    }
    .tab-list-container {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
    }
  `;

  render() {
    return html`
      <bb-workspace-switcher
        .workspaces=${this.workspaces}
        .activeWorkspaceId=${this.activeWorkspaceId}
      ></bb-workspace-switcher>
      <div class="tab-list-container">
        <bb-tab-list .tabs=${this.tabs} .activeTabId=${this.activeTabId}></bb-tab-list>
      </div>
      <bb-new-tab-button></bb-new-tab-button>
    `;
  }
}
