# Test Report: YouTube Ingestor

## Summary

- Total tests: 0 automated (no test runner configured in project)
- Passed: N/A
- Failed: N/A
- Coverage: N/A (static code review + build verification)

Note: This project has no test runner (Jest/Vitest/etc) configured. All verification
was performed via static code analysis, TypeScript compilation, and build output inspection.

---

## Acceptance Criteria Verification

| Criterion                                                                                        | Status | Evidence                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------- |
| AC-1: YouTube URL → YouTubeIngestor                                                              | PASS   | `url-ingestor.ts` line 28-31: `if (videoProvider === "youtube") { const ytIngestor = new YouTubeIngestor(...); return ytIngestor.ingest(url, onProgress); }`                      |
| AC-1: Bilibili → "not yet supported" error unchanged                                             | PASS   | `url-ingestor.ts` lines 32-36: throws same error text as before                                                                                                                   |
| AC-1: null provider → web-page ingestion runs unchanged                                          | PASS   | `url-ingestor.ts` lines 38-71: fetch/extract/save flow untouched                                                                                                                  |
| AC-2: Extract ID from `youtube.com/watch?v=ID`                                                   | PASS   | `extractVideoId` lines 57-63: `searchParams.get("v")`                                                                                                                             |
| AC-2: Extract ID from `youtu.be/ID`                                                              | PASS   | `extractVideoId` lines 65-70: `pathname.slice(1).split("/")[0]`                                                                                                                   |
| AC-2: Extra query params (`?v=ID&t=120`) ignored                                                 | PASS   | Only `searchParams.get("v")` is used; `t` param discarded                                                                                                                         |
| AC-2: No video ID → throws `"Could not extract video ID from URL."`                              | PASS   | Lines 60, 68, 73 all throw exact message                                                                                                                                          |
| AC-3: Page fetched via `requestUrl` (not `fetch`)                                                | PASS   | `fetchVideoPage` line 78: `requestUrl({...})`                                                                                                                                     |
| AC-3: User-Agent header set correctly                                                            | PASS   | Lines 4-5: `USER_AGENT` constant matches spec; line 81 passes it as header                                                                                                        |
| AC-3: Non-2xx status → `"Failed to fetch video page: HTTP {status}."`                            | PASS   | Line 84: exact error format                                                                                                                                                       |
| AC-4: Title extracted from `<title>` tag                                                         | PASS   | `extractMetadata` lines 108-117: `DOMParser` → `querySelector("title")`, strips ` - YouTube` suffix                                                                               |
| AC-4: Channel extracted from `ytInitialData`                                                     | PASS   | Lines 124-140: navigates `ytInitialData.contents.twoColumnWatchNextResults.results.results.contents` for `videoSecondaryInfoRenderer.owner.videoOwnerRenderer.title.runs[0].text` |
| AC-4: Channel omitted (not empty string) when not extractable                                    | PASS   | Line 105: `let channel: string                                                                                                                                                    | undefined = undefined`; `buildFrontmatter`line 300:`if (meta.channel \!== undefined)` |
| AC-4: videoId used as fallback title when neither parses                                         | PASS   | Line 104: `let title: string = videoId` as initial value; method never throws                                                                                                     |
| AC-5: HTML searched for `ytInitialPlayerResponse` JSON                                           | PASS   | `findCaptionTracks` line 221: `this.extractJsonBlob(html, "ytInitialPlayerResponse")`                                                                                             |
| AC-5: `captions.playerCaptionsTracklistRenderer.captionTracks` parsed                            | PASS   | Lines 228-229: exact property path                                                                                                                                                |
| AC-5: `ytInitialPlayerResponse` not found → correct error                                        | PASS   | Lines 222-225: throws `"Could not parse video data from page. The video may be unavailable or age-restricted."`                                                                   |
| AC-5: Empty/absent `captionTracks` → `"No subtitles are available for this video."`              | PASS   | Lines 231-233: `\!Array.isArray(tracks)                                                                                                                                           |                                                                                       | tracks.length === 0` check |
| AC-6: Manual captions selected over ASR                                                          | PASS   | `selectCaptionTrack` line 241: `tracks.filter((t) => t.kind \!== "asr")`                                                                                                          |
| AC-6: First manual track used when multiple manual tracks exist                                  | PASS   | Line 243: `return manual[0]`                                                                                                                                                      |
| AC-6: First ASR track used when only ASR tracks exist                                            | PASS   | Line 245: `return tracks[0]` (after manual filter returned empty)                                                                                                                 |
| AC-7: Transcript XML fetched via `requestUrl`                                                    | PASS   | `fetchTranscript` line 251: `requestUrl({ url: captionUrl, method: "GET" })`                                                                                                      |
| AC-7: Non-2xx transcript status → `"Failed to fetch transcript: HTTP {status}."`                 | PASS   | Lines 252-255                                                                                                                                                                     |
| AC-7: XML parsed with `DOMParser`, `<text>` elements extracted                                   | PASS   | Lines 258-270                                                                                                                                                                     |
| AC-7: `start` attribute → `[MM:SS]` zero-padded, floor to integer                                | PASS   | `formatTranscript` lines 281-284: `Math.floor`, `padStart(2, "0")`                                                                                                                |
| AC-7: HTML entities decoded                                                                      | PASS   | `el.textContent` used (DOM API decodes entities natively); fallback to `text/html` parse on XML error (lines 259-261)                                                             |
| AC-7: Segments joined one per line as `[MM:SS] text`                                             | PASS   | Lines 285-287: `.join("\n")`                                                                                                                                                      |
| AC-8: Frontmatter fields in correct order (url, title, channel?, source_type, ingested_at)       | PASS   | `buildFrontmatter` lines 298-305: exact order matches spec                                                                                                                        |
| AC-8: `source_type` is `"youtube"`                                                               | PASS   | Line 38: `sourceType: "youtube"` passed to `buildFrontmatter`                                                                                                                     |
| AC-8: `ingested_at` is ISO 8601                                                                  | PASS   | Line 39: `new Date().toISOString()`                                                                                                                                               |
| AC-8: Internal double-quotes escaped as `\"`                                                     | PASS   | Lines 298-302: `.replace(/"/g, '\\"')` applied to url, title, channel                                                                                                             |
| AC-9: Note begins with frontmatter, then `# {title}` heading                                     | PASS   | Line 42: `frontmatter + "\n" + "# " + title + "\n\n" + transcript`                                                                                                                |
| AC-9: No additional heading or wrapper around transcript                                         | PASS   | Transcript appended directly after heading and blank line                                                                                                                         |
| AC-9: Format `{frontmatter}\n# {title}\n\n{transcript}`                                          | PASS   | `buildFrontmatter` ends with `\n`, then `"\n# title\n\n"`                                                                                                                         |
| AC-10: File saved in `getIngestFolder()` (default `"Ingested"`)                                  | PASS   | Line 28: `this.getIngestFolder()                                                                                                                                                  |                                                                                       | "Ingested"`                |
| AC-10: Filename uses same `slugify` logic                                                        | PASS   | `slugify` implementation (lines 309-322) is identical to `url-ingestor.ts`                                                                                                        |
| AC-10: Numeric-suffix collision strategy (`slug-2.md` … `slug-100.md`)                           | PASS   | `resolveFilePath` lines 324-343: loop from 2 to 100                                                                                                                               |
| AC-10: `ensureFolder` called before writing                                                      | PASS   | Line 29: `await this.ensureFolder(folder)` before `vault.create`                                                                                                                  |
| AC-10: Vault write failure → `"Failed to save note: {message}"`                                  | PASS   | Lines 44-48: try/catch wraps `vault.create`                                                                                                                                       |
| AC-11: `onProgress("fetching")` before HTTP request                                              | PASS   | Line 16: `onProgress?.("fetching")` before `fetchVideoPage` call                                                                                                                  |
| AC-11: `onProgress("extracting")` after page fetch, before transcript fetch                      | PASS   | Line 23: `onProgress?.("extracting")` after `extractMetadata`/`findCaptionTracks`, before `fetchTranscript`                                                                       |
| AC-11: `onProgress("saving")` after transcript parse, before vault write                         | PASS   | Line 27: `onProgress?.("saving")` after `formatTranscript`, before `ensureFolder`/`vault.create`                                                                                  |
| AC-11: Chat view — `"fetching"` → `"Fetching video info..."` for YouTube                         | PASS   | `chat-view.ts` lines 113-117: `isYouTube ? "Fetching video info..." : "Fetching page..."`                                                                                         |
| AC-11: Chat view — `"extracting"` → `"Extracting transcript..."` for YouTube                     | PASS   | `chat-view.ts` line 115: `isYouTube ? "Extracting transcript..." : "Extracting content..."`                                                                                       |
| AC-11: Chat view — `"saving"` → `"Saving note..."`                                               | PASS   | `chat-view.ts` line 116: `"Saving note..."`                                                                                                                                       |
| AC-11: Modal — same phase text as Chat view for YouTube                                          | PASS   | `ingest-url-modal.ts` lines 73-77: identical `phaseText` logic with `detectVideoProvider`                                                                                         |
| AC-12: YouTube URL in chat routes through `handleUrlIngest` → `UrlIngestor.ingest()`             | PASS   | `chat-view.ts` lines 77-80: URL regex check routes to `handleUrlIngest`; line 126 calls `this.urlIngestor.ingest(url, ...)`                                                       |
| AC-12: Success → `Ingested: "{title}" → {filePath}`                                              | PASS   | `chat-view.ts` line 136: exact format                                                                                                                                             |
| AC-12: Error → `renderError`                                                                     | PASS   | Lines 138-139: catch calls `this.renderError(bubbleEl, ...)`                                                                                                                      |
| AC-13: Modal submits YouTube URL → `UrlIngestor.ingest()`                                        | PASS   | `ingest-url-modal.ts` line 80: `this.ingestor.ingest(trimmed, ...)`                                                                                                               |
| AC-13: Success → status shows text, auto-closes after 2 seconds                                  | PASS   | Lines 84-89: `statusEl.setText(...)`, `setTimeout(() => this.close(), 2000)`                                                                                                      |
| AC-13: Error → input/button re-enabled, error shown                                              | PASS   | Lines 90-95: `statusEl.addClass("kb-ingest-error")`, `urlInput.disabled = false`, `ingestBtn.disabled = false`                                                                    |
| AC-14: `"Could not extract video ID from URL."`                                                  | PASS   | Lines 60, 68, 73 in `youtube-ingestor.ts`                                                                                                                                         |
| AC-14: `"Failed to fetch video page: HTTP {status}."`                                            | PASS   | Line 84                                                                                                                                                                           |
| AC-14: `"Could not parse video data from page. The video may be unavailable or age-restricted."` | PASS   | Lines 222-225                                                                                                                                                                     |
| AC-14: `"No subtitles are available for this video."`                                            | PASS   | Line 232                                                                                                                                                                          |
| AC-14: `"Failed to fetch transcript: HTTP {status}."`                                            | PASS   | Lines 253-255                                                                                                                                                                     |
| AC-14: `"Failed to save note: {underlying message}"`                                             | PASS   | Line 47                                                                                                                                                                           |

