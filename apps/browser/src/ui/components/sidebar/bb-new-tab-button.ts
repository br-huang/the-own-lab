import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('bb-new-tab-button')
export class BbNewTabButton extends LitElement {
  static styles = css`
    :host {
      display: block;
      padding: var(--bb-space-sm) var(--bb-space-md);
      border-top: 1px solid var(--bb-border);
    }
    button {
      width: 100%;
      padding: var(--bb-space-sm);
      background: none;
      border: 1px solid var(--bb-border);
      border-radius: var(--bb-radius-sm);
      color: var(--bb-text-secondary);
      cursor: pointer;
      font-size: var(--bb-font-size-sm);
      font-family: var(--bb-font-family);
      transition: all var(--bb-transition-fast);
    }
    button:hover {
      background: var(--bb-bg-hover);
      color: var(--bb-text-primary);
    }
  `;

  private async _onClick() {
    const ws = await window.kernel.workspaces.getActiveWorkspace();
    await window.kernel.tabs.createTab({ active: true, workspaceId: ws.id });
  }

  render() {
    return html`<button @click=${this._onClick}>+ New Tab</button>`;
  }
}
