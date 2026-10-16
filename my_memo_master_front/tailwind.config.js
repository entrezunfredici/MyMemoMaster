// tailwind.config.js

// Échelle de teintes d'une famille (50 → 900) : chaque valeur est une variable CSS de src/assets/base.css,
// seule source des couleurs (voir DECISIONS 2026-10-16). Ces classes (`bg-gray-100`, `text-red-600`…)
// étaient écrites dans les composants depuis le début mais ignorées : `theme.colors` remplace toute la
// palette par défaut de Tailwind, et aucune échelle n'était redéclarée.
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]
const scale = (family) => Object.fromEntries(SHADES.map((shade) => [shade, `var(--${family}-${shade})`]))

/** @type {import('tailwindcss').Config} */
export default {
  purge: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: true,
  theme: {
    extend: {
      // Couleur de bordure par défaut : celle de Tailwind pour `border` sans couleur est `gray-200` dès que
      // cette teinte existe (1,2:1 sur blanc, sous les 3:1 exigés pour la limite d'un champ — RGAA 3.3).
      // On garde le comportement antérieur : la couleur du texte, comme avant l'activation de la palette.
      borderColor: { DEFAULT: 'currentColor' },
    },
    colors: {
      /* Theme colors */
      primary: 'rgb(var(--primary) / <alpha-value>)',
      'on-primary': 'rgb(var(--white) / <alpha-value>)',
      'primary-dark': 'rgb(var(--primary-dark) / <alpha-value>)',
      'light-primary': 'rgb(var(--light-primary) / <alpha-value>)',
      secondary: 'rgb(var(--secondary) / <alpha-value>)',
      'light-secondary': 'rgb(var(--light-secondary) / <alpha-value>)',
      light: 'rgb(var(--light) / <alpha-value>)',
      gray: { DEFAULT: 'rgb(var(--gray) / <alpha-value>)', ...scale('gray') },
      dark: 'rgb(var(--dark) / <alpha-value>)',
      /* Échelles de teintes (palette de base.css) */
      red: scale('red'),
      blue: scale('blue'),
      green: scale('green'),
      amber: scale('amber'),
      yellow: scale('yellow'),
      purple: scale('purple'),
      orange: scale('orange'),
      /* Valeurs spéciales : sans elles `bg-white`, `text-white`, `bg-transparent` ne généraient aucun style */
      white: 'rgb(var(--white) / <alpha-value>)',
      black: 'rgb(var(--black) / <alpha-value>)',
      transparent: 'transparent',
      current: 'currentColor',
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