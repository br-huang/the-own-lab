/**
 * Detects whether a URL points to a video platform that requires
 * specialized handling (not yet implemented).
 */
export function detectVideoProvider(url: string): "youtube" | "bilibili" | null {
  let hostname: string;
  try {
    hostname = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }

  const youtubeHosts = ["youtube.com", "youtu.be"];
  if (youtubeHosts.includes(hostname)) {
    return "youtube";
  }

  const bilibiliHosts = ["bilibili.com", "b23.tv"];
  if (bilibiliHosts.includes(hostname)) {
    return "bilibili";
  }

  return null;
}
