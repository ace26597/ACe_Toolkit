import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tips & Best Practices",
  description: "Claude Code tips, keyboard shortcuts, slash commands, CLAUDE.md best practices, hooks, git worktrees, and prompting strategies for effective AI-assisted development.",
  openGraph: {
    title: "Tips | C3 Researcher",
    description: "Claude Code tips, shortcuts, and best practices for effective AI development.",
  },
};

export default function TipsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
