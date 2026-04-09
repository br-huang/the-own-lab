import { Vault, TFile } from "obsidian";
import * as path from "path";
import { IngestPhase, IngestResult, OnProgress } from "./url-ingestor";

export class PdfIngestor {
  constructor(
    private vault: Vault,
    private getIngestFolder: () => string,
    private pluginDir: string,
  ) {}

  async ingest(
    file: TFile,
    onProgress?: OnProgress,
    onPageProgress?: (current: number, total: number) => void,
  ): Promise<IngestResult> {
    onProgress?.("fetching");
    let arrayBuffer: ArrayBuffer;
    try {
      arrayBuffer = await this.vault.readBinary(file);
    } catch (err) {
      throw new Error(`Failed to read PDF: ${(err as Error).message}`);
    }

    onProgress?.("extracting");
    const pdfjsLib = this.loadPdfjs();

    let pdfDocument: any;
    try {
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      pdfDocument = await loadingTask.promise;
    } catch (err: any) {
      if (err?.name === "PasswordException") {
        throw new Error("This PDF is password-protected and cannot be ingested.");
      }
      throw new Error(`Failed to parse PDF: ${(err as Error).message}`);
    }

    let title: string;
    try {
      const metadata = await pdfDocument.getMetadata();
      title = metadata?.info?.Title && typeof metadata.info.Title === "string" && metadata.info.Title.trim()
        ? metadata.info.Title.trim()
        : file.basename;
    } catch {
      title = file.basename;
    }

    const totalPages: number = pdfDocument.numPages;
    const pages: Array<{ pageNum: number; text: string }> = [];

    for (let i = 1; i <= totalPages; i++) {
      onPageProgress?.(i, totalPages);
      const page = await pdfDocument.getPage(i);
      const content = await page.getTextContent();
      const text = content.items
        .map((item: any) => item.str)
        .join(" ")
        .trim();
      if (text.length > 0) {
        pages.push({ pageNum: i, text });
      }
    }

    if (pages.length === 0) {
      throw new Error(
        "No text content found. This PDF may be a scanned image and cannot be ingested without OCR."
      );
    }

    const frontmatter = this.buildFrontmatter({
      url: file.path,
      title,
      sourceType: "pdf",
      pages: totalPages,
      ingestedAt: new Date().toISOString(),
    });

    const body = pages
      .map((p) => `## Page ${p.pageNum}\n\n${p.text}`)
      .join("\n\n");

    const fullContent = frontmatter + "\n" + body;

    onProgress?.("saving");
    const folder = this.getIngestFolder() || "Ingested";
    await this.ensureFolder(folder);
    const slug = this.slugify(title);
    const filePath = await this.resolveFilePath(folder, slug);

    try {
      await this.vault.create(filePath, fullContent);
    } catch (err) {
      throw new Error(`Failed to save note: ${(err as Error).message}`);
    }

    return { title, filePath };
  }

  private loadPdfjs(): any {
    const modulePath = path.join(this.pluginDir, "node_modules", "pdfjs-dist", "legacy", "build", "pdf.mjs");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfjsLib = require(modulePath);
    pdfjsLib.GlobalWorkerOptions.workerSrc = "";
    return pdfjsLib;
  }

  private buildFrontmatter(meta: {
    url: string;
    title: string;
    sourceType: string;
    pages: number;
    ingestedAt: string;
  }): string {
    const lines: string[] = ["---"];
    lines.push(`url: "${meta.url.replace(/"/g, '\\"')}"`);
    lines.push(`title: "${meta.title.replace(/"/g, '\\"')}"`);
    lines.push(`source_type: "${meta.sourceType}"`);
    lines.push(`pages: ${meta.pages}`);
    lines.push(`ingested_at: "${meta.ingestedAt}"`);
    lines.push("---");
    return lines.join("\n") + "\n";
  }

  private slugify(title: string): string {
    let slug = title
      .toLowerCase()
      .replace(/[\s_]+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-{2,}/g, "-")
      .replace(/^-|-$/g, "");
    if (slug.length === 0) slug = "ingested-page";
    return slug.substring(0, 60).replace(/-$/, "");
  }

  private async resolveFilePath(folder: string, slug: string): Promise<string> {
    let candidate = `${folder}/${slug}.md`;
    if (!this.vault.getAbstractFileByPath(candidate)) return candidate;
    for (let i = 2; i <= 100; i++) {
      candidate = `${folder}/${slug}-${i}.md`;
      if (!this.vault.getAbstractFileByPath(candidate)) return candidate;
    }
    throw new Error("Failed to save note: too many files with the same name.");
  }

  private async ensureFolder(folderPath: string): Promise<void> {
    const existing = this.vault.getAbstractFileByPath(folderPath);
    if (existing) return;
    const parts = folderPath.split("/");
    let current = "";
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      const node = this.vault.getAbstractFileByPath(current);
      if (node) {
        if (!("children" in node)) {
          throw new Error(`Failed to save note: "${current}" exists as a file, not a folder.`);
        }
        continue;
      }
      try {
        await this.vault.createFolder(current);
      } catch {
        const recheck = this.vault.getAbstractFileByPath(current);
        if (!recheck || !("children" in recheck)) {
          throw new Error(`Failed to save note: could not create folder "${current}".`);
        }
      }
    }
  }
}
