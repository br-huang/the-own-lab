# Feature: YouTube Ingestor

## Summary

When a user provides a YouTube URL (via Chat URL detection or the Ingest URL modal), the plugin
fetches the video's transcript/subtitles from YouTube, formats it as a timestamped Markdown note,
and saves it to the configured ingest folder — replacing the current "not yet supported" stub.

---

## Acceptance Criteria

### AC-1: YouTube URL routing

- [ ] When `UrlIngestor.ingest()` receives a URL where `detectVideoProvider()` returns `"youtube"`,
      execution is routed to the YouTube ingestor path instead of throwing the "not yet supported" error.
- [ ] When `detectVideoProvider()` returns `"bilibili"`, the existing "not yet supported" error is
      still thrown unchanged.
- [ ] When `detectVideoProvider()` returns `null`, the existing web-page ingestion path runs
      unchanged.

### AC-2: Video ID extraction

- [ ] The video ID is correctly extracted from all of these URL forms:
  - `https://www.youtube.com/watch?v=VIDEO_ID`
  - `https://youtu.be/VIDEO_ID`
  - `https://www.youtube.com/watch?v=VIDEO_ID&t=120` (extra query params ignored)
- [ ] If no video ID can be parsed from the URL, the ingestor throws an error with the message:
      `"Could not extract video ID from URL."`

### AC-3: Page fetch via requestUrl

- [ ] The YouTube video page (`https://www.youtube.com/watch?v=VIDEO_ID`) is fetched using
      Obsidian's `requestUrl`, not the browser `fetch` API.
- [ ] The request includes a `User-Agent` header value of
      `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36`
      to avoid bot-blocking responses.
- [ ] If the HTTP response status is not 2xx, the ingestor throws:
      `"Failed to fetch video page: HTTP {status}."`

### AC-4: Video metadata extraction

- [ ] The video title is extracted from `ytInitialData` or `<title>` in the fetched HTML.
- [ ] The channel name is extracted from `ytInitialData` if present; the field is omitted from
      frontmatter (not set to empty string) if the channel name cannot be extracted.
- [ ] If neither title nor channel can be parsed, the video ID is used as a fallback title.

### AC-5: Caption track discovery

- [ ] The raw HTML is searched for the `ytInitialPlayerResponse` JSON blob.
- [ ] The `captions.playerCaptionsTracklistRenderer.captionTracks` array is parsed from that blob.
- [ ] If `ytInitialPlayerResponse` is not found in the page HTML, the ingestor throws:
      `"Could not parse video data from page. The video may be unavailable or age-restricted."`
- [ ] If the `captionTracks` array is empty or absent, the ingestor throws:
      `"No subtitles are available for this video."`

### AC-6: Caption track language selection

- [ ] Given multiple available caption tracks, the track is selected by this priority order:
  1. Manual (non-auto-generated) captions in any language.
  2. Auto-generated (`kind: "asr"`) captions in any language.
- [ ] When multiple manual tracks exist, the first track in the `captionTracks` array is used.
- [ ] When only auto-generated tracks exist, the first `asr` track is used.

### AC-7: Transcript XML fetch and parse

- [ ] The caption track's `baseUrl` is fetched via `requestUrl`.
- [ ] If the HTTP response status is not 2xx, the ingestor throws:
      `"Failed to fetch transcript: HTTP {status}."`
- [ ] The XML response is parsed with `DOMParser` to extract all `<text>` elements.
- [ ] Each `<text>` element's `start` attribute (seconds, decimal) is converted to `[MM:SS]` format
      (zero-padded, e.g. `[01:07]`), where seconds are rounded down to the nearest integer.
- [ ] Each `<text>` element's text content has HTML entities decoded (e.g. `&#39;` → `'`,
      `&amp;` → `&`).
- [ ] Transcript segments are joined into a single string with one segment per line in the format:
      `[MM:SS] text of segment`.

### AC-8: Note frontmatter

- [ ] The saved Markdown file begins with a YAML frontmatter block containing exactly these fields
      in this order:
  ```
  url: "{original URL}"
  title: "{video title}"
  channel: "{channel name}"   ← omitted entirely if channel not extractable
  source_type: "youtube"
  ingested_at: "{ISO 8601 datetime}"
  ```
- [ ] `source_type` is the literal string `"youtube"` (not `"web"`).
- [ ] `ingested_at` is an ISO 8601 string (e.g. `2026-04-08T10:30:00.000Z`).
- [ ] All string values in frontmatter have internal double-quotes escaped as `\"`.

### AC-9: Note body

- [ ] After the frontmatter, the note contains a level-1 heading with the video title: `# {title}`.
- [ ] Following the heading, the transcript block appears with no additional heading or wrapper.
- [ ] Each transcript line follows the format `[MM:SS] text`, one line per segment.
- [ ] The final file content is: `{frontmatter}\n# {title}\n\n{transcript lines}`.

