/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand palette
        brand: {
          50:  '#EEF6F8',
          100: '#D1E8ED',
          200: '#A3D1DB',
          300: '#75BAC9',
          400: '#47A3B7',
          500: '#1A8CA5',
          600: '#157084',
          700: '#105463',
          800: '#0A3842',
          900: '#051C21',
          950: '#020E11',
        },
        surface: {
          0:   '#FFFFFF',
          50:  '#F8FAFB',
          100: '#F1F4F6',
          200: '#E4E9ED',
          300: '#CDD5DC',
          400: '#9AA8B5',
          500: '#6B7D8D',
        },
        success: '#0D9F6E',
        warning: '#E3A008',
        danger:  '#E02424',
        info:    '#3F83F8',
        // ShadCN CSS variable tokens
        border:     'hsl(var(--border))',
        input:      'hsl(var(--input))',
        ring:       'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      fontFamily: {
        display: ['"DM Sans"',       'system-ui', 'sans-serif'],
        body:    ['"Source Sans 3"', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'card':       '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
        'card-dark':  '0 1px 3px rgba(0,0,0,0.3),  0 1px 2px rgba(0,0,0,0.2)',
        'modal':      '0 20px 60px rgba(0,0,0,0.15)',
        'glow-brand': '0 0 20px rgba(26,140,165,0.25)',
      },
      borderRadius: {
        'xl':  '12px',
        '2xl': '16px',
        lg:    'var(--radius)',
        md:    'calc(var(--radius) - 2px)',
        sm:    'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'border-beam': {
          '100%': { 'offset-distance': '100%' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateX(-12px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.6' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
      },
      animation: {
        'border-beam': 'border-beam calc(var(--duration)*1s) infinite linear',
        'fade-in':     'fadeIn 0.3s ease-out forwards',
        'slide-in':    'slideIn 0.25s ease-out forwards',
        'pulse-soft':  'pulse-soft 2s ease-in-out infinite',
        'shimmer':     'shimmer 2.5s linear infinite',
      },
    },
  },
  plugins: [],
};
