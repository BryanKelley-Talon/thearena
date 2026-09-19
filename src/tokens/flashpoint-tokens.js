// FLASHPOINT HISTORY — DESIGN TOKENS (JS mirror of flashpoint-tokens.css)
// Source of truth: flashpoint-accent-palette.html. Verified >=4.5:1 vs #16120E.
export const INK = "#16120E", PARCHMENT = "#EDE3D2", MUTED = "#A08B6C";
export const ERA_ACCENT = {
  "11.1": "#D4AF37", "11.2": "#6B9BD1", "11.3": "#5AA57B", "11.4": "#D17A4A",
  "11.5": "#C17700", "11.6": "#B0A05A", "11.7": "#A8A69C", "11.8": "#D65643",
  "11.9": "#5B92D1", "11.10": "#8BAE68", "11.11": "#6BA5B8",
};
export const accentFor = (std) => ERA_ACCENT[std] ?? "#C17700";
