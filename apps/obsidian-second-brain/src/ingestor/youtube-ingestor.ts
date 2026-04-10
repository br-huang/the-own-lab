import { Vault, requestUrl } from 'obsidian';
import { IngestPhase, IngestResult, OnProgress } from './url-ingestor';

const WEB_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Android client credentials — YouTube returns usable caption URLs for this client
const ANDROID_CLIENT_VERSION = '20.10.38';
const ANDROID_USER_AGENT = `com.google.android.youtube/${ANDROID_CLIENT_VERSION} (Linux; U; Android 14)`;

export class YouTubeIngestor {
  constructor(
    private vault: Vault,
    private getIngestFolder: () => string,
  ) {}

  async ingest(url: string, onProgress?: OnProgress): Promise<IngestResult> {
    const videoId = this.extractVideoId(url);

    onProgress?.('fetching');
    // Fetch metadata from web page, caption tracks from Android API
    const [metadata, tracks] = await Promise.all([
      this.fetchMetadata(videoId),
      this.fetchCaptionTracks(videoId),
    ]);

    if (tracks.length === 0) {
      throw new Error('No subtitles are available for this video.');
    }

    const track = this.selectCaptionTrack(tracks);

    onProgress?.('extracting');
    const segments = await this.fetchTranscript(track.baseUrl);

    if (segments.length === 0) {
      throw new Error('No subtitles are available for this video.');
    }

    const transcript = this.formatTranscript(segments);

    onProgress?.('saving');
    const folder = this.getIngestFolder() || 'Ingested';
    await this.ensureFolder(folder);

    const slug = this.slugify(metadata.title);
    const filePath = await this.resolveFilePath(folder, slug);

    const frontmatter = this.buildFrontmatter({
      url,
      title: metadata.title,
      channel: metadata.channel,
      sourceType: 'youtube',
      ingestedAt: new Date().toISOString(),
    });

    const fullContent = frontmatter + '\n' + `# ${metadata.title}` + '\n\n' + transcript;

    try {
      await this.vault.create(filePath, fullContent);
    } catch (err) {
      throw new Error(`Failed to save note: ${(err as Error).message}`);
    }

    return { title: metadata.title, filePath };
  }

  private extractVideoId(url: string): string {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, '');

    if (hostname === 'youtube.com') {
      const v = parsed.searchParams.get('v');
      if (!v) throw new Error('Could not extract video ID from URL.');
      return v;
    }

    if (hostname === 'youtu.be') {
      const id = parsed.pathname.slice(1).split('/')[0];
      if (!id) throw new Error('Could not extract video ID from URL.');
      return id;
    }

