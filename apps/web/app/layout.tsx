import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import { AuthProvider } from "@/components/auth";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "C3 Researcher - Claude Code with 145+ Skills",
    template: "%s | C3 Researcher"
  },
  description: "AI-powered research workspace with Claude Code, 145+ skills, 34 MCP servers, and 14 plugins. Data analysis, document generation, video creation, and more.",
  keywords: ["Claude Code", "AI research", "MCP servers", "data analysis", "Claude skills", "AI assistant"],
  authors: [{ name: "ACe" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://orpheuscore.uk",
    siteName: "C3 Researcher",
    title: "C3 Researcher - Claude Code with 145+ Skills",
    description: "AI-powered research workspace with Claude Code, 145+ skills, 34 MCP servers, and 14 plugins.",
  },
  twitter: {
    card: "summary_large_image",
    title: "C3 Researcher - Claude Code with 145+ Skills",
    description: "AI-powered research workspace with Claude Code, 145+ skills, 34 MCP servers, and 14 plugins.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

