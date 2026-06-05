import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tonyx — Autonomous yield on TON',
  description:
    'Tonyx is an autonomous yield agent for the TON ecosystem. It scans STON.fi pools, reasons with Mira AI, and rebalances your idle USDT within limits you set.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
