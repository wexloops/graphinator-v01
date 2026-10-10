import { existsSync, readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { apiMiddleware } from './server/api';

/** Mounts the Claude API routes on both `vite` (dev) and `vite preview` (start). */
function api(): Plugin {
  return {
    name: 'graphinator-api',
    configureServer: (s) => void s.middlewares.use(apiMiddleware()),
    configurePreviewServer: (s) => void s.middlewares.use(apiMiddleware()),
  };
}

/**
 * Load .env for the server half only; nothing here reaches the client.
 * Read directly (not via Vite's loadEnv) so the app's own .env wins over the shell:
 * a stale exported key cannot shadow the one saved in the app.
 */
function loadServerEnv() {
  if (!existsSync('.env')) return;
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*(ANTHROPIC_[A-Z_]+|GRAPHINATOR_[A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m && m[2]) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

export default defineConfig(() => {
  loadServerEnv();
  // Polling: file events do not cross from Windows drives into WSL.
  return { plugins: [react(), api()], server: { watch: { usePolling: true, interval: 300 } } };
});
