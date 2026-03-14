/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EEF6F8',
          100: '#D1E8ED',
          200: '#A3D1DB',
          300: '#75BAC9',
          400: '#47A3B7',
          500: '#1A8CA5',
          600: '#157084',
          700: '#105463',
          800: '#0A3842',
          900: '#051C21',
        },
        surface: {
          0: '#FFFFFF',
          50: '#F8FAFB',
          100: '#F1F4F6',
          200: '#E4E9ED',
          300: '#CDD5DC',
          400: '#9AA8B5',
          500: '#6B7D8D',
        },
        success: '#0D9F6E',
        warning: '#E3A008',
        danger: '#E02424',
        info: '#3F83F8',
      },
      fontFamily: {
        display: ['"DM Sans"', 'system-ui', 'sans-serif'],
        body: ['"Source Sans 3"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
        'modal': '0 20px 60px rgba(0,0,0,0.15)',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
      }
    },
  },
  plugins: [],
};
