import type { Config } from "tailwindcss";

const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

// 기존 gray/blue/red/green/yellow 유틸리티를 디자인 토큰에 연결해 라이트/다크 팔레트가 함께 적용되도록 한다.
const gray = {
  50: token("text-primary"),
  100: token("text-primary"),
  200: token("text-primary"),
  300: token("text-secondary"),
  400: token("text-muted"),
  500: token("text-muted"),
  600: token("control-border"),
  700: token("surface-2"),
  800: token("surface"),
  900: token("bg"),
};

const config: Config = {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: { sm: "640px", md: "900px", lg: "1280px", xl: "1536px", "2xl": "1536px" },
    extend: {
      colors: {
        background: token("bg"),
        foreground: token("text-primary"),
        muted: { DEFAULT: token("surface-2"), foreground: token("text-muted") },
        accent: { DEFAULT: token("surface-2"), foreground: token("text-primary") },
        ring: token("primary"),
        input: token("control-border"),
        popover: { DEFAULT: token("surface"), foreground: token("text-primary") },
        app: token("bg"),
        surface: { DEFAULT: token("surface"), 2: token("surface-2") },
        line: { DEFAULT: token("border"), control: token("control-border") },
        content: {
          DEFAULT: token("text-primary"),
          secondary: token("text-secondary"),
          muted: token("text-muted"),
        },
        primary: {
          DEFAULT: token("primary"),
          hover: token("primary-hover"),
          foreground: token("on-primary"),
        },
        info: token("info"),
        success: token("success"),
        warning: token("warning"),
        danger: token("danger"),
        gray,
        blue: {
          100: token("info"),
          300: token("info"),
          400: token("info"),
          500: token("primary"),
          600: token("primary"),
          700: token("primary-hover"),
        },
        red: { 300: token("danger"), 400: token("danger") },
        green: { 300: token("success"), 400: token("success") },
        yellow: { 300: token("warning"), 400: token("warning") },
      },
      textColor: { white: token("text-primary") },
      borderColor: {
        DEFAULT: token("border"),
        gray: { 700: token("border"), 800: token("border"), 600: token("control-border") },
      },
      borderRadius: { sm: "6px", md: "10px", lg: "12px", xl: "16px" },
      boxShadow: {
        card: "var(--shadow-card)",
        modal: "var(--shadow-modal)",
      },
      fontFamily: {
        sans: [
          '"A2Z"',
          "ui-sans-serif",
          "system-ui",
          '"Apple SD Gothic Neo"',
          '"Malgun Gothic"',
          "sans-serif",
        ],
      },
      maxWidth: { content: "1440px" },
      transitionDuration: { fast: "120ms", base: "180ms", slow: "240ms" },
    },
  },
  plugins: [],
};
export default config;
