'use client';

import { useTheme, type Theme } from './theme-provider';

const OPTIONS: { value: Theme; label: string; icon: JSX.Element }[] = [
  {
    value: 'light',
    label: 'Light',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.6} stroke="currentColor" className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m0 13.5V21m9-9h-2.25m-13.5 0H3m15.364-6.364l-1.591 1.591M7.227 16.773l-1.591 1.591m12.728 0l-1.591-1.591M7.227 7.227L5.636 5.636M16.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
      </svg>
    ),
  },
  {
    value: 'system',
    label: 'System',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.6} stroke="currentColor" className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
      </svg>
    ),
  },
  {
    value: 'dark',
    label: 'Dark',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.6} stroke="currentColor" className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
      </svg>
    ),
  },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="inline-flex rounded-xl border border-hairline bg-card/40 p-0.5 backdrop-blur"
    >
      {OPTIONS.map((opt) => {
        const active = theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={opt.label}
            title={opt.label}
            onClick={() => setTheme(opt.value)}
            className={`flex items-center justify-center rounded-lg px-2 py-1.5 transition-all duration-200 motion-press ${
              active
                ? 'bg-card text-primary shadow-soft'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {opt.icon}
          </button>
        );
      })}
    </div>
  );
}
