/** @type {import('tailwindcss').Config} */

// ── Design tokens ────────────────────────────────────────────────────────────
// Central palette for the Smart Timetable platform.
//   Warm Ivory  #FAF3E1  – application canvas / page background
//   Soft Sand   #F5E7C6  – secondary surfaces, subtle highlights, hovers
//   Vibrant Orange #FA8112 – primary actions, active states, key indicators
//   Charcoal    #222222  – primary text, dark surfaces, strong structure
// Supporting neutrals & status colors are deliberately restrained and warm.

const brand = {
  DEFAULT: '#FA8112',
  50: '#FFF0DF',
  100: '#FFE3C4',
  200: '#FFD0A1',
  300: '#FDB670',
  400: '#FC9A3E',
  500: '#FA8112', // vibrant orange – primary fill
  600: '#E9720A', // hover fill
  700: '#A55404', // accessible orange ink / focus ring on light surfaces
  800: '#8A4704',
  900: '#713B06',
}

const success = {
  DEFAULT: '#1F7A4C',
  50: '#E9F4EE',
  100: '#D7EBE0',
  200: '#C3E2D1',
  500: '#1F7A4C',
  600: '#1A6240',
  700: '#17603D',
}

const warning = {
  DEFAULT: '#9A6410',
  50: '#FBF1DE',
  100: '#F7E5C6',
  200: '#EDDCB6',
  500: '#9A6410',
  600: '#85560D',
  700: '#7A4E0B',
}

const danger = {
  DEFAULT: '#C0392B',
  50: '#FBEAE7',
  100: '#F8DCD8',
  200: '#F0C9C3',
  500: '#C0392B',
  600: '#A83226',
  700: '#9B2C21',
}

module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './context/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ivory: {
          DEFAULT: '#FAF3E1',
          50: '#FDFBF4',
          100: '#FAF3E1',
          200: '#F7EDD5',
        },
        sand: {
          DEFAULT: '#F5E7C6',
          50: '#FBF6EA',
          100: '#F9F0DC',
          200: '#F5E7C6',
          300: '#EDE0B7',
        },
        charcoal: {
          DEFAULT: '#222222',
          500: '#4A4A47',
          600: '#3A3A37',
          700: '#2C2C2A',
          800: '#222222',
          900: '#181817',
        },
        muted: '#6B665E',
        line: {
          DEFAULT: '#E7DDC8',
          100: '#F0E8D8',
          200: '#E7DDC8',
          300: '#D9CCB0',
        },
        tint: '#FFF0DF',
        brand,
        success,
        warning,
        danger,
      },
      fontFamily: {
        sans: ['var(--font-jakarta)', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'Liberation Mono', 'monospace'],
      },
      fontSize: {
        // name: [size, { lineHeight, letterSpacing }]
        xs: ['12px', { lineHeight: '18px' }],
        sm: ['14px', { lineHeight: '20px' }],
        base: ['15px', { lineHeight: '23px' }],
        lg: ['17px', { lineHeight: '26px' }],
        xl: ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['30px', { lineHeight: '38px' }],
        '4xl': ['36px', { lineHeight: '42px' }],
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '8px',
        md: '8px',
        lg: '10px',
        xl: '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
      boxShadow: {
        xs: '0 1px 2px rgba(34, 34, 34, 0.05)',
        sm: '0 1px 2px rgba(34, 34, 34, 0.06)',
        DEFAULT: '0 1px 3px rgba(34, 34, 34, 0.06), 0 1px 2px rgba(34, 34, 34, 0.04)',
        md: '0 2px 6px rgba(34, 34, 34, 0.07), 0 1px 2px rgba(34, 34, 34, 0.04)',
        lg: '0 4px 14px rgba(34, 34, 34, 0.08), 0 2px 4px rgba(34, 34, 34, 0.04)',
        xl: '0 8px 24px rgba(34, 34, 34, 0.10), 0 2px 6px rgba(34, 34, 34, 0.05)',
        '2xl': '0 16px 44px rgba(34, 34, 34, 0.14), 0 4px 10px rgba(34, 34, 34, 0.06)',
        inner: 'inset 0 1px 2px rgba(34, 34, 34, 0.06)',
        none: 'none',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.18s ease-out',
        'fade-in-up': 'fade-in-up 0.22s ease-out',
      },
    },
  },
  plugins: [],
}
