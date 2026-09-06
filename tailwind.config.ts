import type { Config } from "tailwindcss";

// Colors are driven by the locked design tokens declared as CSS variables in
// globals.css. Referencing the variables here keeps a single source of truth.
const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "var(--bg)",
        surface: "var(--surface)",
        line: "var(--border)",
        ink: "var(--text)",
        muted: "var(--text-muted)",
        primary: {
          DEFAULT: "var(--primary)",
          hover: "var(--primary-hover)",
          soft: "var(--primary-soft)",
        },
        accent: "var(--accent)",
        danger: "var(--danger)",
        warning: "var(--warning)",
        success: "var(--success)",
      },
      fontFamily: {
        sans: ['"Segoe UI"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
