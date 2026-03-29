/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#EEF6F8', 100: '#D1E8ED', 200: '#A3D1DB',
          300: '#75BAC9', 400: '#47A3B7', 500: '#1A8CA5',
          600: '#157084', 700: '#105463', 800: '#0A3842', 900: '#051C21',
        },
      },
      fontFamily: {
        display: ['"DM Sans"', 'system-ui', 'sans-serif'],
        body:    ['"Source Sans 3"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
