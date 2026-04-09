import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('bb-content-area')
export class BbContentArea extends LitElement {
  static styles = css`
    :host {
      flex: 1;
      background: var(--bb-bg-primary);
      position: relative;
      /* This is where WebContentsView will be placed on top by the main process */
    }
    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--bb-text-muted);
      font-size: var(--bb-font-size-lg);
    }
  `;

  render() {
    return html`<div class="empty-state">No tab selected</div>`;
  }
}
