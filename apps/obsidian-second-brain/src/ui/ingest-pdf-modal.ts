import { App, Modal, TFile } from "obsidian";
import { PdfIngestor } from "../ingestor/pdf-ingestor";
import { IngestPhase } from "../ingestor/url-ingestor";

export class IngestPdfModal extends Modal {
  private searchInput!: HTMLInputElement;
  private listEl!: HTMLElement;
  private statusEl!: HTMLElement;
  private pdfFiles: TFile[] = [];

  constructor(app: App, private ingestor: PdfIngestor) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("kb-ingest-pdf-modal");

    contentEl.createEl("h3", { text: "Ingest PDF" });

    this.pdfFiles = this.app.vault.getFiles().filter(
      (f) => f.extension === "pdf"
    );

    if (this.pdfFiles.length === 0) {
      contentEl.createEl("p", { text: "No PDF files found in your Vault." });
      return;
    }

    this.searchInput = contentEl.createEl("input", {
      type: "text",
      placeholder: "Search PDF files...",
      cls: "kb-ingest-pdf-search",
    });
    this.searchInput.style.width = "100%";
    this.searchInput.style.marginBottom = "8px";
    this.searchInput.addEventListener("input", () => this.renderList());
    this.searchInput.focus();

    this.listEl = contentEl.createDiv({ cls: "kb-ingest-pdf-list" });
    this.listEl.style.maxHeight = "300px";
    this.listEl.style.overflowY = "auto";
    this.listEl.style.border = "1px solid var(--background-modifier-border)";
    this.listEl.style.borderRadius = "4px";

    this.statusEl = contentEl.createDiv({ cls: "kb-ingest-status" });
    this.statusEl.style.marginTop = "12px";
    this.statusEl.hide();

    this.renderList();
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private renderList(): void {
    this.listEl.empty();
    const query = this.searchInput.value.toLowerCase();
    const filtered = this.pdfFiles.filter(
      (f) => f.path.toLowerCase().includes(query)
    );

    if (filtered.length === 0) {
      this.listEl.createEl("div", {
        text: "No matching PDF files.",
        cls: "kb-ingest-pdf-empty",
      });
      return;
    }

    for (const file of filtered) {
      const item = this.listEl.createEl("div", {
        text: file.path,
        cls: "kb-ingest-pdf-item",
      });
      item.style.padding = "6px 8px";
      item.style.cursor = "pointer";
      item.addEventListener("mouseenter", () => {
        item.style.backgroundColor = "var(--background-modifier-hover)";
      });
      item.addEventListener("mouseleave", () => {
        item.style.backgroundColor = "";
      });
      item.addEventListener("click", () => this.doIngest(file));
    }
  }

  private async doIngest(file: TFile): Promise<void> {
    this.searchInput.disabled = true;
    this.listEl.style.pointerEvents = "none";
    this.listEl.style.opacity = "0.5";
    this.statusEl.show();
    this.statusEl.setText("Starting...");
    this.statusEl.removeClass("kb-ingest-error");

    const phaseText: Record<IngestPhase, string> = {
      fetching: "Reading PDF...",
      extracting: "Extracting text...",
      saving: "Saving note...",
    };

    try {
      const result = await this.ingestor.ingest(
        file,
        (phase: IngestPhase) => {
          this.statusEl.setText(phaseText[phase]);
        },
        (current: number, total: number) => {
          this.statusEl.setText(`Extracting page ${current} / ${total}...`);
        },
      );

      this.statusEl.setText(`Saved: "${result.title}" → ${result.filePath}`);
      setTimeout(() => this.close(), 2000);
    } catch (err) {
      this.statusEl.addClass("kb-ingest-error");
      this.statusEl.setText((err as Error).message);
      this.searchInput.disabled = false;
      this.listEl.style.pointerEvents = "";
      this.listEl.style.opacity = "";
    }
  }
}
