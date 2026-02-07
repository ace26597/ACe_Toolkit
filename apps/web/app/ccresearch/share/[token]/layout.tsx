import type { Metadata } from 'next';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { token } = await params;

  try {
    const res = await fetch(`${API_BASE}/ccresearch/share/${token}`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return {
        title: 'Shared Session | C3 Researcher',
        description: 'View a shared C3 Researcher session.',
      };
    }

    const session = await res.json();
    const title = session.title || 'Shared Session';
    const date = new Date(session.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    return {
      title: `${title} | C3 Researcher`,
      description: `Shared research session: ${title}. Created ${date} with ${session.files_count || 0} files. View the terminal replay, transcript, and workspace files.`,
      openGraph: {
        type: 'article',
        title: `${title} - C3 Researcher Session`,
        description: `View this shared research session with terminal replay, transcript, and ${session.files_count || 0} workspace files.`,
        siteName: 'C3 Researcher',
        url: `https://orpheuscore.uk/ccresearch/share/${token}`,
      },
      twitter: {
        card: 'summary',
        title: `${title} - C3 Researcher Session`,
        description: `View this shared research session with terminal replay and workspace files.`,
      },
    };
  } catch {
    return {
      title: 'Shared Session | C3 Researcher',
      description: 'View a shared C3 Researcher session.',
    };
  }
}

export default function SharedSessionLayout({ children }: LayoutProps) {
  return children;
}
