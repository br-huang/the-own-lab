import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Tab } from '@kernel/interfaces';

@customElement('bb-tab-item')
export class BbTabItem extends LitElement {
  @property({ type: Object }) tab!: Tab;
  @property({ type: Boolean, reflect: true }) active: boolean = false;

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      gap: var(--bb-space-sm);
      padding: var(--bb-space-sm) var(--bb-space-md);
      cursor: pointer;
      border-radius: var(--bb-radius-sm);
      margin: 0 var(--bb-space-xs);
      transition: background var(--bb-transition-fast);
      user-select: none;
    }
    :host(:hover) {
      background: var(--bb-bg-hover);
    }
    :host([active]) {
      background: var(--bb-bg-active);
    }
    .favicon {
      width: 16px;
      height: 16px;
      border-radius: 2px;
      flex-shrink: 0;
    }
    .title {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: var(--bb-font-size-sm);
      color: var(--bb-text-primary);
    }
    .close-btn {
      opacity: 0;
      width: 16px;
      height: 16px;
      border: none;
      background: none;
      color: var(--bb-text-muted);
      cursor: pointer;
      border-radius: var(--bb-radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: 14px;
    }
    :host(:hover) .close-btn {
      opacity: 1;
    }
    .close-btn:hover {
      background: var(--bb-danger);
      color: white;
    }
  `;

  private _onActivate = () => {
    window.kernel.tabs.activateTab(this.tab.id);
  };

  private _onClose(e: Event) {
    e.stopPropagation();
    window.kernel.tabs.closeTab(this.tab.id);
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('click', this._onActivate);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('click', this._onActivate);
  }

  render() {
    const fallbackFavicon = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>';
    return html`
      <img
        class="favicon"
        src=${this.tab.favicon || fallbackFavicon}
        alt=""
        @error=${(e: Event) => ((e.target as HTMLImageElement).style.visibility = 'hidden')}
      />
      <span class="title">${this.tab.title || this.tab.url || 'New Tab'}</span>
      <button class="close-btn" @click=${this._onClose} title="Close tab">&times;</button>
    `;
  }
}
