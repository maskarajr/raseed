import localFont from "next/font/local";

/**
 * v3 webfont system — decision B per handoff-v3/fonts/FONT-MAPPING.md (Figmi).
 * Source Serif 4 carries --font-display (400/600/700 static cuts), IBM Plex
 * Mono carries --font-mono (400/500/600). Both SIL OFL 1.1; licenses ship next
 * to the files in src/fonts/v3/. The variable names below are the SAME tokens
 * raseed.css consumers read, so the hand-written family stacks were removed
 * from :root — next/font bakes Figmi's fallback list in via `fallback`, which
 * keeps the system faces as pre-load/failure fallback only.
 */
export const fontDisplay = localFont({
  src: [
    { path: "../fonts/v3/display/SourceSerif4-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/v3/display/SourceSerif4-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "../fonts/v3/display/SourceSerif4-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-display",
  // next emits these verbatim into the variable value after the hashed
  // family, so multi-word names carry their own quotes.
  fallback: ["Charter", "'Iowan Old Style'", "Georgia", "'Times New Roman'", "serif"],
  display: "swap",
});

export const fontMono = localFont({
  src: [
    { path: "../fonts/v3/mono/IBMPlexMono-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/v3/mono/IBMPlexMono-Medium.woff2", weight: "500", style: "normal" },
    { path: "../fonts/v3/mono/IBMPlexMono-SemiBold.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-mono",
  fallback: ["ui-monospace", "'JetBrains Mono'", "'SF Mono'", "Menlo", "monospace"],
  display: "swap",
});
