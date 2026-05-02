import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border) / <alpha-value>)',
        input: 'hsl(var(--input) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
          soft: 'hsl(var(--primary-soft) / <alpha-value>)',
          glow: 'hsl(var(--primary-glow) / <alpha-value>)',
        },
        violet: 'hsl(var(--accent-violet) / <alpha-value>)',
        pink: 'hsl(var(--accent-pink) / <alpha-value>)',
        cyan: 'hsl(var(--accent-cyan) / <alpha-value>)',
        secondary: {
          DEFAULT: 'hsl(var(--secondary) / <alpha-value>)',
          foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
          foreground: 'hsl(var(--muted-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
          foreground: 'hsl(var(--accent-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
          foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)',
          soft: 'hsl(var(--destructive-soft) / <alpha-value>)',
        },
        success: {
          DEFAULT: 'hsl(var(--success) / <alpha-value>)',
          foreground: 'hsl(var(--success-foreground) / <alpha-value>)',
          soft: 'hsl(var(--success-soft) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning) / <alpha-value>)',
          foreground: 'hsl(var(--warning-foreground) / <alpha-value>)',
          soft: 'hsl(var(--warning-soft) / <alpha-value>)',
        },
        info: {
          DEFAULT: 'hsl(var(--info) / <alpha-value>)',
          foreground: 'hsl(var(--info-foreground) / <alpha-value>)',
          soft: 'hsl(var(--info-soft) / <alpha-value>)',
        },
        card: {
          DEFAULT: 'hsl(var(--card) / <alpha-value>)',
          foreground: 'hsl(var(--card-foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover) / <alpha-value>)',
          foreground: 'hsl(var(--popover-foreground) / <alpha-value>)',
        },
      },
      borderRadius: {
        '2xl': 'var(--radius)',
        xl: 'var(--radius-button)',
        lg: 'var(--radius-button)',
        md: 'var(--radius-input)',
        sm: 'calc(var(--radius-input) - 2px)',
      },
      boxShadow: {
        soft: '0 1px 2px 0 hsl(var(--shadow-color) / 0.04), 0 4px 12px -4px hsl(var(--shadow-color) / 0.10)',
        elevated: '0 8px 24px -8px hsl(var(--shadow-color) / 0.18), 0 1px 2px 0 hsl(var(--shadow-color) / 0.06)',
        floating: '0 24px 48px -12px hsl(var(--shadow-color) / 0.25), 0 8px 16px -8px hsl(var(--shadow-color) / 0.10)',
        glow: '0 0 0 1px hsl(var(--ring) / 0.25), 0 0 24px -4px hsl(var(--ring) / 0.5)',
        'glow-primary': '0 8px 24px -8px hsl(var(--primary) / 0.5), 0 0 0 1px hsl(var(--primary) / 0.25)',
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent-violet)) 100%)',
      },
    },
  },
  plugins: [],
};

export default config;
