// tailwind.config.js

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: true, // or 'media' or 'class'
  theme: {
    extend: {},
    colors: {
      // Theme
      primary: '#1E3BA1',
      'light-primary': '#828FBC',
      secondary: '#FA4238',
      'light-secondary': '#FDC7C4',
      light: '#FDF7FF',
      gray: '#d5daed',
      dark: '#101f56',
      // Other colors
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#dc2626',
      // Password
      'password-step-1': '#dc2626',
      'password-step-2': '#dc7e26',
      'password-step-3': '#dcd926',
      'password-step-4': '#78dc26',
      'password-step-5': '#29af00',
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