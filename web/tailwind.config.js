/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#FFF4EE',
          100: '#FFE6D5',
          200: '#FFCAAA',
          300: '#FFA574',
          400: '#FF7A45',
          500: '#FF5C1A',
          600: '#E8420A',
          700: '#C4320B',
        },
      },
      boxShadow: {
        card:  '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)',
        brand: '0 4px 14px rgba(255,92,26,0.30)',
      },
    },
  },
  plugins: [],
};
