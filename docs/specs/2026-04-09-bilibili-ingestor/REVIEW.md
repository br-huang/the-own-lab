# Review: Bilibili Ingestor

## Findings

1. Runtime verification is still pending because `yt-dlp` is not installed in this environment.
   The code compiles, but live extractor behavior and exact Bilibili subtitle payload variants still
   need validation in Obsidian.

2. Filename slugging still uses the repo's existing ASCII-only slugifier. For many Chinese Bilibili
   titles, that will collapse to `ingested-page.md` and then numeric suffixes. This matches current
   ingestor behavior, but it is a UX limitation for non-Latin titles.

## Residual Risk

- Authentication fallback depends on matching `yt-dlp` error text. If `yt-dlp` changes its wording,
  some login-required failures may surface as generic parse errors instead of triggering the cookie
  retry.
