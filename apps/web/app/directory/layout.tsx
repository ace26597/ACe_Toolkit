import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Directory",
  description: "Complete list of MCP servers, plugins, and skills available in C3 Researcher. 34 MCP servers, 14 plugins, 145+ scientific skills with installation commands.",
  openGraph: {
    title: "Directory | C3 Researcher",
    description: "MCP servers, plugins, and skills directory with installation commands.",
  },
};

export default function DirectoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
