import './globals.css';

export const metadata = {
  title: 'Yulaa - Student Management System',
  description: 'Multi-tenant SaaS school management platform',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-body antialiased">{children}</body>
    </html>
  );
}
