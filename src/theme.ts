import { Theme } from "./types.js";

export const defaultTheme: Theme = {
  tones: {
    neutral: { fg: "255", bg: "237" },
    info: { fg: "255", bg: "25" },
    success: { fg: "16", bg: "78" },
    warning: { fg: "16", bg: "220" },
    danger: { fg: "255", bg: "160" },
    muted: { fg: "255", bg: "240" }
  },
  separator: "\uE0B0",
  separatorAscii: ">"
};
