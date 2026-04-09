# Design: YouTube Ingestor

## Codebase Analysis

### Existing Architecture

The URL ingestion pipeline is a two-file system:

- **`src/ingestor/url-ingestor.ts`** — `UrlIngestor` class owns the full lifecycle: fetch HTML, extract content (Readability), convert to Markdown (Turndown), build frontmatter, save to vault. It also owns the reusable utility methods: `slugify`, `resolveFilePath`, `ensureFolder`, `buildFrontmatter`.
- **`src/ingestor/video-detector.ts`** — Pure function `detectVideoProvider(url)` that returns `"youtube" | "bilibili" | null`. Currently used only as a guard to throw a "not yet supported" error.

The routing decision happens at the top of `UrlIngestor.ingest()` (line 26-31). Today, if `detectVideoProvider` returns any non-null value, the method throws. The design goal is to route `"youtube"` to a new handler while keeping `"bilibili"` as a thrown error.

### Key Conventions

- All HTTP requests use `requestUrl` from Obsidian (not `fetch`).
- HTML/XML parsing uses the native `DOMParser` (Electron provides this).
- `IngestPhase` type is `"fetching" | "extracting" | "saving"` — three fixed phases, reused across all ingestor types.
- Frontmatter is built as quoted YAML strings with `\"` escaping for internal double-quotes.
- File naming uses `slugify` (max 60 chars, alphanumeric + hyphens) with numeric-suffix dedup up to 100.
- Progress is reported via an `onProgress` callback.

### UI Integration Points

- **`src/ui/chat-view.ts`** — `handleUrlIngest()` (line 106) calls `this.urlIngestor.ingest(url, callback)`. Displays phase text from a local `phaseText` map. No changes needed to routing; the ingestor handles it internally.
- **`src/ui/ingest-url-modal.ts`** — `doIngest()` (line 59) calls `this.ingestor.ingest(trimmed, callback)`. Same pattern. Has its own `PHASE_TEXT` map.

Both UI files have hardcoded phase text that says "Fetching page..." and "Extracting content...". The requirements ask for YouTube-specific text ("Fetching video info..." and "Extracting transcript..."). This requires the UI to know whether the URL is a YouTube URL so it can select the right display strings.

## Proposed Approach

### Architecture: Delegation Pattern

`YouTubeIngestor` is a standalone class in `src/ingestor/youtube-ingestor.ts` that handles the entire YouTube-specific pipeline (fetch page, extract metadata, find captions, fetch transcript XML, format, build note content). It returns an `IngestResult`.

`UrlIngestor.ingest()` is modified to delegate to `YouTubeIngestor` when `detectVideoProvider()` returns `"youtube"`. The `YouTubeIngestor` receives the `Vault`, `getIngestFolder`, and `onProgress` callback — it reuses the same utility methods by either calling them on `UrlIngestor` (made package-accessible) or by extracting them to shared helpers.

**Decision: Duplicate the three small utility methods** (`slugify`, `resolveFilePath`, `ensureFolder`) inside `YouTubeIngestor` rather than refactoring `UrlIngestor` to export them. Rationale: the requirements say minimal changes to existing files, and extracting utilities would change `UrlIngestor`'s structure. The three methods are small (total ~40 lines) and stable. If a third ingestor is added later, a refactor to shared utilities is warranted then.

**Revised decision: Pass the UrlIngestor instance to YouTubeIngestor** and call the utilities through it, after making them non-private (changing `private` to `public`). This avoids duplication while keeping the change to `UrlIngestor` minimal (only visibility modifier changes on 3 methods, plus the routing change). This is the better trade-off.

### Data Flow

```
User submits YouTube URL
  → UrlIngestor.ingest(url, onProgress)
    → detectVideoProvider(url) returns "youtube"
    → new YouTubeIngestor(vault, getIngestFolder).ingest(url, onProgress)
      → onProgress("fetching")
      → requestUrl(youtube page with User-Agent header)
      → extract video ID from URL
      → parse ytInitialPlayerResponse from HTML (regex)
      → extract title from ytInitialData / <title> tag
      → extract channel from ytInitialData
      → find captionTracks array
      → select best track (manual > asr, first-in-array tiebreak)
      → onProgress("extracting")
      → requestUrl(caption track baseUrl)
      → parse XML with DOMParser
      → format each <text> element as [MM:SS] line
      → onProgress("saving")
      → build frontmatter (source_type: "youtube")
      → slugify title, resolveFilePath, ensureFolder
      → vault.create(filePath, content)
      → return { title, filePath }
```

### UI Phase Text

The requirements specify that YouTube URLs should show different phase text ("Fetching video info..." instead of "Fetching page..."). The approach: both `chat-view.ts` and `ingest-url-modal.ts` use `detectVideoProvider` to choose between two phase-text maps. This is a small, contained change to each UI file.

