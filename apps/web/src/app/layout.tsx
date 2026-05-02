import type { Metadata } from 'next';
import { AuthProvider } from '@/context/auth-context';
import { ThemeProvider, themeInitScript } from '@/components/theme-provider';
import { ToastProvider } from '@/components/toast';
import { CommandPaletteProvider } from '@/components/command-palette';
import './globals.css';

export const metadata: Metadata = {
  title: 'PbHub HRMS',
  description: 'Human Resource Management System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply theme before paint to avoid white-flash */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="bg-background text-foreground">
        <ThemeProvider>
          <ToastProvider>
            <CommandPaletteProvider>
              <AuthProvider>{children}</AuthProvider>
            </CommandPaletteProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
