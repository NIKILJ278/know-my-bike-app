/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Manrope"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
      },
      colors: {
        ink: {
          DEFAULT: '#12141C',
          soft: '#2B2E3A',
        },
        amber: {
          DEFAULT: '#F2A93B',
          dark: '#D98F1F',
          light: '#FDECC8',
        },
        surface: {
          light: '#FFFFFF',
          muted: '#F5F5F7',
          dark: '#161920',
          darkmuted: '#1E222B',
        },
        bg: {
          light: '#FFFFFF',
          dark: '#0B0D12',
        },
        pastel: {
          blue: '#DCEAFB',
          pink: '#FCE1E6',
          green: '#DCFCE7',
          yellow: '#FDECC8',
          orange: '#FBE3D0',
          teal: '#D7F5F0',
        },
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      boxShadow: {
        fab: '0 10px 25px -5px rgba(242,169,59,0.5)',
        card: '0 1px 3px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
}
