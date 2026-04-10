import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Tab } from '@kernel/interfaces';

@customElement('bb-toolbar')
export class BbToolbar extends LitElement {
  @property({ type: Object }) activeTab: Tab | null = null;

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      gap: var(--bb-space-sm);
      padding: var(--bb-space-xs) var(--bb-space-md);
      background: var(--bb-bg-secondary);
      border-bottom: 1px solid var(--bb-border);
      height: 40px;
      flex-shrink: 0;
      /* Allow dragging the window from the toolbar area */
      -webkit-app-region: drag;
    }
    bb-navigation-buttons,
    bb-omnibar {
      -webkit-app-region: no-drag;
    }
  `;

  render() {
    return html`
      <bb-navigation-buttons .activeTab=${this.activeTab}></bb-navigation-buttons>
      <bb-omnibar .activeTab=${this.activeTab}></bb-omnibar>
    `;
  }
}
