import { Vault, requestUrl } from "obsidian";
import { IngestPhase, IngestResult, OnProgress } from "./url-ingestor";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export class YouTubeIngestor {
  constructor(
    private vault: Vault,
    private getIngestFolder: () => string,
  ) {}

  async ingest(url: string, onProgress?: OnProgress): Promise<IngestResult> {
    const videoId = this.extractVideoId(url);

    onProgress?.("fetching");
    const html = await this.fetchVideoPage(videoId);
    const { title, channel } = this.extractMetadata(html, videoId);

    const tracks = this.findCaptionTracks(html);
    const track = this.selectCaptionTrack(tracks);

    onProgress?.("extracting");
    const segments = await this.fetchTranscript(track.baseUrl);
    const transcript = this.formatTranscript(segments);

    onProgress?.("saving");
    const folder = this.getIngestFolder() || "Ingested";
    await this.ensureFolder(folder);

    const slug = this.slugify(title);
    const filePath = await this.resolveFilePath(folder, slug);

    const frontmatter = this.buildFrontmatter({
      url,
      title,
      channel,
      sourceType: "youtube",
      ingestedAt: new Date().toISOString(),
    });

    const fullContent = frontmatter + "\n" + `# ${title}` + "\n\n" + transcript;

    try {
      await this.vault.create(filePath, fullContent);
    } catch (err) {
      throw new Error(`Failed to save note: ${(err as Error).message}`);
    }

    return { title, filePath };
  }

  private extractVideoId(url: string): string {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, "");

    if (hostname === "youtube.com") {
      const v = parsed.searchParams.get("v");
      if (!v) {
        throw new Error("Could not extract video ID from URL.");
      }
      return v;
    }

    if (hostname === "youtu.be") {
      const id = parsed.pathname.slice(1).split("/")[0];
      if (!id) {
        throw new Error("Could not extract video ID from URL.");
      }
      return id;
    }

    throw new Error("Could not extract video ID from URL.");
  }

  private async fetchVideoPage(videoId: string): Promise<string> {
    try {
      const response = await requestUrl({
        url: "https://www.youtube.com/watch?v=" + videoId,
        method: "GET",
        headers: { "User-Agent": USER_AGENT },
      });
      if (response.status < 200 || response.status >= 300) {
        throw new Error(`Failed to fetch video page: HTTP ${response.status}.`);
      }
      return response.text;
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.startsWith("Failed to fetch video page:")
      ) {
        throw err;
      }
      throw new Error(
        `Failed to fetch video page: ${(err as Error).message}.`,
      );
    }
  }

  private extractMetadata(
    html: string,
    videoId: string,
  ): { title: string; channel: string | undefined } {
    let title: string = videoId;
    let channel: string | undefined = undefined;

    try {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const titleEl = doc.querySelector("title");
      if (titleEl?.textContent) {
        let raw = titleEl.textContent;
        if (raw.endsWith(" - YouTube")) {
          raw = raw.slice(0, -" - YouTube".length);
        }
        if (raw.trim()) {
          title = raw.trim();
        }
      }
    } catch {
      // fall through with videoId as title
    }

    try {
      const data = this.extractJsonBlob(html, "ytInitialData");
      if (data) {
        const contents = (data as any)?.contents?.twoColumnWatchNextResults
          ?.results?.results?.contents;
        if (Array.isArray(contents)) {
          for (const item of contents) {
            if (item.videoSecondaryInfoRenderer) {
              const runs =
                item.videoSecondaryInfoRenderer?.owner?.videoOwnerRenderer
                  ?.title?.runs;
              if (Array.isArray(runs) && runs.length > 0 && runs[0].text) {
                channel = runs[0].text;
              }
              break;
            }
          }
        }
      }
    } catch {
      // channel remains undefined
    }

    return { title, channel };
  }

  private extractJsonBlob(html: string, varName: string): unknown | null {
    let startIdx = html.indexOf(`var ${varName} = `);
    let offset = `var ${varName} = `.length;

    if (startIdx === -1) {
      startIdx = html.indexOf(`${varName} = `);
      offset = `${varName} = `.length;
    }

    if (startIdx === -1) {
      return null;
    }

    const searchStart = startIdx + offset;
    const braceStart = html.indexOf("{", searchStart);
    if (braceStart === -1) {
      return null;
    }

    let depth = 0;
    let inString = false;
    let i = braceStart;

    while (i < html.length) {
      const ch = html[i];

      if (inString) {
        if (ch === "\\") {
          i += 2; // skip escape sequence
          continue;
        }
        if (ch === '"') {
          inString = false;
        }
        i++;
        continue;
      }

      if (ch === '"') {
        inString = true;
        i++;
        continue;
      }

      if (ch === "{") {
        depth++;
      } else if (ch === "}") {
        depth--;
        if (depth === 0) {
          const jsonStr = html.slice(braceStart, i + 1);
          try {
            return JSON.parse(jsonStr);
          } catch {
            return null;
          }
        }
      }

      i++;
    }

    return null;
  }

  private findCaptionTracks(
    html: string,
  ): Array<{
    baseUrl: string;
    languageCode: string;
    kind?: string;
    name?: { simpleText?: string };
  }> {
    const result = this.extractJsonBlob(html, "ytInitialPlayerResponse");
    if (result === null) {
      throw new Error(
        "Could not parse video data from page. The video may be unavailable or age-restricted.",
      );
    }

    const tracks = (result as any)?.captions
      ?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!Array.isArray(tracks) || tracks.length === 0) {
      throw new Error("No subtitles are available for this video.");
    }

    return tracks;
  }

  private selectCaptionTrack(
    tracks: Array<{ baseUrl: string; kind?: string }>,
  ): { baseUrl: string } {
    const manual = tracks.filter((t) => t.kind !== "asr");
    if (manual.length > 0) {
      return manual[0];
    }
    return tracks[0];
  }

  private async fetchTranscript(
    captionUrl: string,
  ): Promise<Array<{ start: number; text: string }>> {
    const response = await requestUrl({ url: captionUrl, method: "GET" });
    if (response.status < 200 || response.status >= 300) {
      throw new Error(
        `Failed to fetch transcript: HTTP ${response.status}.`,
      );
    }

    let doc = new DOMParser().parseFromString(response.text, "text/xml");
    if (doc.querySelector("parsererror")) {
      doc = new DOMParser().parseFromString(response.text, "text/html");
    }

    const elements = doc.querySelectorAll("text");
    const segments: Array<{ start: number; text: string }> = [];

    elements.forEach((el) => {
      segments.push({
        start: parseFloat(el.getAttribute("start") || "0"),
        text: el.textContent || "",
      });
    });

    return segments;
  }

  private formatTranscript(
    segments: Array<{ start: number; text: string }>,
  ): string {
    return segments
      .map((segment) => {
        const totalSeconds = Math.floor(segment.start);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const timestamp = `[${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}]`;
        return `${timestamp} ${segment.text}`;
      })
      .join("\n");
  }

  private buildFrontmatter(meta: {
    url: string;
    title: string;
    channel: string | undefined;
    sourceType: string;
    ingestedAt: string;
  }): string {
    const lines: string[] = ["---"];
    lines.push(`url: "${meta.url.replace(/"/g, '\\"')}"`);
    lines.push(`title: "${meta.title.replace(/"/g, '\\"')}"`);
    if (meta.channel !== undefined) {
      lines.push(`channel: "${meta.channel.replace(/"/g, '\\"')}"`);
    }
    lines.push(`source_type: "${meta.sourceType}"`);
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

  private async resolveFilePath(
    folder: string,
    slug: string,
  ): Promise<string> {
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

    throw new Error(
      "Failed to save note: too many files with the same name.",
    );
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
          throw new Error(
            `Failed to save note: "${current}" exists as a file, not a folder.`,
          );
        }
        continue;
      }
      try {
        await this.vault.createFolder(current);
      } catch (err) {
        const recheck = this.vault.getAbstractFileByPath(current);
        if (!recheck || !("children" in recheck)) {
          throw new Error(
            `Failed to save note: could not create folder "${current}".`,
          );
        }
      }
    }
  }
}
