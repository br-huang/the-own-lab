import { execFile } from "child_process";
import { promisify } from "util";
import { Vault, requestUrl } from "obsidian";
import { IngestResult, OnProgress } from "./url-ingestor";

const execFileAsync = promisify(execFile);

type SubtitleEntry = {
  ext?: string;
  url?: string;
};

type SubtitleMap = Record<string, SubtitleEntry[] | undefined>;

type BilibiliMetadata = {
  title: string;
  channel?: string;
  subtitles?: SubtitleMap;
  automatic_captions?: SubtitleMap;
};

export class BilibiliIngestor {
  constructor(
    private vault: Vault,
    private getIngestFolder: () => string,
    private getYtDlpConfig: () => { ytDlpCommand: string; cookiesPath: string },
  ) {}

  async ingest(url: string, onProgress?: OnProgress): Promise<IngestResult> {
    onProgress?.("fetching");

    const metadata = await this.fetchMetadata(url);
    const title = metadata.title.trim() || "bilibili-video";
    const subtitle = this.selectSubtitle(metadata);

    if (!subtitle?.url) {
      throw new Error("No subtitles are available for this Bilibili video.");
    }

    onProgress?.("extracting");
    const transcript = await this.fetchAndParseSubtitles(subtitle.url);

    if (!transcript.trim()) {
      throw new Error("No subtitles are available for this Bilibili video.");
    }

    onProgress?.("saving");
    const folder = this.getIngestFolder() || "Ingested";
    await this.ensureFolder(folder);

    const slug = this.slugify(title);
    const filePath = await this.resolveFilePath(folder, slug);

    const frontmatter = this.buildFrontmatter({
      url,
      title,
      channel: metadata.channel?.trim() || undefined,
      ingestedAt: new Date().toISOString(),
    });

    const fullContent = `${frontmatter}\n# ${title}\n\n${transcript}`;

    try {
      await this.vault.create(filePath, fullContent);
    } catch (err) {
      throw new Error(`Failed to save note: ${(err as Error).message}`);
    }

    return { title, filePath };
  }

  private async fetchMetadata(url: string): Promise<BilibiliMetadata> {
    const anonymousResult = await this.runYtDlp(url, undefined);
    if (anonymousResult.ok) {
      return anonymousResult.data;
    }

    const { cookiesPath } = this.getYtDlpConfig();
    if (this.isMissingBinaryError(anonymousResult.error)) {
      throw new Error(
        "yt-dlp is not installed or not configured. Install yt-dlp or set its path in plugin settings.",
      );
    }

    if (!this.isAuthenticationError(anonymousResult.error)) {
      throw new Error(`Failed to parse Bilibili video: ${anonymousResult.error}`);
    }

    if (!cookiesPath) {
      throw new Error("This Bilibili video requires login. Configure a cookies.txt path in settings and try again.");
    }

    const cookieResult = await this.runYtDlp(url, cookiesPath);
    if (cookieResult.ok) {
      return cookieResult.data;
    }

    if (this.isAuthenticationError(cookieResult.error)) {
      throw new Error("Bilibili access failed even with cookies. Refresh your cookies.txt and try again.");
    }

    if (this.isMissingBinaryError(cookieResult.error)) {
      throw new Error(
        "yt-dlp is not installed or not configured. Install yt-dlp or set its path in plugin settings.",
      );
    }

    throw new Error(`Failed to parse Bilibili video: ${cookieResult.error}`);
  }

