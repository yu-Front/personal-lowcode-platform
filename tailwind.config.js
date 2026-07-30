/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a'
        },
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a'
        },
        accent: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b'
        },
        foreground: '#0f172a',
        'muted-foreground': '#64748b',
        border: '#e2e8f0',
        muted: '#f8fafc'
      },
      boxShadow: {
        panel: '0 12px 40px -24px rgba(15, 23, 42, 0.35)',
        float: '0 20px 50px -24px rgba(37, 99, 235, 0.35)'
      },
      animation: {
        'fade-in': 'fadeIn .35s ease-out',
        'slide-up': 'slideUp .4s ease-out',
        'pulse-soft': 'pulseSoft 2.4s ease-in-out infinite'
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pulseSoft: { '0%, 100%': { opacity: '.55' }, '50%': { opacity: '1' } }
      }
    }
  },
  plugins: []
}
