import { loadConfig } from "./config.js";
import { normalizeInput } from "./input.js";
import { getGitState } from "./providers/git.js";
import { getSessionState } from "./providers/session.js";
import { getTranscriptState } from "./providers/transcript.js";
import { renderPlain } from "./renderers/plain.js";
import { renderPowerline } from "./renderers/powerline.js";
import { defaultTheme } from "./theme.js";
import { Config, ProviderState, Theme } from "./types.js";
import { buildSegments } from "./widgets/index.js";

function parseJson(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch {
    return {};
  }
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
}

function mergeTheme(config: Config): Theme {
  return {
    separator: config.theme.separator ?? defaultTheme.separator,
    separatorAscii: config.theme.separatorAscii ?? defaultTheme.separatorAscii,
    tones: {
      neutral: { ...defaultTheme.tones.neutral, ...config.theme.neutral },
      info: { ...defaultTheme.tones.info, ...config.theme.info },
      success: { ...defaultTheme.tones.success, ...config.theme.success },
      warning: { ...defaultTheme.tones.warning, ...config.theme.warning },
      danger: { ...defaultTheme.tones.danger, ...config.theme.danger },
      muted: { ...defaultTheme.tones.muted, ...config.theme.muted }
    }
  };
}

function render(config: Config, theme: Theme, providers: ProviderState, raw: unknown): string {
  const input = normalizeInput(raw);
  const segments = buildSegments(input, providers, config);

  if (config.renderer === "plain") {
    return renderPlain(segments, theme);
  }

  return renderPowerline(segments, theme, config.nerdFont);
}

export async function run(): Promise<void> {
  const raw = parseJson(await readStdin());
  const input = normalizeInput(raw);
  const config = loadConfig(input.cwd);
  const theme = mergeTheme(config);
  const providers: ProviderState = {
    git: getGitState(input.cwd),
    transcript: getTranscriptState(input.transcriptPath),
    session: getSessionState(input)
  };

  process.stdout.write(`${render(config, theme, providers, raw)}\n`);
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stdout.write(`statusline error: ${message}\n`);
  process.exitCode = 1;
});
