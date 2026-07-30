import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FinVIDIA Movie Reactor Database',
  description: 'The premier searchable database for YouTube movie reaction channels, timestamps, and audio syncs.',
  other: {
    'Impact-Site-Verification': 'f99c02a8-9657-4d8f-8d84-d86cc1777546',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* Hidden Impact.com Verification Node for Web Crawlers */}
        <span style={{ display: 'none' }} aria-hidden="true">
          Impact-Site-Verification: f99c02a8-9657-4d8f-8d84-d86cc1777546
        </span>
        {children}
      </body>
    </html>
  );
}