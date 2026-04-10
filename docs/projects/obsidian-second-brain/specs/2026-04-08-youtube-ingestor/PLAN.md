# Implementation Plan: YouTube Ingestor

## Prerequisites

- The codebase builds successfully (`npm run build` passes).
- You have read and understand the requirements at `docs/specs/2026-04-08-youtube-ingestor/REQUIREMENTS.md`.

## Steps

### Step 1: Create `src/ingestor/youtube-ingestor.ts`

- **Files**: `src/ingestor/youtube-ingestor.ts` (new file)
- **Action**: Create the complete `YouTubeIngestor` class.
- **Do NOT**: Modify any other files in this step. Do NOT add any npm dependencies.

#### 1a. Imports and constants

```typescript
import { Vault, requestUrl } from 'obsidian';
import { IngestPhase, IngestResult, OnProgress } from './url-ingestor';
```

Define a constant for the User-Agent string:

```typescript
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
```

#### 1b. Class structure and constructor

```typescript
export class YouTubeIngestor {
  constructor(
    private vault: Vault,
    private getIngestFolder: () => string,
  ) {}
```

#### 1c. Public method: `ingest`

```typescript
async ingest(url: string, onProgress?: OnProgress): Promise<IngestResult>
```

This is the entry point. It orchestrates the full pipeline:

1. Extract video ID from URL via `this.extractVideoId(url)`.
2. Call `onProgress?.("fetching")`.
3. Fetch the YouTube page HTML via `this.fetchVideoPage(videoId)`.
4. Parse metadata (title, channel) via `this.extractMetadata(html, videoId)`.
5. Parse the `ytInitialPlayerResponse` and find caption tracks via `this.findCaptionTracks(html)`.
6. Select the best caption track via `this.selectCaptionTrack(tracks)`.
7. Call `onProgress?.("extracting")`.
8. Fetch and parse the transcript XML via `this.fetchTranscript(track.baseUrl)`.
9. Format transcript lines via `this.formatTranscript(segments)`.
10. Call `onProgress?.("saving")`.
11. Build the note content (frontmatter + heading + transcript).
12. Save to vault using `slugify`, `resolveFilePath`, `ensureFolder`.
13. Return `{ title, filePath }`.

#### 1d. Private method: `extractVideoId`

```typescript
private extractVideoId(url: string): string
```

- Parse the URL with `new URL(url)`.
- If hostname (with `www.` stripped) is `youtube.com`: return `searchParams.get("v")`. If `v` param is missing or empty, throw `"Could not extract video ID from URL."`.
- If hostname is `youtu.be`: return `pathname.slice(1).split("/")[0]`. If empty, throw same error.
- Otherwise throw same error.

#### 1e. Private method: `fetchVideoPage`

```typescript
private async fetchVideoPage(videoId: string): Promise<string>
```

- Call `requestUrl({ url: "https://www.youtube.com/watch?v=" + videoId, method: "GET", headers: { "User-Agent": USER_AGENT } })`.
- If `response.status < 200 || response.status >= 300`, throw `"Failed to fetch video page: HTTP {status}."`.
- Return `response.text`.
- Wrap in try/catch: if the error already starts with `"Failed to fetch video page:"`, rethrow; otherwise wrap as `"Failed to fetch video page: HTTP {status}."`. Note: `requestUrl` throws on network errors, so the catch should wrap those as `"Failed to fetch video page: {err.message}."`.

#### 1f. Private method: `extractMetadata`

```typescript
private extractMetadata(html: string, videoId: string): { title: string; channel: string | undefined }
```

- Try to extract `ytInitialData` JSON from the HTML using `this.extractJsonBlob(html, "ytInitialData")`.
- If found, try to navigate the JSON to find the title:
  - Look for the `<title>` tag in HTML as primary source: parse with DOMParser, get `doc.querySelector("title")?.textContent`, strip trailing ` - YouTube` suffix.
  - If title is empty or not found, use the video ID as fallback.
- For channel name: if `ytInitialData` was parsed, try to find it at the path `contents.twoColumnWatchNextResults.results.results.contents` — look for an item that has `videoSecondaryInfoRenderer`, then navigate to `.videoSecondaryInfoRenderer.owner.videoOwnerRenderer.title.runs[0].text`.
  - If channel cannot be extracted at any point, set channel to `undefined` (not empty string).
- This method must NOT throw. It always returns at least `{ title: videoId, channel: undefined }` as fallback.

#### 1g. Private method: `extractJsonBlob`

```typescript
private extractJsonBlob(html: string, varName: string): unknown | null
```

