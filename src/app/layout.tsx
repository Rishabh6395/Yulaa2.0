import './globals.css';
import { ThemeProvider } from '@/components/providers/theme-provider';

export const metadata = {
  title: 'Yulaa - Student Management System',
  description: 'Multi-tenant SaaS school management platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-body antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
