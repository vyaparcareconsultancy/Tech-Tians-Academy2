/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#F2F6FC',
          100: '#E1EAF6',
          200: '#C3D5ED',
          300: '#9AB8E0',
          400: '#6B93CE',
          500: '#4672B8',
          600: '#345A99',
          700: '#28467B',
          800: '#1B325F',
          900: '#12233F',
          950: '#0A1526',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(16, 24, 40, 0.05)',
        pop: '0 8px 24px -4px rgba(16, 24, 40, 0.12), 0 2px 6px -2px rgba(16, 24, 40, 0.06)',
      },
    },
  },
  plugins: [],
}