    throw new Error('Could not extract video ID from URL.');
  }

  /**
   * Fetch video metadata (title, channel) from the web page.
   */
  private async fetchMetadata(
    videoId: string,
  ): Promise<{ title: string; channel: string | undefined }> {
    let title = videoId;
    let channel: string | undefined = undefined;

    try {
      const response = await requestUrl({
        url: 'https://www.youtube.com/watch?v=' + videoId,
        method: 'GET',
        headers: { 'User-Agent': WEB_USER_AGENT },
      });
      const html = response.text || new TextDecoder('utf-8').decode(response.arrayBuffer);

      // Extract title from <title> tag
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const titleEl = doc.querySelector('title');
      if (titleEl?.textContent) {
        let raw = titleEl.textContent;
        if (raw.endsWith(' - YouTube')) {
          raw = raw.slice(0, -' - YouTube'.length);
        }
        if (raw.trim()) {
          title = raw.trim();
        }
      }

      // Extract channel from ytInitialData
      const data = this.extractJsonBlob(html, 'ytInitialData');
      if (data) {
        const contents = (data as any)?.contents?.twoColumnWatchNextResults?.results?.results
          ?.contents;
        if (Array.isArray(contents)) {
          for (const item of contents) {
            if (item.videoSecondaryInfoRenderer) {
              const runs = item.videoSecondaryInfoRenderer?.owner?.videoOwnerRenderer?.title?.runs;
              if (Array.isArray(runs) && runs.length > 0 && runs[0].text) {
                channel = runs[0].text;
              }
              break;
            }
          }
        }
      }
    } catch {
      // fallback: title = videoId, channel = undefined
    }

    return { title, channel };
  }

  /**
   * Fetch caption tracks via YouTube's Android Innertube player API.
   * The Android client returns caption URLs that can be fetched without cookies.
   */
  private async fetchCaptionTracks(
    videoId: string,
  ): Promise<Array<{ baseUrl: string; languageCode: string; kind?: string }>> {
    try {
      const response = await requestUrl({
        url: 'https://www.youtube.com/youtubei/v1/player?prettyPrint=false',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': ANDROID_USER_AGENT,
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: 'ANDROID',
              clientVersion: ANDROID_CLIENT_VERSION,
            },
          },
          videoId,
        }),
      });

      let data: any;
      try {
        data = response.json;
      } catch {
        const text = response.text || new TextDecoder('utf-8').decode(response.arrayBuffer);
        data = JSON.parse(text);
      }

      const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (!Array.isArray(tracks) || tracks.length === 0) {
        return [];
      }
      return tracks;
    } catch (err) {
      throw new Error(
        `Could not parse video data from page. The video may be unavailable or age-restricted.`,
      );
    }
  }

  private selectCaptionTrack(tracks: Array<{ baseUrl: string; kind?: string }>): {
    baseUrl: string;
  } {
    // Prefer manual captions over ASR (auto-generated)
    const manual = tracks.filter((t) => t.kind !== 'asr');
    if (manual.length > 0) return manual[0];
    return tracks[0];
  }

  /**
   * Fetch and parse caption XML. YouTube Android API returns <p t="ms" d="ms"> format.
   */
  private async fetchTranscript(
    captionUrl: string,
  ): Promise<Array<{ start: number; text: string }>> {
    let response;
    try {
      response = await requestUrl({
        url: captionUrl,
        method: 'GET',
        headers: { 'User-Agent': ANDROID_USER_AGENT },
      });
    } catch (err) {
      throw new Error(`Failed to fetch transcript: ${(err as Error).message}.`);
    }
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Failed to fetch transcript: HTTP ${response.status}.`);
    }

    const xmlText = response.text || new TextDecoder('utf-8').decode(response.arrayBuffer);
    if (!xmlText) {
      throw new Error('Failed to fetch transcript: empty response.');
    }

    const segments: Array<{ start: number; text: string }> = [];

    // Parse <p t="startMs" d="durationMs">text</p> format (Android API)
    const pRegex = /<p\s+t="(\d+)"\s+d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
    let match;
    while ((match = pRegex.exec(xmlText)) !== null) {
      const startMs = parseInt(match[1], 10);
      // Extract text: handle <s> sub-elements or plain text
      let text = match[3];
      const sMatches = text.match(/<s[^>]*>([^<]*)<\/s>/g);
      if (sMatches) {
        text = sMatches.map((s) => s.replace(/<[^>]+>/g, '')).join('');
      } else {
        text = text.replace(/<[^>]+>/g, '');
      }
      text = this.decodeEntities(text).trim();
      if (text) {
        segments.push({ start: startMs / 1000, text });
      }
    }

    // Fallback: try <text start="s" dur="s"> format (legacy)
    if (segments.length === 0) {
      const textRegex = /<text start="([^"]*)" dur="([^"]*)">([^<]*)<\/text>/g;
      while ((match = textRegex.exec(xmlText)) !== null) {
        const text = this.decodeEntities(match[3]).trim();
        if (text) {
          segments.push({ start: parseFloat(match[1]), text });
        }
      }
    }

    return segments;
  }

  private decodeEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
      .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
  }

  private formatTranscript(segments: Array<{ start: number; text: string }>): string {
    return segments
      .map((segment) => {
        const totalSeconds = Math.floor(segment.start);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const timestamp = `[${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}]`;
        return `${timestamp} ${segment.text}`;
      })
      .join('\n');
  }

  private extractJsonBlob(html: string, varName: string): unknown | null {
    let startIdx = html.indexOf(`var ${varName} = `);
    let offset = `var ${varName} = `.length;
    if (startIdx === -1) {
      startIdx = html.indexOf(`${varName} = `);
      offset = `${varName} = `.length;
    }
    if (startIdx === -1) return null;

    const searchStart = startIdx + offset;
    const braceStart = html.indexOf('{', searchStart);
    if (braceStart === -1) return null;

    let depth = 0;
    let inString = false;
    let i = braceStart;

    while (i < html.length) {
      const ch = html[i];
      if (inString) {
        if (ch === '\\') {
          i += 2;
          continue;
        }
        if (ch === '"') inString = false;
        i++;
        continue;
      }
      if (ch === '"') {
        inString = true;
        i++;
        continue;
      }
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(html.slice(braceStart, i + 1));
          } catch {
            return null;
          }
        }
      }
      i++;
    }
    return null;
  }

  private buildFrontmatter(meta: {
    url: string;
    title: string;
    channel: string | undefined;
    sourceType: string;
    ingestedAt: string;
  }): string {
    const lines: string[] = ['---'];
    lines.push(`url: "${meta.url.replace(/"/g, '\\"')}"`);
    lines.push(`title: "${meta.title.replace(/"/g, '\\"')}"`);
    if (meta.channel !== undefined) {
      lines.push(`channel: "${meta.channel.replace(/"/g, '\\"')}"`);
    }
    lines.push(`source_type: "${meta.sourceType}"`);
    lines.push(`ingested_at: "${meta.ingestedAt}"`);
    lines.push('---');
    return lines.join('\n') + '\n';
  }

  private slugify(title: string): string {
    let slug = title
      .toLowerCase()
      .replace(/[\s_]+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-{2,}/g, '-')
      .replace(/^-|-$/g, '');
    if (slug.length === 0) slug = 'ingested-page';
    return slug.substring(0, 60).replace(/-$/, '');
  }

  private async resolveFilePath(folder: string, slug: string): Promise<string> {
    let candidate = `${folder}/${slug}.md`;
    if (!this.vault.getAbstractFileByPath(candidate)) return candidate;
    for (let i = 2; i <= 100; i++) {
      candidate = `${folder}/${slug}-${i}.md`;
      if (!this.vault.getAbstractFileByPath(candidate)) return candidate;
    }
    throw new Error('Failed to save note: too many files with the same name.');
  }

  private async ensureFolder(folderPath: string): Promise<void> {
    const existing = this.vault.getAbstractFileByPath(folderPath);
    if (existing) return;
    const parts = folderPath.split('/');
    let current = '';
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      const node = this.vault.getAbstractFileByPath(current);
      if (node) {
        if (!('children' in node)) {
          throw new Error(`Failed to save note: "${current}" exists as a file, not a folder.`);
        }
        continue;
      }
      try {
        await this.vault.createFolder(current);
      } catch {
        const recheck = this.vault.getAbstractFileByPath(current);
        if (!recheck || !('children' in recheck)) {
          throw new Error(`Failed to save note: could not create folder "${current}".`);
        }
      }
    }
  }
}
