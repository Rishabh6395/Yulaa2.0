import type { Metadata } from 'next';
import Script from 'next/script';
import { Cormorant_Garamond, Space_Grotesk } from 'next/font/google';
import './globals.css';

const cormorant = Cormorant_Garamond({
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-cormorant',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-space',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Yulix Labs — Engineering the Future of Learning',
  description: 'Yulix Labs is an education technology laboratory. Makers of Yulaa school management platform and more.',
  keywords: ['education technology', 'school management', 'EdTech', 'Yulix Labs', 'Yulaa'],
  openGraph: {
    title: 'Yulix Labs — Engineering the Future of Learning',
    description: 'Yulix Labs is an education technology laboratory. Makers of Yulaa and more.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${spaceGrotesk.variable}`}>
      <body className="antialiased bg-[#050505] text-[#f0ece4]" style={{ fontFamily: 'var(--font-space), system-ui, sans-serif' }}>
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
