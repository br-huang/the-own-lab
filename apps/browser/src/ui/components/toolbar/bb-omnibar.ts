import { LitElement, html, css } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import type { Tab } from '@kernel/interfaces';

@customElement('bb-omnibar')
export class BbOmnibar extends LitElement {
  @property({ type: Object }) activeTab: Tab | null = null;
  @state() private inputValue: string = '';
  @state() private isFocused: boolean = false;
  @query('input') private inputEl!: HTMLInputElement;

  static styles = css`
    :host {
      flex: 1;
      min-width: 0;
    }
    .omnibar-container {
      display: flex;
      align-items: center;
      background: var(--bb-bg-primary);
      border: 1px solid var(--bb-border);
      border-radius: var(--bb-radius-md);
      padding: 0 var(--bb-space-md);
      height: 28px;
      transition: border-color var(--bb-transition-fast);
    }
    .omnibar-container:focus-within {
      border-color: var(--bb-accent);
    }
    input {
      flex: 1;
      border: none;
      outline: none;
      background: none;
      color: var(--bb-text-primary);
      font-size: var(--bb-font-size-sm);
      font-family: var(--bb-font-family);
      min-width: 0;
    }
    input::placeholder {
      color: var(--bb-text-muted);
    }
  `;

  updated(changed: Map<string, unknown>) {
    if (changed.has('activeTab') && !this.isFocused && this.activeTab) {
      this.inputValue = this.activeTab.url;
    }
  }

  public focus() {
    this.inputEl?.focus();
    this.inputEl?.select();
  }

  private _onFocus() {
    this.isFocused = true;
    this.inputEl?.select();
  }

  private _onBlur() {
    this.isFocused = false;
    if (this.activeTab) {
      this.inputValue = this.activeTab.url;
    }
  }

  private _onInput(e: Event) {
    this.inputValue = (e.target as HTMLInputElement).value;
  }

  private async _onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const input = this.inputValue.trim();
      if (!input) return;

      const result = await window.kernel.navigation.resolveInput(input);
      const activeTab = this.activeTab;
      if (activeTab) {
        await window.kernel.tabs.navigateTo(activeTab.id, result.resolved);
      } else {
        await window.kernel.tabs.createTab({ url: result.resolved, active: true });
      }
      this.inputEl?.blur();
    } else if (e.key === 'Escape') {
      this.inputEl?.blur();
    }
  }

  render() {
    return html`
      <div class="omnibar-container">
        <input
          type="text"
          .value=${this.inputValue}
          @input=${this._onInput}
          @keydown=${this._onKeyDown}
          @focus=${this._onFocus}
          @blur=${this._onBlur}
          placeholder="Search or enter URL"
          spellcheck="false"
        />
      </div>
    `;
  }
}
