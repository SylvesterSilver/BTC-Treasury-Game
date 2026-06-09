/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bitcoin: '#F7931A',
        cyan:    '#00D4FF',
        magenta: '#FF0080',
        neongreen: '#00FF88',
        neonred:   '#FF3355',
        terminal: {
          bg:     '#04000a',
          card:   '#0a0018',
          panel:  '#0d001f',
          border: '#2d0060',
          dim:    '#1a0035',
          muted:  '#0d0018',
        }
      },
      fontFamily: {
        mono:    ['JetBrains Mono', 'Share Tech Mono', 'Consolas', 'monospace'],
        display: ['Share Tech Mono', 'JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
