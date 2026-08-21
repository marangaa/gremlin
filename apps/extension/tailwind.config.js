/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './entrypoints/**/*.{html,ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        neo: {
          bg: '#E5E7EB', // Stark gray background
          surface: '#FFFFFF',
          border: '#000000',
          yellow: '#FFD900',
          blue: '#4361EE',
          pink: '#F72585',
          green: '#2EC4B6',
          orange: '#FF9F1C',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        sans: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        neo: '4px 4px 0px 0px #000000',
        'neo-sm': '2px 2px 0px 0px #000000',
        'neo-lg': '8px 8px 0px 0px #000000',
      },
      borderWidth: {
        '2': '2px',
        '3': '3px',
      },
    },
  },
  plugins: [],
};
