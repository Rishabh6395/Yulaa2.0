import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: 'Yulaa — School Management Made Simple',
  description: 'Yulaa is a complete school management platform covering attendance, leave, fees, admissions, and timetables for modern educational institutions.',
  keywords: ['school management', 'student management system', 'attendance software', 'school ERP', 'Yulaa'],
  openGraph: {
    title: 'Yulaa — School Management Made Simple',
    description: 'A complete school management platform for modern educational institutions.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-body antialiased bg-white text-gray-900">
        {children}
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
