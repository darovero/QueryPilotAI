import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";
import containerQueries from "@tailwindcss/container-queries";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "primary": "#00e1ab",
        "on-background": "#dfe2eb",
        "surface-variant": "#31353c",
        "primary-container": "#00150d",
        "on-surface-variant": "#c6c6cb",
        "secondary-container": "#454c58",
        "on-tertiary-fixed": "#001e2c",
        "secondary-fixed": "#dce3f2",
        "tertiary": "#7bd0ff",
        "surface-container-low": "#181c22",
        "on-secondary-fixed": "#151c27",
        "on-secondary-container": "#b5bccb",
        "on-primary-fixed-variant": "#00513c",
        "inverse-surface": "#dfe2eb",
        "background": "#10141a",
        "on-primary-fixed": "#002116",
        "secondary-fixed-dim": "#c0c7d6",
        "inverse-primary": "#006c50",
        "surface-container-highest": "#31353c",
        "on-secondary": "#2a313c",
        "on-tertiary-container": "#0086b5",
        "secondary": "#c0c7d6",
        "surface-container-high": "#262a31",
        "on-error-container": "#ffdad6",
        "tertiary-fixed-dim": "#7bd0ff",
        "surface-container": "#1c2026",
        "primary-fixed": "#36ffc4",
        "outline": "#8f9095",
        "on-surface": "#dfe2eb",
        "primary-fixed-dim": "#00e1ab",
        "on-secondary-fixed-variant": "#404753",
        "tertiary-fixed": "#c4e7ff",
        "outline-variant": "#45474b",
        "surface-tint": "#00e1ab",
        "error": "#ffb4ab",
        "tertiary-container": "#00131d",
        "surface-dim": "#10141a",
        "error-container": "#93000a",
        "on-primary-container": "#008e6a",
        "on-primary": "#003828",
        "surface": "#10141a",
        "on-tertiary": "#00354a",
        "on-error": "#690005",
        "on-tertiary-fixed-variant": "#004c69",
        "surface-bright": "#353940",
        "surface-container-lowest": "#0a0e14",
        "inverse-on-surface": "#2d3137"
      },
      fontFamily: {
        sans: ["var(--font-ui)", "system-ui", "Segoe UI", "Roboto", "Arial", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "Segoe UI", "Roboto", "Arial", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "Liberation Mono", "Courier New", "monospace"]
      },
    },
  },
  plugins: [forms, containerQueries],
};
export default config;
