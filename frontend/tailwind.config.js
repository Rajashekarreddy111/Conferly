/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        jet: {
          950: '#060709',
          900: '#0C0D12',
          850: '#101118',
          800: '#151620',
          750: '#1C1D2B',
          700: '#232536',
          600: '#2F3249',
          500: '#424666',
        },
        cerulean: {
          50: '#F0F9FF',
          100: '#E0F2FE',
          200: '#BAE6FD',
          300: '#7DD3FC',
          400: '#38BDF8',
          500: '#007BA7',
          600: '#0284C7',
          700: '#0369A1',
          800: '#075985',
          900: '#0C4A6E',
        },
        neonrose: {
          50: '#FFF1F5',
          100: '#FFE4ED',
          200: '#FECDD6',
          300: '#FDA4AF',
          400: '#FB7185',
          500: '#F43F5E',
          600: '#FF007F',
          neon: '#FF1493',
          800: '#BE123C',
          900: '#881337',
        }
      },
      boxShadow: {
        'glow-cerulean': '0 0 20px -3px rgba(2, 132, 199, 0.45)',
        'glow-rose': '0 0 20px -3px rgba(255, 20, 147, 0.45)',
        'card-dark': '0 4px 20px -2px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
      }
    },
  },
  plugins: [],
}
