export default {
  content: ['./index.html', './src*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary:  '#e50914',
        secondary:'#ff4444',
        base:     '#000001',
        surface:  '#0a0a0f',
        card:     '#0f0f18',
        hover:    '#161620',
        live:     '#e50914',
        online:   '#4ade80',
        warning:  '#facc15'
      },
      backgroundImage: {
        'accent-grad': 'linear-gradient(135deg, #e50914, #ff4444)'
      },
      fontFamily: {
        sans:    ['Space Grotesk','Inter','system-ui','sans-serif'],
        display: ['Space Grotesk','Inter','system-ui','sans-serif'],
        mono:    ['JetBrains Mono','Fira Code','monospace']
      }
    }
  },
  plugins: []
};
