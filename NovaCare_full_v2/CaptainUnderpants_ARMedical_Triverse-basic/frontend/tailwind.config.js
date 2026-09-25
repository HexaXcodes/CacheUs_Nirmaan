/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#55B0DD',
          50:  '#EAF6FC',
          100: '#D5EDFA',
          200: '#ABDBF4',
          300: '#80C9EE',
          400: '#55B0DD',
          500: '#3F9BC9',
          600: '#2F7B9F',
          700: '#1F5A75',
          800: '#0F3A4B',
          900: '#061C24'
        },
        accent: {
          DEFAULT: '#91C0FA',
          50:  '#F0F6FF',
          100: '#E0EDFF',
          200: '#C2DCFF',
          300: '#A6CCFE',
          400: '#91C0FA',
          500: '#6BA3F0'
        },
        ink:  '#0A0F14',
        bone: '#F4F1EA',
        urgent: '#FF4D4D'
      },
      fontFamily: {
        // Distinctive display + body pairing (loaded via Google Fonts in index.html)
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        body: ['"Inter"', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        brutal:    '6px 6px 0 0 rgba(10,15,20,1)',
        'brutal-sm': '3px 3px 0 0 rgba(10,15,20,1)',
        'brutal-lg': '10px 10px 0 0 rgba(10,15,20,1)',
        glass:    '0 8px 32px 0 rgba(85,176,221,0.18)'
      },
      backdropBlur: {
        xs: '2px'
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'slide-up': 'slideUp 0.4s ease-out'
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':       { transform: 'translateY(-8px)' }
        },
        slideUp: {
          '0%': { opacity: 0, transform: 'translateY(12px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' }
        }
      }
    }
  },
  plugins: []
};
