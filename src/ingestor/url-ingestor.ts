import { Vault, requestUrl } from "obsidian";
import { Readability } from "@mozilla/readability";
import TurndownService from "turndown";
import { detectVideoProvider } from "./video-detector";

/** Progress phases reported to the caller */
export type IngestPhase = "fetching" | "extracting" | "saving";

/** Successful ingestion result */
export interface IngestResult {
  title: string;
  filePath: string;
}

/** Callback for progress updates */
export type OnProgress = (phase: IngestPhase) => void;

export class UrlIngestor {
  constructor(
    private vault: Vault,
    private getIngestFolder: () => string,
  ) {}

  async ingest(url: string, onProgress?: OnProgress): Promise<IngestResult> {
    // 1. Video provider check
    const videoProvider = detectVideoProvider(url);
    if (videoProvider) {
      throw new Error(
        "YouTube/Bilibili ingestion is not yet supported. This will be available in a future update."
      );
    }

    // 2. Fetch
    onProgress?.("fetching");
    const html = await this.fetchHtml(url);

    // 3. Extract
    onProgress?.("extracting");
    const article = this.extractArticle(html, url);

    // 4. Save
    onProgress?.("saving");
    const folder = this.getIngestFolder() || "Ingested";
    await this.ensureFolder(folder);

    const slug = this.slugify(article.title);
    const filePath = await this.resolveFilePath(folder, slug);

    const frontmatter = this.buildFrontmatter({
      url,
      title: article.title,
      author: article.byline,
      ingestedAt: new Date().toISOString(),
    });

    const markdown = this.htmlToMarkdown(article.content);
    const fullContent = frontmatter + "\n" + markdown;

    await this.vault.create(filePath, fullContent);

    return { title: article.title, filePath };
  }

  private async fetchHtml(url: string): Promise<string> {
    try {
      const response = await requestUrl({ url, method: "GET" });
      if (response.status < 200 || response.status >= 300) {
        throw new Error(`Failed to fetch URL: HTTP ${response.status}.`);
      }
      return response.text;
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("Failed to fetch URL:")) {
        throw err;
      }
      throw new Error(`Failed to fetch URL: ${(err as Error).message}.`);
    }
  }

  private extractArticle(
    html: string,
    url: string,
  ): { title: string; content: string; byline: string | null } {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const reader = new Readability(doc);
    const article = reader.parse();

    if (!article || !article.content) {
      throw new Error("Could not extract article content from this page.");
    }

    // Sanitize: strip img, iframe, script from extracted content
    const sanitizedContent = this.sanitizeHtml(article.content);

    const title = article.title || new URL(url).hostname;

    return {
      title,
      content: sanitizedContent,
      byline: article.byline ?? null,
    };
  }

  private sanitizeHtml(html: string): string {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const tagsToRemove = ["img", "iframe", "script"];
    for (const tag of tagsToRemove) {
      doc.querySelectorAll(tag).forEach((el) => el.remove());
    }
    return doc.body.innerHTML;
  }

  private htmlToMarkdown(html: string): string {
    const turndown = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
    });
    return turndown.turndown(html);
  }

  private buildFrontmatter(meta: {
    url: string;
    title: string;
    author: string | null;
    ingestedAt: string;
  }): string {
    const lines: string[] = ["---"];
    lines.push(`url: "${meta.url}"`);
    lines.push(`title: "${meta.title.replace(/"/g, '\\"')}"`);
    if (meta.author) {
      lines.push(`author: "${meta.author.replace(/"/g, '\\"')}"`);
    }
    lines.push(`ingested_at: "${meta.ingestedAt}"`);
    lines.push(`source_type: "web"`);
    lines.push("---");
    return lines.join("\n") + "\n";
  }

  private slugify(title: string): string {
    let slug = title
      .toLowerCase()
      .replace(/[\s_]+/g, "-")       // spaces and underscores to hyphens
      .replace(/[^a-z0-9-]/g, "")    // strip non-alphanumeric except hyphens
      .replace(/-{2,}/g, "-")         // collapse consecutive hyphens
      .replace(/^-|-$/g, "");         // trim leading/trailing hyphens

    if (slug.length === 0) {
      slug = "ingested-page";
    }

    return slug.substring(0, 60);
  }

  private async resolveFilePath(folder: string, slug: string): Promise<string> {
    let candidate = `${folder}/${slug}.md`;
    if (!this.vault.getAbstractFileByPath(candidate)) {
      return candidate;
    }

    for (let i = 2; i <= 100; i++) {
      candidate = `${folder}/${slug}-${i}.md`;
      if (!this.vault.getAbstractFileByPath(candidate)) {
        return candidate;
      }
    }

    throw new Error("Failed to save note: too many files with the same name.");
  }

  private async ensureFolder(folderPath: string): Promise<void> {
    const existing = this.vault.getAbstractFileByPath(folderPath);
    if (existing) return;

    // Create nested folders if needed (e.g., "53-Knowledge/Ingested")
    const parts = folderPath.split("/");
    let current = "";
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      if (!this.vault.getAbstractFileByPath(current)) {
        try {
          await this.vault.createFolder(current);
        } catch {
          // Folder may have been created by another process; ignore
        }
      }
    }
  }
}
