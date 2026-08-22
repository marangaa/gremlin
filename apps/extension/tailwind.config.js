/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './entrypoints/**/*.{html,ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Shared "Phosphor Console" system — mirrors apps/web/tailwind.config.js
        base: {
          DEFAULT: '#0B0D10',
          deep: '#070809',
        },
        surface: {
          DEFAULT: '#10131A',
          raised: '#151923',
        },
        line: {
          DEFAULT: '#1F242E',
          bright: '#2A3140',
        },
        ink: {
          DEFAULT: '#F2F5F9',
          muted: '#9AA3B2',
          faint: '#5D6675',
        },
        accent: {
          DEFAULT: '#A3E635',
          bright: '#BEF264',
          deep: '#84CC16',
        },
        danger: '#FB7185',
        // Deliberate light blocks inside the dark shell ("paper screen")
        paper: {
          DEFAULT: '#F5F6F1',
          card: '#FFFFFF',
          line: '#E4E7DE',
          ink: '#12151A',
          muted: '#5B6472',
          faint: '#9AA1AC',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 16px 40px -24px rgba(0,0,0,0.7)',
        lift: '0 1px 0 0 rgba(255,255,255,0.05) inset, 0 24px 60px -28px rgba(0,0,0,0.8)',
        glow: '0 0 0 1px rgba(163,230,53,0.25), 0 8px 40px -8px rgba(163,230,53,0.25)',
        paper: '0 1px 2px rgba(18,21,26,0.06), 0 8px 24px -12px rgba(18,21,26,0.25)',
      },
    },
  },
  plugins: [],
};
