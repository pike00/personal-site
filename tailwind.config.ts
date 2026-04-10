import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

export default {
  content: ["./src/**/*.{astro,html,js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#1a1a2e",
        "primary-light": "#16213e",
        accent: {
          DEFAULT: "#a78bfa",
          dark: "#7c3aed",
        },
        surface: {
          light: "#fafafa",
          card: "#ffffff",
          dark: "#0f172a",
          "card-dark": "#1e293b",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [typography],
} satisfies Config;
