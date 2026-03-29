import './globals.css';
import Script from 'next/script';
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
        <Script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id="de551af1-a680-45b9-8299-d3d21a1ae198"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