- Find the index of `var ${varName} = ` in the HTML string.
- If not found, try `${varName} = ` (without `var `).
- If still not found, return `null`.
- Starting from the first `{` after the match, count brace depth: increment on `{`, decrement on `}`. When depth reaches 0, slice the substring from the opening `{` to the closing `}` (inclusive).
- Handle quoted strings: when inside a string (after an unescaped `"`), skip characters until the next unescaped `"`. This prevents counting braces inside string values.
- Call `JSON.parse()` on the extracted substring. If parsing fails, return `null`.

**Important implementation detail for the brace counter**: You must track whether you are inside a JSON string literal. When you encounter a `"` that is not preceded by a `\`, toggle an `inString` boolean. Only count `{` and `}` when `inString` is false. Also handle escaped backslashes: `\\"` means the quote is NOT escaped (the backslash itself is escaped). The simplest correct approach: when inside a string and you see `\`, skip the next character (it is an escape sequence).

#### 1h. Private method: `findCaptionTracks`

```typescript
private findCaptionTracks(html: string): Array<{ baseUrl: string; languageCode: string; kind?: string; name?: { simpleText?: string } }>
```

- Call `this.extractJsonBlob(html, "ytInitialPlayerResponse")`.
- If result is `null`, throw `"Could not parse video data from page. The video may be unavailable or age-restricted."`.
- Navigate to `(result as any).captions?.playerCaptionsTracklistRenderer?.captionTracks`.
- If the value is not an array or is empty, throw `"No subtitles are available for this video."`.
- Return the array.

#### 1i. Private method: `selectCaptionTrack`

```typescript
private selectCaptionTrack(tracks: Array<{ baseUrl: string; kind?: string }>): { baseUrl: string }
```

- Partition tracks into `manual` (where `track.kind \!== "asr"` or `kind` is absent/undefined) and `asr` (where `track.kind === "asr"`).
- If `manual.length > 0`, return `manual[0]`.
- Return `asr[0]`.
- (The caller already verified tracks is non-empty, so this always returns a value.)

#### 1j. Private method: `fetchTranscript`

```typescript
private async fetchTranscript(captionUrl: string): Promise<Array<{ start: number; text: string }>>
```

- Call `requestUrl({ url: captionUrl, method: "GET" })`.
- If `response.status < 200 || response.status >= 300`, throw `"Failed to fetch transcript: HTTP {status}."`.
- Parse the XML: `new DOMParser().parseFromString(response.text, "text/xml")`.
- Select all `<text>` elements: `doc.querySelectorAll("text")`.
- Map each element to `{ start: parseFloat(el.getAttribute("start") || "0"), text: el.textContent || "" }`.
- Return the array.

**Note on HTML entity decoding**: `DOMParser` when parsing as `"text/xml"` will decode standard XML entities (`&amp;`, `&lt;`, `&gt;`, `&apos;`, `&quot;`). However, YouTube caption XML may contain HTML numeric entities like `&#39;`. XML parsers handle numeric entities natively, so `el.textContent` will return the decoded character. No additional decoding step is needed.

**Important edge case**: YouTube caption XML sometimes contains HTML entities that are not valid in XML (like `&nbsp;`). If `DOMParser` with `"text/xml"` fails (returns a parsererror document), fall back to parsing as `"text/html"` and then query `text` elements from the resulting document. Check for parse errors: `if (doc.querySelector("parsererror")) { doc = new DOMParser().parseFromString(response.text, "text/html"); }`.

#### 1k. Private method: `formatTranscript`

```typescript
private formatTranscript(segments: Array<{ start: number; text: string }>): string
```

- Map each segment:
  - `totalSeconds = Math.floor(segment.start)`
  - `minutes = Math.floor(totalSeconds / 60)`
  - `seconds = totalSeconds % 60`
  - `timestamp = [${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}]`
  - Return `${timestamp} ${segment.text}`
- Join all lines with `\n`.

#### 1l. Private method: `buildFrontmatter`

```typescript
private buildFrontmatter(meta: {
  url: string;
  title: string;
  channel: string | undefined;
  sourceType: string;
  ingestedAt: string;
}): string
```

- Build YAML frontmatter with fields in this exact order: `url`, `title`, `channel` (only if defined), `source_type`, `ingested_at`.
- All string values wrapped in double quotes, with internal double-quotes escaped as `\"`.
- Format:
  ```
  ---
  url: "..."
  title: "..."
  channel: "..."     ← only if meta.channel is defined
  source_type: "youtube"
  ingested_at: "..."
  ---
  ```

#### 1m. Utility methods (duplicated from UrlIngestor)

