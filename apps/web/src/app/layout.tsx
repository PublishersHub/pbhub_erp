import type { Metadata } from 'next';
import { AuthProvider } from '@/context/auth-context';
import { ThemeProvider, themeInitScript } from '@/components/theme-provider';
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
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