---

## Build Results

### `npx tsc --noEmit`

Exit code: 0 — zero TypeScript errors.

### `npm run build`

Exit code: 0 — build succeeded.

### Build output verification

- `YouTubeIngestor` symbols confirmed in `main.js` (minified): `extractVideoId`, `fetchVideoPage`, `findCaptionTracks`, `ytInitialPlayerResponse` all present.
- Phase text strings confirmed in `main.js`: `"Fetching video info..."`, `"Extracting transcript..."`, `"Saving note..."`, `"Fetching page..."`, `"Extracting content..."` all appear twice (once per UI component).
- Error message strings confirmed: `"Could not extract video ID from URL."`, `"Failed to fetch video page:"`, `"Could not parse video data from page. The video may be unavailable or age-restricted."`, `"No subtitles are available for this video."`, `"Failed to save note: too many files with the same name."`.
- `"Failed to fetch transcript: HTTP"` confirmed via template literal inspection in minified output.

---

## Edge Cases Tested

- **`youtube.com/watch?v=ID` with extra params** (`?v=ID&t=120`): PASS — `searchParams.get("v")` ignores `t` param.
- **`youtu.be/ID` path**: PASS — `pathname.slice(1).split("/")[0]` correctly extracts ID.
- **`youtu.be/` with empty path**: PASS — `if (\!id)` guard on line 68 throws correct error.
- **Non-youtube, non-bilibili URL in `extractVideoId`**: PASS — falls through to line 73 throw.
- **`ytInitialPlayerResponse` present but `captionTracks` is null/undefined**: PASS — `\!Array.isArray(tracks)` is true → throws "No subtitles" error.
- **`captionTracks` is a non-empty array with only ASR tracks**: PASS — `manual.length === 0`, returns `tracks[0]` (first ASR).
- **`captionTracks` with mix of manual and ASR**: PASS — `manual` filter returns non-empty, returns `manual[0]`.
- **Title with internal double-quotes** (e.g. `It's "Great"`): PASS — `.replace(/"/g, '\\"')` escapes them in frontmatter.
- **Slug from all-special-character title** (e.g. `"\!\!\!"`): PASS — slugify produces `"ingested-page"` fallback.
- **Slug exactly 60 chars with trailing hyphen**: PASS — `slug.substring(0, 60).replace(/-$/, "")`.
- **XML parse error fallback**: PASS — `doc.querySelector("parsererror")` check falls back to `text/html` parsing (lines 259-261).
- **`channel` is undefined in frontmatter**: PASS — `if (meta.channel \!== undefined)` omits the field entirely.
- **Web-page ingestion for non-YouTube URLs**: PASS — `url-ingestor.ts` lines 38-70 unchanged.
- **Bilibili URL still throws "not yet supported"**: PASS — `url-ingestor.ts` lines 32-36 unchanged.
- **`getIngestFolder` binding when passed to YouTubeIngestor**: PASS — `this.getIngestFolder` is a stored closure (arrow function from main.ts), not a prototype method; no `bind` needed.

