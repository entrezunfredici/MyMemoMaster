// tailwind.config.js

/** @type {import('tailwindcss').Config} */
export default {
  purge: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: true, // or 'media' or 'class'
  theme: {
    extend: {},
    colors: {
      /* Theme colors */
      primary: '#1E3BA1',
      'light-primary': '#D5DAED',
      secondary: '#FA4238',
      'light-secondary': '#FDC7C4',
      light: '#FDF7FF',
      gray: '#d5daed',
      dark: '#101f56',
      /* Other colors */
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#dc2626',
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