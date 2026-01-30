import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog",
  description: "Track all updates, improvements, and fixes to C3 Researcher. See what's new with each release.",
  openGraph: {
    title: "Changelog | C3 Researcher",
    description: "Track all updates and improvements to C3 Researcher.",
  },
};

export default function ChangelogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
