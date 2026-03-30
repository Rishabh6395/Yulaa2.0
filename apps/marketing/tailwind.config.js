/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          400: '#2ba6c0',
          500: '#1A8CA5',
          600: '#157084',
        },
        gold: {
          DEFAULT: '#c9a566',
          light:   '#e4c07a',
          dark:    '#9c7d47',
        },
        cream: '#f0ece4',
      },
      fontFamily: {
        display: ['var(--font-cormorant)', 'Georgia', 'serif'],
        body:    ['var(--font-space)', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        marquee: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        marquee: 'marquee 30s linear infinite',
      },
    },
  },
  plugins: [],
};