### Alternatives Considered

| Approach | Pros | Cons |
|----------|------|------|
| A: YouTubeIngestor as standalone class, duplicate utilities | Zero changes to UrlIngestor internals | 40 lines of duplicated code |
| B: YouTubeIngestor receives UrlIngestor, calls public utilities | No duplication, minimal UrlIngestor change | Couples YouTubeIngestor to UrlIngestor |
| C: Extract utilities to shared module | Clean separation | Larger refactor of UrlIngestor, more files changed |

**Selected: Approach A** — The utilities are small and stable. Duplication keeps `UrlIngestor` changes to the absolute minimum (only the routing logic, ~5 lines). `YouTubeIngestor` is fully self-contained and testable in isolation. If a third ingestor arrives, we refactor to approach C at that point.

## Key Decisions

- **Video ID extraction**: Regex on the URL string. Two patterns: `youtube.com/watch?v=ID` (parse URL searchParams) and `youtu.be/ID` (parse pathname). Use the `URL` constructor, not regex on the full URL — because `URL` handles edge cases (extra params, fragments).

- **ytInitialPlayerResponse extraction**: Regex `ytInitialPlayerResponse\s*=\s*(\{.+?\});` is too greedy. Instead: find the string `ytInitialPlayerResponse` in the HTML, then locate the JSON blob boundaries by counting braces. Simpler robust approach: use regex `var ytInitialPlayerResponse\s*=\s*` to find the start, then scan forward for the matching closing brace. Even simpler and sufficient: `ytInitialPlayerResponse\s*=\s*(\{.*?\})\s*;` won't work because the JSON contains nested braces. **Final approach**: Find the index of `ytInitialPlayerResponse = `, then extract from the first `{` to the matching `}` using a brace-depth counter. This is robust against nested objects.

- **ytInitialData extraction (for title/channel)**: Same brace-counting approach for `var ytInitialData = {...};`. Extract title from `videoPrimaryInfoRenderer.title.runs[0].text` or fall back to the HTML `<title>` tag (with ` - YouTube` suffix stripped). Extract channel from `videoSecondaryInfoRenderer.owner.videoOwnerRenderer.title.runs[0].text`. If parsing fails, use video ID as fallback title, omit channel.

- **Caption track language selection**: Filter `captionTracks` into manual (no `kind` field or `kind \!== "asr"`) and auto (`kind === "asr"`). Pick first manual track, else first auto track.

- **Timestamp formatting**: `Math.floor(startSeconds)`, then `minutes = Math.floor(s / 60)`, `seconds = s % 60`, zero-pad both to 2 digits.

- **HTML entity decoding in transcript text**: `DOMParser` handles this automatically when parsing the XML — `textContent` returns decoded text. For any residual entities, create a temporary element and read `textContent`.

- **User-Agent header**: Hardcoded string per requirements: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36`.

- **Frontmatter field order**: `url`, `title`, `channel` (conditional), `source_type`, `ingested_at` — per AC-8.

- **UI phase text**: Use `detectVideoProvider` in both `chat-view.ts` and `ingest-url-modal.ts` to pick between web and YouTube phase text maps.

## Dependencies & Risks

- **YouTube page structure changes**: The `ytInitialPlayerResponse` variable name or JSON structure could change at any time. Mitigation: clear error messages ("Could not parse video data from page") so users understand the failure. This is an accepted limitation per the requirements.
- **Geo-blocking / age-restricted videos**: Some videos won't have `ytInitialPlayerResponse` or will have it without `captionTracks`. Mitigation: the error messages cover both cases (AC-5 errors).
- **Bot detection**: YouTube may return a consent page or CAPTCHA instead of the video page. Mitigation: the User-Agent header reduces this risk. If it happens, the parser won't find `ytInitialPlayerResponse` and will throw the appropriate error.
- **Large transcript XML**: Some videos have very long transcripts (2+ hour videos). The entire transcript is loaded into memory as a string. This is acceptable for a note-taking plugin — even a 3-hour video's transcript is under 1 MB of text.
- **No captions available**: Many YouTube videos have no captions at all. The error message is clear: "No subtitles are available for this video."

## Files Affected

- **`src/ingestor/youtube-ingestor.ts`** (NEW) — The full YouTube transcript extraction class. ~150-200 lines.
- **`src/ingestor/url-ingestor.ts`** — Routing change only: replace the blanket "not yet supported" throw with a conditional that delegates `"youtube"` to `YouTubeIngestor` and keeps `"bilibili"` as the existing error. ~10 lines changed.
- **`src/ui/chat-view.ts`** — Update `phaseText` map in `handleUrlIngest` to use YouTube-specific text when URL is a YouTube URL. ~5 lines changed.
- **`src/ui/ingest-url-modal.ts`** — Same: update `PHASE_TEXT` usage to be YouTube-aware. ~5 lines changed.
