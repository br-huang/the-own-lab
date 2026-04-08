import { ItemView, WorkspaceLeaf, MarkdownRenderer } from "obsidian";
import { RagEngine } from "../core/rag-engine";
import { SourceReference } from "../types";
import { UrlIngestor, IngestPhase } from "../ingestor/url-ingestor";

export const CHAT_VIEW_TYPE = "obsidian-kb-chat";

export class ChatView extends ItemView {
  private ragEngine: RagEngine;
  private urlIngestor: UrlIngestor;
  private messagesEl!: HTMLElement;
  private inputEl!: HTMLTextAreaElement;
  private sendBtn!: HTMLButtonElement;
  private isStreaming = false;
  private fullResponseText = "";
  private renderThrottleTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(leaf: WorkspaceLeaf, ragEngine: RagEngine, urlIngestor: UrlIngestor) {
    super(leaf);
    this.ragEngine = ragEngine;
    this.urlIngestor = urlIngestor;
  }

  getViewType(): string {
    return CHAT_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "KB Chat";
  }

  getIcon(): string {
    return "message-square";
  }

  async onOpen(): Promise<void> {
    const container = this.contentEl;
    container.empty();
    container.addClass("kb-chat-container");

    this.messagesEl = container.createDiv({ cls: "kb-chat-messages" });

    const inputArea = container.createDiv({ cls: "kb-chat-input-area" });
    this.inputEl = inputArea.createEl("textarea", {
      cls: "kb-chat-input",
      attr: { placeholder: "Ask about your notes...", rows: "3" },
    });
    this.sendBtn = inputArea.createEl("button", {
      cls: "kb-chat-send",
      text: "Send",
    });

    this.inputEl.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        this.handleSubmit(this.inputEl.value);
      }
    });

    this.sendBtn.addEventListener("click", () => {
      this.handleSubmit(this.inputEl.value);
    });
  }

  async onClose(): Promise<void> {
    if (this.renderThrottleTimer) clearTimeout(this.renderThrottleTimer);
  }

  private async handleSubmit(question: string): Promise<void> {
    const trimmed = question.trim();
    if (trimmed.length === 0) {
      return;
    }

    // URL detection: if the entire message is a single URL, treat as ingest request
    if (/^https?:\/\/\S+$/.test(trimmed)) {
      this.inputEl.value = "";
      await this.handleUrlIngest(trimmed);
      return;
    }

    this.inputEl.value = "";
    this.setInputEnabled(false);
    this.addUserMessage(trimmed);
    const bubbleEl = this.addAssistantMessage();
    this.fullResponseText = "";

    try {
      for await (const response of this.ragEngine.query(trimmed)) {
        if (response.type === "token") {
          this.appendToken(bubbleEl, response.token);
        } else if (response.type === "sources") {
          this.renderSources(bubbleEl, response.sources);
        } else if (response.type === "error") {
          this.renderError(bubbleEl, response.message);
        }
      }
    } catch (err) {
      this.renderError(bubbleEl, (err as Error).message);
    } finally {
      this.renderMarkdown(bubbleEl);
      this.setInputEnabled(true);
    }
  }

  private async handleUrlIngest(url: string): Promise<void> {
    this.setInputEnabled(false);
    this.addUserMessage(url);
    const bubbleEl = this.addAssistantMessage();

    const phaseText: Record<IngestPhase, string> = {
      fetching: "Fetching page...",
      extracting: "Extracting content...",
      saving: "Saving note...",
    };

    try {
      const contentEl = bubbleEl.querySelector(".kb-chat-content") as HTMLElement;

      const result = await this.urlIngestor.ingest(url, (phase: IngestPhase) => {
        if (contentEl) {
          contentEl.empty();
          contentEl.setText(phaseText[phase]);
          this.scrollToBottom();
        }
      });

      if (contentEl) {
        contentEl.empty();
        contentEl.setText(`Ingested: "${result.title}" → ${result.filePath}`);
      }
    } catch (err) {
      this.renderError(bubbleEl, (err as Error).message);
    } finally {
      this.setInputEnabled(true);
    }
  }

  private addUserMessage(text: string): void {
    const msgEl = this.messagesEl.createDiv({ cls: "kb-chat-message kb-chat-user" });
    msgEl.textContent = text;
    this.scrollToBottom();
  }

  private addAssistantMessage(): HTMLElement {
    const msgEl = this.messagesEl.createDiv({ cls: "kb-chat-message kb-chat-assistant" });
    const bubbleEl = msgEl.createDiv({ cls: "kb-chat-bubble" });
    const contentEl = bubbleEl.createDiv({ cls: "kb-chat-content" });
    contentEl.createSpan({ cls: "kb-chat-loader", text: "..." });
    this.scrollToBottom();
    return bubbleEl;
  }

  private appendToken(bubbleEl: HTMLElement, token: string): void {
    const loader = bubbleEl.querySelector(".kb-chat-loader");
    if (loader) loader.remove();

    this.fullResponseText += token;

    if (this.renderThrottleTimer === null) {
      this.renderThrottleTimer = setTimeout(() => {
        this.renderThrottleTimer = null;
        this.renderMarkdown(bubbleEl);
      }, 100);
    }
  }

  private renderMarkdown(bubbleEl: HTMLElement): void {
    const contentEl = bubbleEl.querySelector(".kb-chat-content");
    if (!contentEl) return;

    contentEl.empty();
    MarkdownRenderer.render(
      this.app,
      this.fullResponseText,
      contentEl as HTMLElement,
      "",
      this,
    );
    this.scrollToBottom();
  }

  private renderSources(bubbleEl: HTMLElement, sources: SourceReference[]): void {
    const sourcesEl = bubbleEl.createDiv({ cls: "kb-chat-sources" });
    sourcesEl.createEl("div", { cls: "kb-chat-sources-label", text: "Sources:" });

    for (const source of sources) {
      const link = sourcesEl.createEl("a", {
        cls: "kb-chat-source-link",
        text: source.fileTitle,
      });
      link.addEventListener("click", (e) => {
        e.preventDefault();
        this.app.workspace.openLinkText(source.filePath, "");
      });
    }
  }

  private renderError(bubbleEl: HTMLElement, message: string): void {
    const loader = bubbleEl.querySelector(".kb-chat-loader");
    if (loader) loader.remove();

    const contentEl = bubbleEl.querySelector(".kb-chat-content") as HTMLElement;
    if (contentEl) {
      contentEl.createDiv({ cls: "kb-chat-error", text: message });
    }
  }

  private setInputEnabled(enabled: boolean): void {
    this.inputEl.disabled = !enabled;
    this.sendBtn.disabled = !enabled;
    this.isStreaming = !enabled;
    if (enabled) {
      this.inputEl.focus();
    }
  }

  private scrollToBottom(): void {
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }
}
