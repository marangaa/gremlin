import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Gremlin — AI Focus Companion',
    description: 'A pixel desk companion living in your browser to keep you on task and take notes.',
    permissions: [
      'storage',
      'tabs',
      'idle',
      'alarms',
      'scripting',
      'sidePanel',
    ],
    host_permissions: ['<all_urls>'],
    action: {
      default_title: 'Open Gremlin Companion',
    },
    side_panel: {
      default_path: 'sidepanel.html',
    },
    commands: {
      open_side_panel: {
        suggested_key: {
          default: 'Ctrl+Shift+E',
          mac: 'Command+Shift+E',
        },
        description: 'Toggle Gremlin Side Panel',
      },
    },
  },
});
