import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sun Urban City Calculator",
  description: "Sales Price Calculator for Sun Urban City",
};

import Link from 'next/link';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className + " bg-slate-50 text-slate-900"}>
        <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="font-bold text-xl tracking-tighter text-blue-900">SUN URBAN CITY</Link>
            <nav className="flex gap-6 text-sm font-medium">
              <Link href="/" className="hover:text-blue-600 transition-colors">Calculator</Link>
              <Link href="/inventory" className="hover:text-blue-600 transition-colors">Quỹ Căn</Link>
              <Link href="/admin" className="hover:text-blue-600 transition-colors">Admin</Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
