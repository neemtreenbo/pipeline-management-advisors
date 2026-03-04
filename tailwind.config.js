/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      colors: {
        background: "#FFFFFF",
        foreground: "#111111",
        muted: {
          DEFAULT: "#F8F8F8",
          foreground: "#6B6B6B",
        },
        border: "#E5E5E5",
        input: "#E5E5E5",
        primary: {
          DEFAULT: "#111111",
          foreground: "#FFFFFF",
        },
        accent: {
          DEFAULT: "#0A84FF",
          foreground: "#FFFFFF",
        },
        success: "#30D158",
        warning: "#FF9F0A",
        destructive: {
          DEFAULT: "#FF453A",
          foreground: "#FFFFFF",
        },
        ring: "#0A84FF",
        // shadcn token aliases
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#111111",
        },
        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#111111",
        },
        secondary: {
          DEFAULT: "#F8F8F8",
          foreground: "#111111",
        },
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
    },
  },
  plugins: [],
}
