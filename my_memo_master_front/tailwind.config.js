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
      'primary-hover': 'rgb(var(--primary-hover) / <alpha-value>)',
      'light-primary': 'rgb(var(--light-primary) / <alpha-value>)',
      secondary: 'rgb(var(--secondary) / <alpha-value>)',
      'secondary-hover': 'rgb(var(--secondary-hover) / <alpha-value>)',
      'light-secondary': 'rgb(var(--light-secondary) / <alpha-value>)',
      light: 'rgb(var(--light) / <alpha-value>)',
      gray: 'rgb(var(--gray) / <alpha-value>)',
      dark: 'rgb(var(--dark) / <alpha-value>)',
      white: 'rgb(var(--white) / <alpha-value>)',
      /* Other colors */
      success: 'rgb(var(--success) / <alpha-value>)',
      warning: 'rgb(var(--warning) / <alpha-value>)',
      danger: 'rgb(var(--danger) / <alpha-value>)',
      'danger-hover': 'rgb(var(--danger-hover) / <alpha-value>)',
      info: 'rgb(var(--info) / <alpha-value>)',
      'info-hover': 'rgb(var(--info-hover) / <alpha-value>)',
      accent: 'rgb(var(--accent) / <alpha-value>)',
      'accent-hover': 'rgb(var(--accent-hover) / <alpha-value>)',
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
