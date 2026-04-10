import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Tab } from '@kernel/interfaces';

@customElement('bb-tab-list')
export class BbTabList extends LitElement {
  @property({ type: Array }) tabs: Tab[] = [];
  @property({ type: String }) activeTabId: string | null = null;

  static styles = css`
    :host {
      display: block;
      padding: var(--bb-space-xs) 0;
    }
  `;

  render() {
    return html`
      ${this.tabs.map(
        (tab) => html`
          <bb-tab-item .tab=${tab} ?active=${tab.id === this.activeTabId}></bb-tab-item>
        `,
      )}
    `;
  }
}
