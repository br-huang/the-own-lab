import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Workspace } from '@kernel/interfaces';

@customElement('bb-workspace-switcher')
export class BbWorkspaceSwitcher extends LitElement {
  @property({ type: Array }) workspaces: Workspace[] = [];
  @property({ type: String }) activeWorkspaceId: string = '';

  static styles = css`
    :host {
      display: flex;
      gap: var(--bb-space-xs);
      padding: var(--bb-space-sm) var(--bb-space-md);
      flex-wrap: wrap;
    }
  `;

  render() {
    return html`
      ${this.workspaces.map(
        (ws) => html`
          <bb-workspace-chip
            .workspace=${ws}
            ?active=${ws.id === this.activeWorkspaceId}
          ></bb-workspace-chip>
        `,
      )}
    `;
  }
}
