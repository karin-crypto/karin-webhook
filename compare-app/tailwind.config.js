/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Heebo', 'system-ui', 'Segoe UI', 'Arial', 'sans-serif'] },
      colors: {
        navy: { DEFAULT: '#0B2545', 700: '#13315C', 800: '#0B2545', 900: '#071A33' },
        blue: { DEFAULT: '#1F6FEB', 600: '#1F6FEB', 700: '#175CC7' },
        sky: { DEFAULT: '#5BB0F0', 300: '#8CC8F5', 400: '#5BB0F0' },
        ice: '#EAF4FD',
        ink: '#0F1E33',
        muted: '#5A6B85',
        line: '#E3EAF3',
        page: '#F5F8FC',
        pos: { DEFAULT: '#1E9E6A', bg: '#E6F6EF' },
        neg: { DEFAULT: '#D9534F', bg: '#FBEAEA' },
      },
      boxShadow: {
        card: '0 1px 2px rgba(11,37,69,.05), 0 6px 20px rgba(11,37,69,.06)',
        pop: '0 12px 40px rgba(11,37,69,.14)',
      },
      borderRadius: { xl2: '1.25rem' },
    },
  },
  plugins: [],
};
