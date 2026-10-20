import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1E3A8A',
          light: '#3B5BC4',
          dark: '#152a63',
          50: '#eef2fb',
        },
        secondary: {
          DEFAULT: '#F59E0B',
          light: '#FBBF4B',
          dark: '#B97709',
        },
        success: '#16A34A',
        error: '#DC2626',
        bgneutral: '#F9FAFB',
        textneutral: '#1F2937',
      },
      fontFamily: {
        heading: ['var(--font-poppins)', 'var(--font-noto-ethiopic)', 'sans-serif'],
        body: ['var(--font-inter)', 'var(--font-noto-ethiopic)', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
        lift: '0 10px 30px -10px rgba(30,58,138,0.35)',
      },
      keyframes: {
        fadeUp: { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        floaty: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
      },
      animation: { fadeUp: 'fadeUp .5s ease-out both', floaty: 'floaty 6s ease-in-out infinite' },
    },
  },
  plugins: [],
};

export default config;
