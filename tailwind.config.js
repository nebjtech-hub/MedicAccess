/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Instrument Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        encre: '#0B2B33',
        ardoise: '#16404A',
        sarcelle: {
          DEFAULT: '#0E7C86',
          600: '#0E7C86',
          500: '#12949C',
          400: '#3FB2B6',
          100: '#DCEFF0',
          50: '#F1F8F8',
        },
        brume: '#EDF2F3',
        or: '#E9B10A',
        alerte: '#B4342F',
        // teintes des panneaux, héritées du logiciel de consultation existant
        panneau: {
          cyan: '#D7EEF4',
          cyanb: '#A8D8E4',
          ambre: '#FAE6CD',
          ambreb: '#EFC79A',
          rose: '#F7D6D6',
          roseb: '#E7ADAD',
          vert: '#D8EEDA',
          vertb: '#A9D6AE',
          jaune: '#FAF3CE',
          jauneb: '#E7DA9A',
        },
      },
      boxShadow: {
        fiche: '0 1px 2px rgba(11,43,51,.06), 0 8px 24px -12px rgba(11,43,51,.18)',
      },
      borderRadius: { xs: '3px' },
    },
  },
  plugins: [],
}
