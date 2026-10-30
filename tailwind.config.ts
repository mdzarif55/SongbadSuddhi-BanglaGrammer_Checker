import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#f0f4f8",
          100: "#d9e2ec",
          200: "#bcccdc",
          300: "#9fb3c8",
          400: "#829ab1",
          500: "#627d98",
          600: "#486581",
          700: "#334e68",
          800: "#243b53",
          900: "#0f172a",
          950: "#090d16",
        },
        editorial: {
          teal: "#0D9488",
          darkTeal: "#0F766E",
          emerald: "#059669",
          ink: "#0A192F",
          paper: "#FAFAF9",
          card: "#FFFFFF",
          border: "#E2E8F0",
        },
      },
      fontFamily: {
        bengali: [
          "'Hind Siliguri'",
          "'Noto Sans Bengali'",
          "'SolaimanLipi'",
          "'Kalpurush'",
          "system-ui",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;