  private async runYtDlp(
    url: string,
    cookiesPath?: string,
  ): Promise<{ ok: true; data: BilibiliMetadata } | { ok: false; error: string }> {
    const { ytDlpCommand } = this.getYtDlpConfig();
    const command = ytDlpCommand.trim() || "yt-dlp";
    const args = ["--dump-single-json", "--no-warnings", "--no-playlist"];

    if (cookiesPath) {
      args.push("--cookies", cookiesPath);
    }

    args.push(url);

    try {
      const { stdout } = await execFileAsync(command, args, {
        maxBuffer: 10 * 1024 * 1024,
      });

      const data = JSON.parse(stdout) as BilibiliMetadata;
      return {
        ok: true,
        data: {
          title: typeof data.title === "string" ? data.title : "bilibili-video",
          channel: typeof data.channel === "string"
            ? data.channel
            : typeof (data as any).uploader === "string"
              ? (data as any).uploader
              : undefined,
          subtitles: data.subtitles,
          automatic_captions: data.automatic_captions,
        },
      };
    } catch (err: any) {
      const message = [
        err?.stderr,
        err?.stdout,
        err?.message,
      ]
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        .join("\n")
        .trim();
      return { ok: false, error: message || "Unknown yt-dlp failure." };
    }
  }

  private isMissingBinaryError(message: string): boolean {
    return /not installed|not configured|ENOENT|spawn .* ENOENT|command not found/i.test(message);
  }

  private isAuthenticationError(message: string): boolean {
    return /(login|cookies|authenticate|authentication|sign in|required|会员|風控|风控|403|412)/i.test(message);
  }

  private selectSubtitle(metadata: BilibiliMetadata): SubtitleEntry | null {
    return (
      this.selectSubtitleFromMap(metadata.subtitles, true) ||
      this.selectSubtitleFromMap(metadata.subtitles, false) ||
      this.selectSubtitleFromMap(metadata.automatic_captions, true) ||
      this.selectSubtitleFromMap(metadata.automatic_captions, false) ||
      null
    );
  }

  private selectSubtitleFromMap(subtitles: SubtitleMap | undefined, preferChinese: boolean): SubtitleEntry | null {
    if (!subtitles) {
      return null;
    }

    const languages = Object.keys(subtitles);
    const orderedLanguages = preferChinese
      ? languages.filter((language) => this.isChineseLanguage(language))
      : languages.filter((language) => !this.isChineseLanguage(language));

    for (const language of orderedLanguages) {
      const entries = subtitles[language];
      if (!Array.isArray(entries) || entries.length === 0) {
        continue;
      }
      const preferredEntry = this.pickPreferredSubtitleEntry(entries);
      if (preferredEntry?.url) {
        return preferredEntry;
      }
    }

    return null;
  }

  private isChineseLanguage(language: string): boolean {
    return /^(zh|cmn|yue)([-_].+)?$/i.test(language);
  }

  private pickPreferredSubtitleEntry(entries: SubtitleEntry[]): SubtitleEntry | null {
    const priority = ["json3", "json", "vtt", "srt"];
    for (const ext of priority) {
      const match = entries.find((entry) => entry.url && entry.ext?.toLowerCase() === ext);
      if (match) {
        return match;
      }
    }
    return entries.find((entry) => Boolean(entry.url)) || null;
  }

