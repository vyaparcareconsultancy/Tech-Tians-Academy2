import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    // Allow sandbox preview hosts (lock this down for production deployments)
    allowedHosts: command === 'serve',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          recharts: ['recharts'],
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    globals: true,
    exclude: [
      'e2e/**',
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.claude/**',
    ],
    // Force demo mode for all tests regardless of any local .env.local.
    env: {
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_ANON_KEY: '',
    },
  },
}))
