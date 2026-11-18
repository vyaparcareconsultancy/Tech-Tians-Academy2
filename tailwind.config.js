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
      // (white in dark mode, ink in light mode). "onbrand" is the text colour
      // used on top of the brand colour; "snow" is always pure white.
      colors: {
        white: 'rgb(var(--c-fg) / <alpha-value>)',
        black: 'rgb(var(--c-ink) / <alpha-value>)',
        onbrand: 'rgb(var(--c-onbrand) / <alpha-value>)',
        snow: '#FFFFFF',
        void: 'rgb(var(--c-void) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        brand: 'rgb(var(--c-brand) / <alpha-value>)',
        'brand-deep': 'rgb(var(--c-brand-deep) / <alpha-value>)',
        gold: 'rgb(var(--c-gold) / <alpha-value>)',
      },
      fontFamily: {
        heading: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Helvetica Neue', 'Arial', 'sans-serif'],
        body: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        // labels / UI captions (the Stratum label face)
        mono: ['Chakra Petch', 'Inter', 'ui-sans-serif', 'sans-serif'],
      },
      boxShadow: {
        // quiet depth instead of coloured glows
        glow: '0 10px 30px -14px rgb(0 0 0 / 0.55)',
        'glow-lg': '0 16px 40px -16px rgb(0 0 0 / 0.6)',
        'glow-gold': '0 0 0 1px rgb(var(--c-gold) / 0.25)',
        'card-soft': '0 20px 50px -24px rgb(0 0 0 / 0.5)',
      },
      // sharp, architectural corners
      borderRadius: {
        lg: '3px',
        xl: '4px',
        '2xl': '6px',
        '3xl': '8px',
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
