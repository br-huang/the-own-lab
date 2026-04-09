import { ItemView, WorkspaceLeaf, MarkdownRenderer, App } from "obsidian";
import { RagEngine } from "../core/rag-engine";
import { SourceReference, ChatMessage, ChatSession } from "../types";
import { UrlIngestor, IngestPhase } from "../ingestor/url-ingestor";
import { detectVideoProvider } from "../ingestor/video-detector";
import { SessionStore } from "../core/session-store";

export const CHAT_VIEW_TYPE = "second-brain-chat";

export class ChatView extends ItemView {
  private ragEngine: RagEngine;
  private urlIngestor: UrlIngestor;
  private appRef: App;
  private sessionStore: SessionStore;
  private currentSession: ChatSession | null = null;
  private sessionListEl!: HTMLElement;
  private sessionPanelEl!: HTMLElement;
  private sessionListVisible = true;
  private mentionedFiles: { filePath: string; displayName: string }[] = [];
  private messagesEl!: HTMLElement;
  private inputEl!: HTMLTextAreaElement;
  private sendBtn!: HTMLButtonElement;
  private chipTrayEl!: HTMLElement;
  private autocompleteEl!: HTMLElement;
  private inputWrapperEl!: HTMLElement;
  private autocompleteIndex = -1;
  private autocompleteDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private isStreaming = false;
  private fullResponseText = "";
  private renderThrottleTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    leaf: WorkspaceLeaf,
    ragEngine: RagEngine,
    urlIngestor: UrlIngestor,
    appRef: App,
    sessionStore: SessionStore,
  ) {
    super(leaf);
    this.ragEngine = ragEngine;
    this.urlIngestor = urlIngestor;
    this.appRef = appRef;
    this.sessionStore = sessionStore;
  }

  getViewType(): string {
    return CHAT_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Second Brain";
  }

  getIcon(): string {
    return "message-square";
  }

  async onOpen(): Promise<void> {
    const container = this.contentEl;
    container.empty();
    container.addClass("kb-chat-container");

    // ─── Session Panel (left) ───
    this.sessionPanelEl = container.createDiv({ cls: "kb-session-panel" });

    const sessionHeader = this.sessionPanelEl.createDiv({ cls: "kb-session-panel-header" });
    const newBtn = sessionHeader.createEl("button", {
      cls: "kb-session-new-btn",
      text: "+ New",
    });
    newBtn.addEventListener("click", () => this.handleNewSession());

    this.sessionListEl = this.sessionPanelEl.createDiv({ cls: "kb-session-list" });

    // ─── Chat Main Panel (right) ───
    const chatMainEl = container.createDiv({ cls: "kb-chat-main" });

    // Header bar
    const headerEl = chatMainEl.createDiv({ cls: "kb-chat-header" });

    const toggleBtn = headerEl.createEl("button", {
      cls: "kb-session-toggle",
      attr: { "aria-label": "Toggle session list" },
    });
    toggleBtn.textContent = "\u2630";
    toggleBtn.addEventListener("click", () => {
      this.sessionListVisible = !this.sessionListVisible;
      this.sessionPanelEl.toggleClass("is-collapsed", !this.sessionListVisible);
    });

    headerEl.createEl("span", { cls: "kb-chat-header-title", text: "Second Brain" });

    this.messagesEl = chatMainEl.createDiv({ cls: "kb-chat-messages" });

    const inputArea = chatMainEl.createDiv({ cls: "kb-chat-input-area" });

    this.inputWrapperEl = inputArea.createDiv({ cls: "kb-chat-input-wrapper" });

    // Chip tray (above textarea, inside wrapper)
    this.chipTrayEl = this.inputWrapperEl.createDiv({ cls: "kb-chat-chip-tray" });
    this.chipTrayEl.style.display = "none";

    // Textarea (inside wrapper)
    this.inputEl = this.inputWrapperEl.createEl("textarea", {
      cls: "kb-chat-input",
      attr: { placeholder: "Ask about your notes... (@ to mention a file)", rows: "3" },
    });

    // Autocomplete dropdown (inside wrapper, absolutely positioned)
    this.autocompleteEl = this.inputWrapperEl.createDiv({ cls: "kb-chat-autocomplete" });
    this.autocompleteEl.style.display = "none";

    // Send button (outside wrapper, same level as wrapper)
    this.sendBtn = inputArea.createEl("button", {
      cls: "kb-chat-send",
      text: "Send",
    });

    // Event listeners
    this.inputEl.addEventListener("input", () => this.onInputChange());

    this.inputEl.addEventListener("keydown", (e: KeyboardEvent) => {
      // If autocomplete is open, handle navigation keys
      if (this.autocompleteEl.style.display !== "none") {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          this.moveAutocomplete(1);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          this.moveAutocomplete(-1);
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          this.selectAutocompleteItem();
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          this.hideAutocomplete();
          return;
        }
      }

      // Normal submit: Cmd/Ctrl+Enter
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        this.handleSubmit(this.inputEl.value);
      }

      // Backspace at position 0 removes last chip
      if (e.key === "Backspace" && this.inputEl.selectionStart === 0
          && this.inputEl.selectionEnd === 0 && this.mentionedFiles.length > 0) {
        this.removeChip(this.mentionedFiles.length - 1);
      }
    });

    this.sendBtn.addEventListener("click", () => {
      this.handleSubmit(this.inputEl.value);
    });

    // Load active session
    const activeId = this.sessionStore.getActiveSessionId();
    if (activeId) {
      await this.switchToSession(activeId);
    }
  }

  async onClose(): Promise<void> {
    if (this.renderThrottleTimer) clearTimeout(this.renderThrottleTimer);
    if (this.autocompleteDebounceTimer) clearTimeout(this.autocompleteDebounceTimer);
    // Save current session on close
    if (this.currentSession) {
      try {
        await this.sessionStore.saveSession(this.currentSession);
      } catch (err) {
        console.error("KB: Failed to save session on close", err);
      }
    }
  }

  // ─── Session List ───

  private renderSessionList(): void {
    this.sessionListEl.empty();
    const entries = this.sessionStore.getSessionIndex();

    for (const entry of entries) {
      const item = this.sessionListEl.createDiv({ cls: "kb-session-item" });
      if (entry.id === this.currentSession?.id) {
        item.addClass("is-active");
      }

      item.createEl("span", {
        cls: "kb-session-item-title",
        text: entry.title,
      });
      item.createEl("span", {
        cls: "kb-session-item-date",
        text: this.formatRelativeDate(entry.updatedAt),
      });

      const deleteBtn = item.createEl("button", {
        cls: "kb-session-item-delete",
        text: "x",
      });

      item.addEventListener("click", () => this.switchToSession(entry.id));
      deleteBtn.addEventListener("click", (event) =>
        this.handleDeleteSession(entry.id, event),
      );
    }
  }

  private formatRelativeDate(isoDate: string): string {
    const date = new Date(isoDate);
    const now = new Date();

    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayMidnight = new Date(todayMidnight.getTime() - 86400000);

    if (date >= todayMidnight) return "Today";
    if (date >= yesterdayMidnight) return "Yesterday";

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  // ─── Session Switching ───

  private async switchToSession(sessionId: string): Promise<void> {
    if (this.isStreaming) return;
    if (this.currentSession?.id === sessionId) return;

    // Save current session before switching
    if (this.currentSession) {
      await this.sessionStore.saveSession(this.currentSession);
    }

    this.currentSession = await this.sessionStore.loadSession(sessionId);
    this.sessionStore.setActiveSessionId(sessionId);

    // Re-render messages
    this.messagesEl.empty();
    this.renderMessages();
    this.renderSessionList();
  }

  private renderMessages(): void {
    if (!this.currentSession) return;

    for (const msg of this.currentSession.messages) {
      if (msg.role === "user") {
        this.addUserMessage(msg.text);
      } else if (msg.role === "assistant") {
        const bubbleEl = this.addAssistantMessage();
        this.fullResponseText = msg.text;
        this.renderMarkdown(bubbleEl);
        if (msg.sources && msg.sources.length > 0) {
          this.renderSources(bubbleEl, msg.sources);
        }
      }
    }
  }

  // ─── New / Delete Session ───

  private async handleNewSession(): Promise<void> {
    if (this.isStreaming) return;

    if (this.currentSession) {
      await this.sessionStore.saveSession(this.currentSession);
    }

    const session = await this.sessionStore.createSession();
    await this.switchToSession(session.id);
  }

  private async handleDeleteSession(sessionId: string, event: MouseEvent): Promise<void> {
    event.stopPropagation();
    if (this.isStreaming) return;
    if (!confirm("Delete this session?")) return;

    const wasActive = this.currentSession?.id === sessionId;
    await this.sessionStore.deleteSession(sessionId);

    if (wasActive) {
      const newActiveId = this.sessionStore.getActiveSessionId();
      if (newActiveId) {
        this.currentSession = null; // clear so switchToSession doesn't try to save deleted session
        await this.switchToSession(newActiveId);
      } else {
        this.currentSession = null;
        await this.handleNewSession();
      }
    }

    this.renderSessionList();
  }

  // ─── Autocomplete Logic ───

  private onInputChange(): void {
    if (this.autocompleteDebounceTimer) {
      clearTimeout(this.autocompleteDebounceTimer);
    }
    this.autocompleteDebounceTimer = setTimeout(() => {
      this.autocompleteDebounceTimer = null;
      this.updateAutocomplete();
    }, 100);
  }

  private getAtQuery(): string | null {
    const text = this.inputEl.value;
    const cursor = this.inputEl.selectionStart ?? text.length;

    let atPos = -1;
    for (let i = cursor - 1; i >= 0; i--) {
      if (text[i] === "@") {
        if (i === 0 || text[i - 1] === " " || text[i - 1] === "\n") {
          atPos = i;
        }
        break;
      }
      if (text[i] === " " || text[i] === "\n") {
        break;
      }
    }

    if (atPos === -1) return null;
    return text.substring(atPos + 1, cursor);
  }

  private updateAutocomplete(): void {
    const query = this.getAtQuery();
    if (query === null) {
      this.hideAutocomplete();
      return;
    }

    const files = this.appRef.vault.getMarkdownFiles();
    const lowerQuery = query.toLowerCase();
    const matches = files
      .filter((f) => f.path.toLowerCase().includes(lowerQuery))
      .slice(0, 10);

    if (matches.length === 0) {
      this.hideAutocomplete();
      return;
    }

    this.autocompleteEl.empty();
    this.autocompleteIndex = -1;

    const basenameCounts = new Map<string, number>();
    for (const f of matches) {
      const bn = f.basename;
      basenameCounts.set(bn, (basenameCounts.get(bn) ?? 0) + 1);
    }

    for (let i = 0; i < matches.length; i++) {
      const file = matches[i];
      const needsDisambiguation = (basenameCounts.get(file.basename) ?? 0) > 1;
      const displayText = needsDisambiguation
        ? `${file.basename} (${file.parent?.path ?? ""})`
        : file.basename;

      const item = this.autocompleteEl.createDiv({
        cls: "kb-chat-autocomplete-item",
        text: displayText,
      });
      item.dataset.filepath = file.path;
      item.dataset.displayname = file.basename;
      item.dataset.index = String(i);

      item.addEventListener("mousedown", (e) => {
        e.preventDefault();
        this.selectFile(file.path, file.basename);
      });
    }

    this.autocompleteEl.style.display = "block";
  }

  private moveAutocomplete(direction: number): void {
    const items = this.autocompleteEl.querySelectorAll(".kb-chat-autocomplete-item");
    if (items.length === 0) return;

    if (this.autocompleteIndex >= 0 && this.autocompleteIndex < items.length) {
      items[this.autocompleteIndex].removeClass("is-selected");
    }

    this.autocompleteIndex += direction;
    if (this.autocompleteIndex < 0) this.autocompleteIndex = items.length - 1;
    if (this.autocompleteIndex >= items.length) this.autocompleteIndex = 0;

    items[this.autocompleteIndex].addClass("is-selected");
    (items[this.autocompleteIndex] as HTMLElement).scrollIntoView({ block: "nearest" });
  }

  private selectAutocompleteItem(): void {
    const items = this.autocompleteEl.querySelectorAll(".kb-chat-autocomplete-item");
    if (this.autocompleteIndex < 0 || this.autocompleteIndex >= items.length) {
      if (items.length > 0) {
        this.autocompleteIndex = 0;
      } else {
        return;
      }
    }
    const el = items[this.autocompleteIndex] as HTMLElement;
    const filePath = el.dataset.filepath!;
    const displayName = el.dataset.displayname!;
    this.selectFile(filePath, displayName);
  }

  private selectFile(filePath: string, displayName: string): void {
    const text = this.inputEl.value;
    const cursor = this.inputEl.selectionStart ?? text.length;

    let atPos = -1;
    for (let i = cursor - 1; i >= 0; i--) {
      if (text[i] === "@") {
        atPos = i;
        break;
      }
    }

    if (atPos >= 0) {
      this.inputEl.value = text.substring(0, atPos) + text.substring(cursor);
      this.inputEl.selectionStart = atPos;
      this.inputEl.selectionEnd = atPos;
    }

    this.addChip(filePath, displayName);
    this.hideAutocomplete();
    this.inputEl.focus();
  }

  private hideAutocomplete(): void {
    this.autocompleteEl.style.display = "none";
    this.autocompleteEl.empty();
    this.autocompleteIndex = -1;
  }

  // ─── Chip Management ───

  private addChip(filePath: string, displayName: string): void {
    if (this.mentionedFiles.some((f) => f.filePath === filePath)) return;

    this.mentionedFiles.push({ filePath, displayName });
    this.renderChips();
  }

  private removeChip(index: number): void {
    this.mentionedFiles.splice(index, 1);
    this.renderChips();
  }

  private renderChips(): void {
    this.chipTrayEl.empty();

    if (this.mentionedFiles.length === 0) {
      this.chipTrayEl.style.display = "none";
      return;
    }

    this.chipTrayEl.style.display = "flex";

    for (let i = 0; i < this.mentionedFiles.length; i++) {
      const file = this.mentionedFiles[i];
      const chip = this.chipTrayEl.createDiv({ cls: "kb-chat-chip" });
      chip.createSpan({ text: `@${file.displayName}` });
      const closeBtn = chip.createSpan({ cls: "kb-chat-chip-close", text: "\u00d7" });
      closeBtn.addEventListener("click", () => this.removeChip(i));
    }
  }

  private clearChips(): void {
    this.mentionedFiles = [];
    this.renderChips();
  }

  // ─── Submit Handling ───

  private async handleSubmit(question: string): Promise<void> {
    const trimmed = question.trim();
    if (trimmed.length === 0 && this.mentionedFiles.length === 0) return;

    // URL detection (only if no chips are attached)
    if (/^https?:\/\/\S+$/.test(trimmed) && this.mentionedFiles.length === 0) {
      this.inputEl.value = "";
      await this.handleUrlIngest(trimmed);
      return;
    }

    const forcedFiles = this.mentionedFiles.map((f) => f.filePath);

    const chipMentions = this.mentionedFiles.map((f) => `@[[${f.displayName}]]`).join(" ");
    const displayText = chipMentions ? `${chipMentions} ${trimmed}` : trimmed;

    const cleanQuestion = trimmed;

    this.inputEl.value = "";
    this.clearChips();
    this.setInputEnabled(false);
    this.addUserMessage(displayText);

    this.pushHistory({ role: "user", text: displayText, sources: [], timestamp: new Date().toISOString() });

    const bubbleEl = this.addAssistantMessage();
    this.fullResponseText = "";
    let responseSources: SourceReference[] = [];

    try {
      for await (const response of this.ragEngine.query(cleanQuestion, forcedFiles.length > 0 ? forcedFiles : undefined)) {
        if (response.type === "token") {
          this.appendToken(bubbleEl, response.token);
        } else if (response.type === "sources") {
          responseSources = response.sources;
          this.renderSources(bubbleEl, response.sources);
        } else if (response.type === "error") {
          this.fullResponseText = response.message;
          this.renderError(bubbleEl, response.message);
        }
      }
    } catch (err) {
      this.fullResponseText = (err as Error).message;
      this.renderError(bubbleEl, (err as Error).message);
    } finally {
      this.renderMarkdown(bubbleEl);
      this.setInputEnabled(true);

      this.pushHistory({
        role: "assistant",
        text: this.fullResponseText,
        sources: responseSources,
        timestamp: new Date().toISOString(),
      });
    }
  }

  private async handleUrlIngest(url: string): Promise<void> {
    this.setInputEnabled(false);
    this.addUserMessage(url);
    this.pushHistory({ role: "user", text: url, sources: [], timestamp: new Date().toISOString() });
    const bubbleEl = this.addAssistantMessage();

    const provider = detectVideoProvider(url);
    const phaseText: Record<IngestPhase, string> = {
      fetching: provider === "youtube"
        ? "Fetching video info..."
        : provider === "bilibili"
          ? "Fetching Bilibili video info..."
          : "Fetching page...",
      extracting: provider === "youtube"
        ? "Extracting transcript..."
        : provider === "bilibili"
          ? "Extracting subtitles..."
          : "Extracting content...",
      saving: "Saving note...",
    };

    try {
      const contentEl = bubbleEl.querySelector(".kb-chat-content") as HTMLElement;
      if (contentEl) {
        contentEl.empty();
        contentEl.setText("Ingesting URL...");
      }

      const result = await this.urlIngestor.ingest(url, (phase: IngestPhase) => {
        if (contentEl) {
          contentEl.empty();
          contentEl.setText(phaseText[phase]);
          this.scrollToBottom();
        }
      });

      if (contentEl) {
        contentEl.empty();
        contentEl.setText(`Ingested: "${result.title}" \u2192 ${result.filePath}`);
      }

      const resultText = `Ingested: "${result.title}" \u2192 ${result.filePath}`;
      this.pushHistory({ role: "assistant", text: resultText, sources: [], timestamp: new Date().toISOString() });
    } catch (err) {
      this.renderError(bubbleEl, (err as Error).message);
      this.pushHistory({ role: "assistant", text: `Error: ${(err as Error).message}`, sources: [], timestamp: new Date().toISOString() });
    } finally {
      this.setInputEnabled(true);
    }
  }

  // ─── Chat History (Session-based) ───

  private async pushHistory(message: ChatMessage): Promise<void> {
    if (!this.currentSession) return;

    this.currentSession.messages.push(message);

    // Cap at 100 messages
    if (this.currentSession.messages.length > 100) {
      this.currentSession.messages = this.currentSession.messages.slice(-100);
    }

    // Auto-title on first user message
    if (message.role === "user" && this.currentSession.title === "New Chat") {
      const cleanText = message.text.replace(/@\[\[[^\]]*\]\]\s*/g, "").trim();
      this.currentSession.title = cleanText.slice(0, 30) || "New Chat";
      this.renderSessionList();
    }

    try {
      await this.sessionStore.saveSession(this.currentSession);
    } catch (err) {
      console.error("KB: Failed to save session", err);
    }
  }

  // ─── Message Rendering ───

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