  private async fetchAndParseSubtitles(subtitleUrl: string): Promise<string> {
    let response;
    try {
      response = await requestUrl({ url: subtitleUrl, method: "GET" });
    } catch (err) {
      throw new Error(`Failed to fetch subtitles: ${(err as Error).message}`);
    }

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Failed to fetch subtitles: HTTP ${response.status}.`);
    }

    const text = response.text || new TextDecoder("utf-8").decode(response.arrayBuffer);
    try {
      return this.parseSubtitleText(text);
    } catch (err) {
      throw new Error(`Failed to parse subtitles: ${(err as Error).message}`);
    }
  }

  private parseSubtitleText(text: string): string {
    const trimmed = text.trim();
    if (!trimmed) {
      return "";
    }

    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      return this.parseJsonSubtitles(trimmed);
    }

    if (/^WEBVTT/i.test(trimmed)) {
      return this.parseTimedTextBlocks(trimmed);
    }

    if (/\d{2}:\d{2}:\d{2},\d{3}\s+-->\s+\d{2}:\d{2}:\d{2},\d{3}/.test(trimmed)) {
      return this.parseTimedTextBlocks(trimmed);
    }

    throw new Error("Unsupported subtitle format.");
  }

  private parseJsonSubtitles(text: string): string {
    const data = JSON.parse(text);

    if (Array.isArray(data)) {
      return this.formatSegments(
        data.map((item) => ({
          start: this.numberOrZero(item?.from ?? item?.start),
          text: this.normalizeSubtitleText(item?.content ?? item?.text ?? ""),
        })),
      );
    }

    if (Array.isArray(data?.body)) {
      return this.formatSegments(
        data.body.map((item: any) => ({
          start: this.numberOrZero(item?.from ?? item?.start),
          text: this.normalizeSubtitleText(item?.content ?? item?.text ?? ""),
        })),
      );
    }

    if (Array.isArray(data?.events)) {
      return this.formatSegments(
        data.events.map((item: any) => ({
          start: this.numberOrZero(item?.tStartMs) / 1000,
          text: this.normalizeSubtitleText(
            Array.isArray(item?.segs)
              ? item.segs.map((seg: any) => seg?.utf8 ?? "").join("")
              : "",
          ),
        })),
      );
    }

    throw new Error("Unsupported JSON subtitle format.");
  }

  private parseTimedTextBlocks(text: string): string {
    const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const blocks = normalized.split(/\n{2,}/);
    const segments: Array<{ start: number; text: string }> = [];

    for (const block of blocks) {
      const lines = block
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (lines.length === 0 || /^WEBVTT$/i.test(lines[0])) {
        continue;
      }

      const timingIndex = lines.findIndex((line) => line.includes("-->"));
      if (timingIndex === -1) {
        continue;
      }

      const start = this.parseTimestamp(lines[timingIndex].split("-->")[0].trim());
      const textLines = lines
        .slice(timingIndex + 1)
        .filter((line) => !/^(NOTE|STYLE|REGION)/i.test(line))
        .map((line) => this.normalizeSubtitleText(line));

      const combined = textLines.join(" ").trim();
      if (combined) {
        segments.push({ start, text: combined });
      }
    }

    return this.formatSegments(segments);
  }

  private parseTimestamp(value: string): number {
    const normalized = value.replace(",", ".");
    const parts = normalized.split(":");

    if (parts.length === 3) {
      return Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
    }

    if (parts.length === 2) {
      return Number(parts[0]) * 60 + Number(parts[1]);
    }

    throw new Error(`Unsupported timestamp: ${value}`);
  }

  private formatSegments(segments: Array<{ start: number; text: string }>): string {
    return segments
      .filter((segment) => segment.text.trim().length > 0)
      .map((segment) => `[${this.formatTimestamp(segment.start)}] ${segment.text.trim()}`)
      .join("\n");
  }

  private formatTimestamp(startSeconds: number): string {
    const totalSeconds = Math.max(0, Math.floor(startSeconds));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  private normalizeSubtitleText(text: string): string {
    return text
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  private numberOrZero(value: unknown): number {
    const num = typeof value === "number" ? value : Number(value);
    return Number.isFinite(num) ? num : 0;
  }

  private buildFrontmatter(meta: {
    url: string;
    title: string;
    channel?: string;
    ingestedAt: string;
  }): string {
    const lines: string[] = ["---"];
    lines.push(`url: "${meta.url.replace(/"/g, '\\"')}"`);
    lines.push(`title: "${meta.title.replace(/"/g, '\\"')}"`);
    if (meta.channel) {
      lines.push(`channel: "${meta.channel.replace(/"/g, '\\"')}"`);
    }
    lines.push(`source_type: "bilibili"`);
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

    if (slug.length === 0) {
      slug = "ingested-page";
    }

    return slug.substring(0, 60).replace(/-$/, "");
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
