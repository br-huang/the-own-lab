# Plan: Bilibili Ingestor

1. Add requirement/design docs for the `yt-dlp`-based Bilibili flow.
2. Extend plugin settings with:
   - `ytDlpCommand`
   - `bilibiliCookiesPath`
3. Implement `BilibiliIngestor`:
   - `yt-dlp` execution
   - auth-aware retry with cookies
   - subtitle selection
   - subtitle parsing
   - Markdown output
4. Route Bilibili URLs from `UrlIngestor`.
5. Update UI phase text in Chat view and Ingest URL modal.
6. Run `npm run build`.
7. Write review/test notes documenting the current verification level.
