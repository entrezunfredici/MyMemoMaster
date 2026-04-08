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
      primary: 'rgb(var(--primary-rgb) / <alpha-value>)',
      'primary-hover': 'rgb(var(--primary-hover-rgb) / <alpha-value>)',
      'light-primary': 'rgb(var(--light-primary-rgb) / <alpha-value>)',
      secondary: 'rgb(var(--secondary-rgb) / <alpha-value>)',
      'secondary-hover': 'rgb(var(--secondary-hover-rgb) / <alpha-value>)',
      'light-secondary': 'rgb(var(--light-secondary-rgb) / <alpha-value>)',
      light: 'rgb(var(--light-rgb) / <alpha-value>)',
      gray: 'rgb(var(--gray-rgb) / <alpha-value>)',
      dark: 'rgb(var(--dark-rgb) / <alpha-value>)',
      white: 'rgb(var(--white-rgb) / <alpha-value>)',
      /* Other colors */
      success: 'rgb(var(--success-rgb) / <alpha-value>)',
      warning: 'rgb(var(--warning-rgb) / <alpha-value>)',
      danger: 'rgb(var(--danger-rgb) / <alpha-value>)',
      'danger-hover': 'rgb(var(--danger-hover-rgb) / <alpha-value>)',
      info: 'rgb(var(--info-rgb) / <alpha-value>)',
      'info-hover': 'rgb(var(--info-hover-rgb) / <alpha-value>)',
      accent: 'rgb(var(--accent-rgb) / <alpha-value>)',
      'accent-hover': 'rgb(var(--accent-hover-rgb) / <alpha-value>)',
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
