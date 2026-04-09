import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Tab } from '@kernel/interfaces';

@customElement('bb-navigation-buttons')
export class BbNavigationButtons extends LitElement {
  @property({ type: Object }) activeTab: Tab | null = null;

  static styles = css`
    :host { display: flex; gap: 2px; }
    button {
      width: 28px; height: 28px; border: none; border-radius: var(--bb-radius-sm);
      background: none; color: var(--bb-text-secondary); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; transition: all var(--bb-transition-fast);
    }
    button:hover:not(:disabled) { background: var(--bb-bg-hover); color: var(--bb-text-primary); }
    button:disabled { opacity: 0.3; cursor: default; }
  `;

  render() {
    const tab = this.activeTab;
    return html`
      <button
        @click=${() => tab && window.kernel.tabs.goBack(tab.id)}
        ?disabled=${!tab?.canGoBack}
        title="Back"
      >&#8592;</button>
      <button
        @click=${() => tab && window.kernel.tabs.goForward(tab.id)}
        ?disabled=${!tab?.canGoForward}
        title="Forward"
      >&#8594;</button>
      <button
        @click=${() => tab && window.kernel.tabs.reload(tab.id)}
        ?disabled=${!tab}
        title="Reload"
      >&#8635;</button>
    `;
  }
}
