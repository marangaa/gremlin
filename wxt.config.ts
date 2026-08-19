import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Gremlin — AI Browser Organism',
    description: 'A tiny AI organism that lives in your browser, watches what you do, and has opinions.',
    permissions: ['storage', 'tabs', 'idle', 'alarms', 'sidePanel'],
  },
});
