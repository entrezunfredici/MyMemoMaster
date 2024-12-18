// tailwind.config.js

/** @type {import('tailwindcss').Config} */
export default {
  purge: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: true, // or 'media' or 'class'
  theme: {
    extend: {},
    colors: {
      primary: '#a6fa76',
      light: '#ffffff',
      dark: '#000000',
      'success-light': '#34d399',
      success: '#10b981',
      'success-dark': '#047857',
      'warning-light': '#fbbf24',
      warning: '#f59e0b',
      'warning-dark': '#d97706',
      'danger-light': '#ef4444',
      danger: '#dc2626',
      'danger-dark': '#991b1b',
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