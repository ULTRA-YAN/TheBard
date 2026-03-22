import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        display: ["Instrument Serif", "Georgia", "serif"],
        sans: ["DM Sans", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Menlo", "monospace"],
      },
      colors: {
        stone: {
          50: "#fafaf9",
          100: "#f5f5f4",
          200: "#e7e5e4",
          300: "#d6d3d1",
          400: "#a8a29e",
          500: "#78716c",
          600: "#57534e",
          700: "#44403c",
          800: "#292524",
          900: "#1c1917",
          950: "#0c0a09",
        },
        category: {
          grammar: {
            DEFAULT: "#dc2626",
            light: "#fecaca",
            dark: "#f87171",
          },
          syntax: {
            DEFAULT: "#ea580c",
            light: "#fed7aa",
            dark: "#fb923c",
          },
          mechanics: {
            DEFAULT: "#ca8a04",
            light: "#fef08a",
            dark: "#facc15",
          },
          punctuation: {
            DEFAULT: "#2563eb",
            light: "#bfdbfe",
            dark: "#60a5fa",
          },
          style: {
            DEFAULT: "#9333ea",
            light: "#e9d5ff",
            dark: "#a78bfa",
          },
        },
      },
    },
  },
  plugins: [],
};
export default config;
