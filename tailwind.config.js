/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: '#030304',
        surface: '#0F1115',
        muted: '#94A3B8',
        line: '#1E293B',
        brand: '#F7931A',
        'brand-deep': '#EA580C',
        gold: '#FFD600',
      },
      fontFamily: {
        heading: ['Space Grotesk', 'sans-serif'],
        body: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 20px -5px rgba(234, 88, 12, 0.5)',
        'glow-lg': '0 0 30px -5px rgba(247, 147, 26, 0.6)',
        'glow-gold': '0 0 20px rgba(255, 214, 0, 0.3)',
        'card-soft': '0 0 50px -10px rgba(247, 147, 26, 0.1)',
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
