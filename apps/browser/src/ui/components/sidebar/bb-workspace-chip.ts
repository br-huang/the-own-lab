import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Workspace } from '@kernel/interfaces';

@customElement('bb-workspace-chip')
export class BbWorkspaceChip extends LitElement {
  @property({ type: Object }) workspace!: Workspace;
  @property({ type: Boolean, reflect: true }) active: boolean = false;

  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      gap: var(--bb-space-xs);
      padding: var(--bb-space-xs) var(--bb-space-sm);
      border-radius: var(--bb-radius-md);
      cursor: pointer;
      font-size: var(--bb-font-size-xs);
      color: var(--bb-text-secondary);
      transition: all var(--bb-transition-fast);
      border: 1px solid transparent;
    }
    :host(:hover) { background: var(--bb-bg-hover); }
    :host([active]) {
      background: var(--bb-bg-active);
      color: var(--bb-text-primary);
      border-color: var(--bb-border);
    }
    .icon { font-size: 14px; }
    .name { white-space: nowrap; }
    .count {
      font-size: var(--bb-font-size-xs);
      color: var(--bb-text-muted);
      margin-left: 2px;
    }
  `;

  private _onClick = () => {
    window.kernel.workspaces.activateWorkspace(this.workspace.id);
  };

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('click', this._onClick);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('click', this._onClick);
  }

  render() {
    return html`
      <span class="icon">${this.workspace.icon}</span>
      <span class="name">${this.workspace.name}</span>
      <span class="count">${this.workspace.tabCount}</span>
    `;
  }
}
