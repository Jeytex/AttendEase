/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        grayscale: {
          50: '#FFFFFF',
          100: '#F7F7F7',
          200: '#EEEEEE',
          300: '#D9D9D9',
          400: '#BDBDBD',
          500: '#888888',
          600: '#555555',
          700: '#333333',
          800: '#1A1A1A',
          900: '#000000',
        },
      },
      boxShadow: {
        'dark-glass': '0 12px 40px -10px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.12)',
        'light-glass': '0 8px 24px -6px rgba(0, 0, 0, 0.05), 0 0 0 1px #EEEEEE',
        'subtle': '0 2px 8px rgba(0, 0, 0, 0.04)',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '20px',
        '3xl': '28px',
      },
      animation: {
        'scan-line': 'scan 2s ease-in-out infinite',
        'pulse-subtle': 'pulseSubtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        scan: {
          '0%, 100%': { top: '6%' },
          '50%': { top: '90%' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.5 },
        },
      }
    },
  },
  plugins: [],
}
