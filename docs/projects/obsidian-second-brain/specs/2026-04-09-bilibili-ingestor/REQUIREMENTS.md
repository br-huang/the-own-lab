# Feature: Bilibili Ingestor

## Summary
When a user provides a Bilibili video URL via the existing URL ingest flow, the plugin should use
`yt-dlp` to discover metadata and available subtitles, fetch the selected subtitle track, convert it
 to Markdown, and save it into the configured ingest folder. The integration must try anonymous
 access first and only rely on cookies when the video requires authentication.

---

## Acceptance Criteria

### AC-1: URL routing
- [ ] When `UrlIngestor.ingest()` receives a URL where `detectVideoProvider()` returns `"bilibili"`,
  it routes to a Bilibili-specific ingestor rather than throwing the current stub error.
- [ ] Existing web-page ingestion behavior for non-video URLs remains unchanged.
- [ ] Existing YouTube routing remains unchanged.

### AC-2: Input URLs
- [ ] `https://www.bilibili.com/video/BV...`
- [ ] `https://b23.tv/...`
- [ ] Additional query params or fragments do not prevent ingestion.
- [ ] If `yt-dlp` cannot resolve the URL into a supported Bilibili video, the user sees a parse
  failure message from the Bilibili ingestor.

### AC-3: yt-dlp execution
- [ ] The ingestor invokes a configurable `yt-dlp` command, defaulting to `yt-dlp`.
- [ ] The first attempt is made without cookies.
- [ ] If `yt-dlp` is not available, the ingestor throws:
  `"yt-dlp is not installed or not configured. Install yt-dlp or set its path in plugin settings."`
- [ ] If the anonymous attempt fails with a login/authentication/cookie-required error and a cookies
  path is configured, the ingestor retries once with `--cookies {path}`.

### AC-4: Settings
- [ ] Plugin settings include a text field for the `yt-dlp` command or absolute path.
- [ ] Plugin settings include an optional text field for a Netscape-format `cookies.txt` path used
  only when Bilibili requires authentication.
- [ ] The setting descriptions explain that cookies are optional fallback credentials.

### AC-5: Metadata extraction
- [ ] The ingestor extracts the title from `yt-dlp --dump-single-json` output.
- [ ] The ingestor extracts the uploader/owner name when present.
- [ ] If no non-empty title is available, it falls back to `"bilibili-video"`.

### AC-6: Subtitle discovery
- [ ] The ingestor checks both `subtitles` and `automatic_captions` from the `yt-dlp` JSON output.
- [ ] Subtitle selection priority is:
  1. Manual subtitles in Chinese (`zh-*`, `zh`, `cmn-*`, `yue-*`)
  2. Manual subtitles in any language
  3. Automatic captions in Chinese
  4. Automatic captions in any language
- [ ] If no subtitle entries are available after selection, the ingestor throws:
  `"No subtitles are available for this Bilibili video."`

### AC-7: Subtitle fetch and parsing
- [ ] The selected subtitle URL is fetched using Obsidian's `requestUrl`.
- [ ] JSON subtitle bodies in Bilibili's format (`body[].content`) are supported.
- [ ] WebVTT subtitles are supported.
- [ ] SRT subtitles are supported.
- [ ] The final transcript is rendered one segment per line as `[MM:SS] text`.
- [ ] Empty subtitle lines are skipped.

### AC-8: Progress phases
- [ ] `onProgress("fetching")` is fired before calling `yt-dlp`.
- [ ] `onProgress("extracting")` is fired after subtitle metadata is selected and before fetching the
  subtitle file.
- [ ] `onProgress("saving")` is fired before writing the Markdown note to the vault.
- [ ] Chat view and Ingest URL modal display Bilibili-specific phase text:
  - `"fetching"` → `"Fetching Bilibili video info..."`
  - `"extracting"` → `"Extracting subtitles..."`
  - `"saving"` → `"Saving note..."`

### AC-9: Output note
- [ ] The saved Markdown file begins with YAML frontmatter.
- [ ] Frontmatter fields appear in this order:
  - `url`
  - `title`
  - `channel` (omit if absent)
  - `source_type`
  - `ingested_at`
- [ ] `source_type` is the literal string `"bilibili"`.
- [ ] The body format is:
  - `# {title}`
  - blank line
  - transcript lines

### AC-10: File saving
- [ ] Files are saved to `getIngestFolder()` or `"Ingested"` when empty.
- [ ] File naming uses the same slugification and dedup behavior as existing ingestors.
- [ ] Nested ingest folders are created automatically.
- [ ] On vault write failure, the ingestor throws:
  `"Failed to save note: {underlying message}"`

### AC-11: User-facing errors
- [ ] Missing `yt-dlp` binary:
  `"yt-dlp is not installed or not configured. Install yt-dlp or set its path in plugin settings."`
- [ ] No subtitles:
  `"No subtitles are available for this Bilibili video."`
- [ ] Login required with no cookies configured:
  `"This Bilibili video requires login. Configure a cookies.txt path in settings and try again."`
- [ ] Configured cookies path still fails auth:
  `"Bilibili access failed even with cookies. Refresh your cookies.txt and try again."`
- [ ] Subtitle fetch HTTP failure:
  `"Failed to fetch subtitles: HTTP {status}."`
- [ ] Subtitle parse failure:
  `"Failed to parse subtitles: {underlying message}"`

---

## Scope

### In Scope
- Bilibili transcript ingestion from the existing URL ingest entry points
- `yt-dlp` integration through the local executable
- Optional cookies fallback
- Markdown transcript output compatible with the current RAG pipeline

### Out of Scope
- Downloading the video file itself
- OCR, ASR, Whisper, or VLM fallback when subtitles do not exist
- Playlist or series ingestion
- Cookie extraction from browsers
- Auto-installing `yt-dlp`

