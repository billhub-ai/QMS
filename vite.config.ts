import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    base: './', 
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
    define: {
      // Polyfill process.env to prevent crashes in libraries that expect Node environment
      'process.env': JSON.stringify(env),
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      // Some older libs expect 'global' to exist
      global: 'window', 
    },
    server: {
      host: '0.0.0.0',
      proxy: {
        '/voice': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false
        },
        '/ws': {
          target: 'ws://localhost:3001',
          ws: true,
          changeOrigin: true
        }
      }
    }
  };
});