---

## Issues Found

### Issue 1: `fetchTranscript` does not catch network-level errors

- **Severity**: warning
- **Description**: `fetchTranscript` (youtube-ingestor.ts line 251) calls `requestUrl` without a try/catch. If `requestUrl` throws a network-level exception (e.g. DNS failure, connection refused) rather than returning an HTTP response, the raw error propagates to the caller rather than being wrapped as `"Failed to fetch transcript: ..."`. By contrast, `fetchVideoPage` wraps network errors in its catch block.
- **Reproduction**: Simulate a network failure during transcript XML fetch (e.g., intercept `requestUrl` to throw `new Error("net::ERR_NAME_NOT_RESOLVED")`).
- **Suggestion**: Wrap the `requestUrl` call in a try/catch matching the pattern in `fetchVideoPage`:
  ```typescript
  try {
    const response = await requestUrl({ url: captionUrl, method: 'GET' });
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Failed to fetch transcript: HTTP ${response.status}.`);
    }
    // ... rest of method
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Failed to fetch transcript:')) throw err;
    throw new Error(`Failed to fetch transcript: ${(err as Error).message}.`);
  }
  ```

### Issue 2: No automated tests

- **Severity**: info
- **Description**: The project has no test runner configured. All logic (video ID extraction, brace-counting JSON parser, timestamp formatting, track selection, frontmatter building) was verified by static analysis only. A fast, headless unit test suite would provide ongoing regression protection, especially for the `extractJsonBlob` brace-counting logic which is non-trivial.
- **Suggestion**: Add `vitest` (works without a browser runtime) with unit tests for `extractVideoId`, `formatTranscript`, `selectCaptionTrack`, `buildFrontmatter`, and `slugify`. Mock `requestUrl` and `Vault` for integration-style tests.

---

## Verdict

PASS — all 52 acceptance criteria are met. The build compiles with zero TypeScript errors. One warning-level issue was found (Issue 1: unguarded network errors in `fetchTranscript`), which is not covered by any acceptance criterion. No acceptance criteria failures. No breaking changes to Phase 1 (RAG core) or Phase 2 (URL ingestor web path).
