// tailwind.config.js

/** @type {import('tailwindcss').Config} */
export default {
  purge: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: true,
  safelist: ['text-white'], // or 'media' or 'class'
  theme: {
    extend: {},
    colors: {
      /* Theme colors */
      primary: 'var(--primary)',
      'light-primary': 'var(--light-primary)',
      secondary: 'var(--secondary)',
      'light-secondary': 'var(--light-secondary)',
      light: 'var(--light)',
      gray: 'var(--gray)',
      dark: 'var(--dark)',
      greyCustom: '#F5F5F5',
      /* Other colors */
      success: 'var(--success)',
      warning: 'var(--warning)',
      danger: 'var(--danger)',
    },
    screens: {
      'xsm': '460px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
  },
  plugins: [],
}