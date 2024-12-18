// tailwind.config.js

/** @type {import('tailwindcss').Config} */
export default {
  purge: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: true, // or 'media' or 'class'
  theme: {
    extend: {},
    colors: {
      /* Theme colors */
      orange: '#FF4438',
      peach: '#F8CBAD',
      ivory: '#FAF6E8',
      'light-blue': '#D5DAEC',
      blue: '#1D3BA0',
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