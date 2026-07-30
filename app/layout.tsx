import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/navbar';

export const metadata: Metadata = {
  title: 'FinVIDIA Movie Reactor Database',
  description: 'The premier searchable database for YouTube movie reaction channels, timestamps, and audio syncs.',
  other: {
    'Impact-Site-Verification': '99c02a8-9657-4d8f-8d84-d86cc177546',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#09090b] text-white antialiased selection:bg-red-600 selection:text-white min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}