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
      primary: 'rgb(var(--primary) / <alpha-value>)',
      'light-primary': 'rgb(var(--light-primary) / <alpha-value>)',
      secondary: 'rgb(var(--secondary) / <alpha-value>)',
      'light-secondary': 'rgb(var(--light-secondary) / <alpha-value>)',
      light: 'rgb(var(--light) / <alpha-value>)',
      gray: 'rgb(var(--gray) / <alpha-value>)',
      dark: 'rgb(var(--dark) / <alpha-value>)',
      /* Other colors */
      success: 'rgb(var(--success) / <alpha-value>)',
      warning: 'rgb(var(--warning) / <alpha-value>)',
      danger: 'rgb(var(--danger) / <alpha-value>)',
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