import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import 'highlight.js/styles/github-dark.css';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "OpenMFA",
    template: "%s • OpenMFA",
  },
  description: "Modern MFA platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`min-h-screen antialiased bg-gradient-to-br from-slate-950 to-slate-900 text-slate-100 ${geistSans.variable} ${geistMono.variable}`}>
        <div className="relative min-h-screen">
          <header className="sticky top-0 z-30 bg-black/30 backdrop-blur border-b border-white/10">
            <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
              <a href="/" className="font-semibold tracking-tight text-white">OpenMFA</a>
              <nav className="hidden sm:flex items-center gap-6 text-sm text-slate-300">
                <a className="hover:text-white" href="/dashboard">Dashboard</a>
                <a className="hover:text-white" href="/dashboard/apps">Apps</a>
                <a className="hover:text-white" href="/dashboard/settings">Settings</a>
              </nav>
            </div>
          </header>
          <main>{children}</main>
          <footer className="border-t border-white/10 mt-16">
            <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-slate-400">© {new Date().getFullYear()} OpenMFA</div>
          </footer>
        </div>
      </body>
    </html>
  );
}
