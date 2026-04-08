import { App, Modal } from "obsidian";
import { UrlIngestor, IngestPhase } from "../ingestor/url-ingestor";

const PHASE_TEXT: Record<IngestPhase, string> = {
  fetching: "Fetching page...",
  extracting: "Extracting content...",
  saving: "Saving note...",
};

export class IngestUrlModal extends Modal {
  private urlInput!: HTMLInputElement;
  private ingestBtn!: HTMLButtonElement;
  private statusEl!: HTMLElement;

  constructor(app: App, private ingestor: UrlIngestor) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("kb-ingest-url-modal");

    contentEl.createEl("h3", { text: "Ingest URL" });

    this.urlInput = contentEl.createEl("input", {
      type: "url",
      placeholder: "https://example.com/article",
      cls: "kb-ingest-url-input",
    });
    this.urlInput.style.width = "100%";
    this.urlInput.style.marginBottom = "12px";
    this.urlInput.focus();

    this.urlInput.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.doIngest(this.urlInput.value);
      }
    });

    this.ingestBtn = contentEl.createEl("button", {
      text: "Ingest",
      cls: "mod-cta",
    });
    this.ingestBtn.addEventListener("click", () => {
      this.doIngest(this.urlInput.value);
    });

    this.statusEl = contentEl.createDiv({ cls: "kb-ingest-status" });
    this.statusEl.style.marginTop = "12px";
    this.statusEl.hide();
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private async doIngest(url: string): Promise<void> {
    const trimmed = url.trim();
    if (!trimmed) return;

    // Disable input and button during ingestion
    this.urlInput.disabled = true;
    this.ingestBtn.disabled = true;
    this.statusEl.show();
    this.statusEl.setText("Starting...");
    this.statusEl.removeClass("kb-ingest-error");

    try {
      const result = await this.ingestor.ingest(trimmed, (phase: IngestPhase) => {
        this.statusEl.setText(PHASE_TEXT[phase]);
      });

      this.statusEl.setText(`Saved: "${result.title}" → ${result.filePath}`);

      // Auto-close after 2 seconds
      setTimeout(() => {
        this.close();
      }, 2000);
    } catch (err) {
      this.statusEl.addClass("kb-ingest-error");
      this.statusEl.setText((err as Error).message);
      // Re-enable for retry
      this.urlInput.disabled = false;
      this.ingestBtn.disabled = false;
    }
  }
}
