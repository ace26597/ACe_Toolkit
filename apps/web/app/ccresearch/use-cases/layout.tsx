import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Use Cases & Examples",
  description: "Example prompts for Claude Code - data analysis, document generation, video creation, AI/ML training, web automation, finance, scientific research, and multi-agent workflows.",
  openGraph: {
    title: "Use Cases | C3 Researcher",
    description: "Example prompts for data analysis, video creation, AI/ML, and more.",
  },
};

export default function UseCasesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
