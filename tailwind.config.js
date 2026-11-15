/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Colours come from CSS variables in src/index.css so the whole app can
      // switch between dark and light mode. "white" is the main text colour
      // (white in dark mode, dark navy in light mode); "onbrand" stays white.
      colors: {
        white: 'rgb(var(--c-fg) / <alpha-value>)',
        black: 'rgb(var(--c-ink) / <alpha-value>)',
        onbrand: '#FFFFFF',
        void: 'rgb(var(--c-void) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        brand: 'rgb(var(--c-brand) / <alpha-value>)',
        'brand-deep': 'rgb(var(--c-brand-deep) / <alpha-value>)',
        gold: 'rgb(var(--c-gold) / <alpha-value>)',
      },
      fontFamily: {
        heading: ['Space Grotesk', 'sans-serif'],
        body: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 20px -5px rgb(var(--c-brand-deep) / 0.5)',
        'glow-lg': '0 0 30px -5px rgb(var(--c-brand) / 0.6)',
        'glow-gold': '0 0 20px rgb(var(--c-gold) / 0.3)',
        'card-soft': '0 0 50px -10px rgb(var(--c-brand) / 0.1)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
      },
      animation: {
        float: 'float 8s ease-in-out infinite',
        'spin-slow': 'spin 10s linear infinite',
        'spin-reverse': 'spin 15s linear infinite reverse',
      },
    },
  },
  plugins: [],
}