### AC-10: File naming and saving

- [ ] The file is saved inside the folder returned by `getIngestFolder()` (defaulting to
      `"Ingested"` as defined in `DEFAULT_SETTINGS`).
- [ ] The filename is produced by passing the video title through the same `slugify` logic already
      used for web-page ingestion (max 60 chars, alphanumeric and hyphens only).
- [ ] If a file with the same slug already exists, the same numeric-suffix collision strategy is
      applied (e.g. `slug-2.md`, `slug-3.md`, up to 100).
- [ ] `ensureFolder` is called before writing, creating nested folders if needed.
- [ ] On vault write failure, the ingestor throws: `"Failed to save note: {underlying message}"`.

### AC-11: Progress phases

- [ ] `onProgress` is called with `"fetching"` before the YouTube page HTTP request is made.
- [ ] `onProgress` is called with `"extracting"` after the page is fetched and before the
      transcript XML is fetched and parsed.
- [ ] `onProgress` is called with `"saving"` after transcript parsing and before writing to vault.
- [ ] The Chat view displays the following text for each phase:
  - `"fetching"` → `"Fetching video info..."` (changed from current `"Fetching page..."`)
  - `"extracting"` → `"Extracting transcript..."` (changed from current `"Extracting content..."`)
  - `"saving"` → `"Saving note..."` (unchanged)
- [ ] The Ingest URL modal displays the same phase text as the Chat view for YouTube URLs.

### AC-12: Chat view integration

- [ ] Pasting a YouTube URL (matching `/^https?:\/\/\S+$/`) into the Chat input and submitting
      routes through `handleUrlIngest`, which calls `UrlIngestor.ingest()`.
- [ ] On success, the chat bubble displays:
      `Ingested: "{title}" → {filePath}`
- [ ] On error, the chat bubble displays the error message via `renderError`.

### AC-13: Command palette modal integration

- [ ] Opening the "Ingest URL" modal and submitting a YouTube URL calls `UrlIngestor.ingest()`.
- [ ] On success, the modal status element shows the success text and auto-closes after 2 seconds.
- [ ] On error, the modal re-enables the input and button for retry and shows the error text.

### AC-14: Error messages (user-facing)

- [ ] Video ID not parseable: `"Could not extract video ID from URL."`
- [ ] Page fetch HTTP error: `"Failed to fetch video page: HTTP {status}."`
- [ ] `ytInitialPlayerResponse` not found: `"Could not parse video data from page. The video may be unavailable or age-restricted."`
- [ ] No captions available: `"No subtitles are available for this video."`
- [ ] Transcript fetch HTTP error: `"Failed to fetch transcript: HTTP {status}."`
- [ ] Vault write failure: `"Failed to save note: {underlying message}"`

---

## Scope

### In Scope

- YouTube transcript extraction via `ytInitialPlayerResponse` parsing (no YouTube Data API key required)
- Support for both `youtube.com/watch?v=` and `youtu.be/` URL formats
- Manual and auto-generated (`asr`) caption tracks
- Timestamped Markdown transcript formatting (`[MM:SS]`)
- YAML frontmatter with `source_type: "youtube"`
- Integration with both Chat view URL detection and Ingest URL modal
- Updated progress phase display text for YouTube-specific phases
- File naming, deduplication, and folder creation consistent with existing URL ingestor

### Out of Scope

- Bilibili ingestion (stub error remains)
- Whisper or any audio/video transcription (no audio download)
- Video thumbnail extraction or embedding
- YouTube Data API v3 integration
- Multi-language transcript selection UI (language preference setting)
- Translation of transcripts
- Chapter markers or description extraction
- Support for YouTube playlists or channel URLs
- Timestamp hyperlinking back to the YouTube video

---

## Constraints

- All HTTP requests must use Obsidian's `requestUrl`, not the browser `fetch` API, to comply with
  Obsidian's plugin content-security policy.
- HTML parsing must use `DOMParser`, which is available in Obsidian's environment.
- No new npm dependencies may be added for transcript extraction; implementation must be
  self-contained using `requestUrl` and `DOMParser`.
- The `ytInitialPlayerResponse` parsing approach depends on YouTube's current page structure.
  If YouTube changes this structure, transcript extraction will break silently — this is a known
  limitation accepted for Phase 3.
- The `IngestPhase` type (`"fetching" | "extracting" | "saving"`) must not be changed; the same
  three phases are reused with updated display strings in the UI layer.
- The feature must not alter the behavior of web-page ingestion for non-YouTube URLs.

---

## Open Questions

None. All ambiguities have been resolved in the requirements above.