Copy these three methods exactly as they appear in `url-ingestor.ts` (lines 142-200), as private methods on `YouTubeIngestor`:

- `private slugify(title: string): string` — identical to UrlIngestor.slugify
- `private async resolveFilePath(folder: string, slug: string): Promise<string>` — identical to UrlIngestor.resolveFilePath
- `private async ensureFolder(folderPath: string): Promise<void>` — identical to UrlIngestor.ensureFolder

Copy them verbatim. Do not modify their logic.

#### 1n. Putting `ingest()` together — the full body

```typescript
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
```

- **Verify**: The file compiles with no TypeScript errors (`npm run build`). The class exports `YouTubeIngestor`. It imports only from `obsidian` and `./url-ingestor` (for types).

---

### Step 2: Modify `src/ingestor/url-ingestor.ts` — route YouTube URLs

- **Files**: `src/ingestor/url-ingestor.ts`
- **Action**: Change the video provider check at lines 26-31 to route YouTube to `YouTubeIngestor` instead of throwing.

#### 2a. Add import at the top of the file

After the existing imports (line 4), add:

```typescript
import { YouTubeIngestor } from './youtube-ingestor';
```

#### 2b. Replace the video provider block

Replace lines 26-31 (the `if (videoProvider)` block) with:

```typescript
const videoProvider = detectVideoProvider(url);
if (videoProvider === 'youtube') {
  const ytIngestor = new YouTubeIngestor(this.vault, this.getIngestFolder);
  return ytIngestor.ingest(url, onProgress);
}
if (videoProvider === 'bilibili') {
  throw new Error(
    'Bilibili ingestion is not yet supported. This will be available in a future update.',
  );
}
```

- **Do NOT**: Change anything else in this file. Do not modify `fetchHtml`, `extractArticle`, `buildFrontmatter`, `slugify`, `resolveFilePath`, `ensureFolder`, or any other method.
- **Verify**: `npm run build` passes. A YouTube URL triggers the YouTube path. A Bilibili URL still throws. A normal URL still goes through the web ingestion path.

---

### Step 3: Update UI phase text for YouTube URLs

- **Files**: `src/ui/chat-view.ts`, `src/ui/ingest-url-modal.ts`
- **Action**: Make phase text YouTube-aware.

#### 3a. Modify `src/ui/chat-view.ts`

Add import at the top (after existing imports):

```typescript
import { detectVideoProvider } from '../ingestor/video-detector';
```

In the `handleUrlIngest` method (around line 111), replace the `phaseText` constant with:

```typescript
const isYouTube = detectVideoProvider(url) === 'youtube';
const phaseText: Record<IngestPhase, string> = {
  fetching: isYouTube ? 'Fetching video info...' : 'Fetching page...',
  extracting: isYouTube ? 'Extracting transcript...' : 'Extracting content...',
  saving: 'Saving note...',
};
```

- **Do NOT**: Change anything else in this file.

#### 3b. Modify `src/ui/ingest-url-modal.ts`

Add import at the top (after existing imports):

```typescript
import { detectVideoProvider } from '../ingestor/video-detector';
```

The module-level `PHASE_TEXT` constant (lines 4-8) is used inside `doIngest`. Change the `doIngest` method to compute phase text locally instead. Inside `doIngest`, after the URL validation block and before the `try` block (around line 73), add:

```typescript
const isYouTube = detectVideoProvider(trimmed) === 'youtube';
const phaseText: Record<IngestPhase, string> = {
  fetching: isYouTube ? 'Fetching video info...' : 'Fetching page...',
  extracting: isYouTube ? 'Extracting transcript...' : 'Extracting content...',
  saving: 'Saving note...',
};
```

Then change the `onProgress` callback (line 79) from `PHASE_TEXT[phase]` to `phaseText[phase]`.

You may either remove the module-level `PHASE_TEXT` constant or leave it in place (it becomes unused). If you remove it, make sure no other code references it.

- **Do NOT**: Change any other behavior in the modal.
- **Verify**: `npm run build` passes.

---

### Step 4: Build and verify

- **Files**: None (verification only)
- **Action**: Run `npm run build` and confirm zero errors.
- **Verify**:
  1. `npm run build` exits with code 0.
  2. The output bundle includes `youtube-ingestor` code (search the build output for `YouTubeIngestor`).
  3. Review the compiled output to confirm:
     - `url-ingestor.js` imports and delegates to `YouTubeIngestor` for YouTube URLs.
     - `youtube-ingestor.js` exists and exports the class.
     - `chat-view.js` and `ingest-url-modal.js` import `detectVideoProvider`.
