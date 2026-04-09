# Design: Bilibili Ingestor

## Existing Architecture

- `UrlIngestor` already owns URL routing and delegates YouTube URLs to `YouTubeIngestor`.
- `detectVideoProvider()` already distinguishes `"youtube"` and `"bilibili"`.
- Both Chat view and Ingest URL modal already choose phase text based on video provider.
- Existing ingestors each own their own file naming, folder creation, and frontmatter assembly.

## Proposed Approach

Add a standalone `BilibiliIngestor` class in `src/ingestor/bilibili-ingestor.ts` and route
`detectVideoProvider(url) === "bilibili"` to it from `UrlIngestor`.

The ingestor will:

1. Execute `yt-dlp --dump-single-json --no-warnings --no-playlist <url>` using a configurable
   command/path.
2. Parse title, uploader, `subtitles`, and `automatic_captions` from the returned JSON.
3. Retry once with `--cookies <path>` only when the first failure indicates auth/login/cookies are
   required and the user configured a cookies path.
4. Select the best subtitle entry by language/priority.
5. Fetch the subtitle URL with `requestUrl`.
6. Parse JSON / VTT / SRT subtitle formats into timestamped transcript lines.
7. Save the result as Markdown with `source_type: "bilibili"`.

## Key Decisions

- `yt-dlp` is invoked through Node's `child_process.execFile`, not a shell command string. This
  avoids quoting problems for paths and URLs.
- Settings will include both `ytDlpCommand` and `bilibiliCookiesPath`.
- Cookies are strictly fallback-only. Anonymous mode is always attempted first to minimize friction
  and avoid unnecessary credential use.
- Subtitle parsing supports multiple formats because `yt-dlp` may expose Bilibili tracks in JSON,
  VTT, or SRT depending on the video and extractor behavior.
- UI integration remains inside the existing URL ingest surfaces instead of adding a new command.

## Risks

- `yt-dlp` must be installed separately and available to Obsidian's runtime PATH, or the user must
  set an absolute path in settings.
- `yt-dlp` JSON field shape is not fully controlled by this plugin, so parsing should tolerate
  missing optional fields.
- Auth-detection relies on stderr/stdout text matching; the fallback logic should stay conservative.

