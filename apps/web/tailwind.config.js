/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: {
          DEFAULT: '#0B0D10',
          deep: '#070809',
        },
        'base-deep': '#070809',
        surface: {
          DEFAULT: '#10131A',
          raised: '#151923',
        },
        'surface-raised': '#151923',
        line: {
          DEFAULT: '#1F242E',
          bright: '#2A3140',
        },
        'line-bright': '#2A3140',
        ink: {
          DEFAULT: '#F2F5F9',
          muted: '#9AA3B2',
          faint: '#5D6675',
        },
        'ink-muted': '#9AA3B2',
        'ink-faint': '#5D6675',
        accent: {
          DEFAULT: '#A3E635',
          bright: '#BEF264',
          deep: '#84CC16',
        },
        'accent-bright': '#BEF264',
        'accent-deep': '#84CC16',
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
        'glow-lg': '0 0 0 1px rgba(163,230,53,0.3), 0 16px 80px -12px rgba(163,230,53,0.35)',
        pill: '0 12px 36px -8px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.08), 0 0 20px -4px rgba(163, 230, 53, 0.15)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'float-soft': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
        'eq-bar': {
          '0%, 100%': { transform: 'scaleY(0.3)' },
          '50%': { transform: 'scaleY(1)' },
        },
        'caret-blink': {
          '0%, 45%': { opacity: '1' },
          '50%, 100%': { opacity: '0' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'gas-drift-1': {
          '0%, 100%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(50px, -30px) scale(1.12)' },
          '66%': { transform: 'translate(-30px, 40px) scale(0.95)' },
        },
        'gas-drift-2': {
          '0%, 100%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(-60px, 40px) scale(1.18)' },
          '66%': { transform: 'translate(30px, -50px) scale(0.92)' },
        },
        'gas-drift-3': {
          '0%, 100%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(40px, 60px) scale(1.15)' },
          '66%': { transform: 'translate(-50px, -30px) scale(0.9)' },
        },
        'gas-pulse': {
          '0%, 100%': { opacity: '0.8', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.15)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) both',
        'float-soft': 'float-soft 5s ease-in-out infinite',
        'pulse-dot': 'pulse-dot 2s ease-in-out infinite',
        'caret-blink': 'caret-blink 1s step-end infinite',
        'fade-in': 'fade-in 0.4s ease both',
        'gas-drift-1': 'gas-drift-1 18s ease-in-out infinite',
        'gas-drift-2': 'gas-drift-2 24s ease-in-out infinite',
        'gas-drift-3': 'gas-drift-3 20s ease-in-out infinite',
        'gas-pulse': 'gas-pulse 16s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
