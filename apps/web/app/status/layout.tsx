import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Status",
  description: "Check the current status of C3 Researcher services including API, database, and WebSocket connectivity.",
  openGraph: {
    title: "Status | C3 Researcher",
    description: "Real-time service health monitoring for C3 Researcher.",
  },
};

export default function StatusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
