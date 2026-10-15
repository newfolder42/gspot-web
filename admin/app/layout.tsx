import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/sidebar';

export const metadata: Metadata = {
  title: "G'Spot ადმინი",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ka">
      <body>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 min-w-0 p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
