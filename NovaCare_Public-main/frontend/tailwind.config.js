/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Flat aliases used directly in components (bg-surface, text-cyan, etc.)
        // Kept in sync with the dark palette in src/styles/clinical.css — this
        // is the single source of truth for the theme's colors, so components
        // using these utilities directly (not just the nc-* classes) stay
        // consistent with the rest of the portal instead of rendering light.
        surface:   '#101c27',
        'surface-2': '#0c141d',
        cyan:      '#67c6e8',
        'cyan-bright': '#8bdbf5',
        blue:      '#2563eb',
        ink:       '#e8f1f7',
        'ink-2':   '#c7dbe3',
        'ink-3':   '#8098a8',
        line:      '#22303c',
        'line-2':  '#2c3e4d',
        // 'nova' is referenced (bg-nova/text-nova/accent-nova) across several
        // ASHA/doctor screens but was never defined here, so Tailwind's JIT
        // silently generated no CSS for any of them — those elements (e.g. a
        // toggle switch's "on" state) rendered with no color at all. Aliased
        // to the same accent blue as 'cyan' rather than touching every call site.
        nova:      '#4db5dd',
        hud: {
          bg:      '#070b12',
          bg2:     '#0a0f16',
          surface: '#101c27',
          surface2:'#0c141d',
          panel:   '#101c27',
          border:  '#4db5dd',
          cyan:    '#67c6e8',
          cyanB:   '#8bdbf5',
          blue:    '#2563eb',
          blueB:   '#60a5fa',
          text:    '#e8f1f7',
          muted:   '#8098a8',
          dim:     '#22303c',
          line:    '#22303c',
          line2:   '#2c3e4d',
          ink:     '#e8f1f7',
          ink2:    '#c7dbe3',
          ink3:    '#8098a8',
        },
        tier: {
          green: '#54c59a',
          gbg:   '#0f2a20',
          amber: '#f2c780',
          abg:   '#2a2010',
          red:   '#ff8f86',
          rbg:   '#2a1416',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Courier New"', 'monospace'],
      },
      boxShadow: {
        hud:       '0 0 20px rgba(34,211,238,0.12), inset 0 0 20px rgba(34,211,238,0.03)',
        'hud-lg':  '0 0 40px rgba(34,211,238,0.2)',
        glow:      '0 0 10px rgba(34,211,238,0.8)',
        'glow-b':  '0 0 10px rgba(37,99,235,0.8)',
        'glow-g':  '0 0 10px rgba(16,240,160,0.8)',
        'glow-r':  '0 0 10px rgba(244,63,94,0.8)',
        brutal:    '4px 4px 0 0 #2563EB',
        'brutal-c':'4px 4px 0 0 #2563EB',
        'brutal-g':'4px 4px 0 0 #15803D',
        'brutal-r':'4px 4px 0 0 #B91C1C',
      },
      animation: {
        scan:     'scan 4s linear infinite',
        'pulse-c':'pulse-cyan 2s ease-in-out infinite',
        blink:    'blink 1.4s infinite',
        flicker:  'flicker 5s linear infinite',
      },
      keyframes: {
        scan: {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        'pulse-cyan': {
          '0%,100%': { boxShadow: '0 0 4px rgba(34,211,238,0.3)' },
          '50%':     { boxShadow: '0 0 18px rgba(34,211,238,0.9)' },
        },
        blink: {
          '0%,100%': { opacity: 1 },
          '50%':     { opacity: 0 },
        },
        flicker: {
          '0%,89%,91%,93%,100%': { opacity: 1 },
          '90%': { opacity: 0.85 },
          '92%': { opacity: 0.92 },
        },
      },
    },
  },
  plugins: [],
}
