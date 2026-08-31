import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Noto Sans SC"',
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
      },
      colors: {
        ink: {
          50: "#f4f7f6",
          100: "#e4ece9",
          200: "#c5d5cf",
          700: "#2f4a43",
          800: "#1d322d",
          900: "#12221e",
          950: "#0b1613",
        },
        brand: {
          50: "#eefbf4",
          100: "#d6f5e4",
          200: "#b0eacc",
          300: "#7bd9ae",
          400: "#46c28c",
          500: "#23a671",
          600: "#16865b",
          700: "#136b4b",
          800: "#12553d",
          900: "#104634",
        },
        wa: {
          bubble: "#d9fdd3",
          mine: "#d9fdd3",
          theirs: "#ffffff",
          header: "#075e54",
          chat: "#efeae2",
        },
      },
      boxShadow: {
        card: "0 10px 40px -16px rgba(18, 34, 30, 0.18)",
        float: "0 18px 50px -20px rgba(18, 34, 30, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
