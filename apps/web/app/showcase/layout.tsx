import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Showcase",
  description: "Real projects built with C3 Researcher - AI videos, data analysis, research dossiers, and more. See what's possible with Claude Code and 145+ skills.",
  openGraph: {
    title: "Showcase | C3 Researcher",
    description: "Real projects built with Claude Code - videos, research, data analysis, and more.",
  },
};

export default function ShowcaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
