import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Interview Booking",
  description: "Practice and prepare for your interviews with AI-powered mock interviews",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground`}
      >
        <div className="flex flex-col min-h-screen">
          <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
            <div className="container mx-auto px-4 py-4 flex items-center justify-between">
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                AI Interview Booking
              </h1>
              <nav className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  Prepare. Practice. Succeed.
                </span>
              </nav>
            </div>
          </header>
          <main className="flex-1">
            {children}
          </main>
          <footer className="border-t border-border bg-card/30 py-6">
            <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
              © 2026 AI Interview Booking. All rights reserved.
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
