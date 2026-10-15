/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'] },
      colors: {
        brand: { 50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81' },
        ink: { 700: '#1b2540', 800: '#111a2e', 900: '#0b1324', 950: '#070c18' },
        gold: { 300: '#f3d58a', 400: '#e9bd5c', 500: '#d9a441' },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15,23,42,.04), 0 10px 28px -14px rgba(15,23,42,.14)',
        lift: '0 2px 4px rgba(15,23,42,.05), 0 18px 40px -16px rgba(15,23,42,.22)',
        glow: '0 10px 28px -10px rgba(79,70,229,.6)',
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'fade-up': { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'none' } },
        'pop-in': { '0%': { opacity: 0, transform: 'scale(.97)' }, '100%': { opacity: 1, transform: 'none' } },
      },
      animation: { 'fade-up': 'fade-up .4s ease-out both', 'pop-in': 'pop-in .18s ease-out both' },
    },
  },
  plugins: [],
};
