"use client";

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

// CCResearch now redirects to Workspace with Terminal tab
// All terminal functionality has been merged into Workspace

function RedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Build redirect URL with any project param
    const project = searchParams.get('project');
    let redirectUrl = '/workspace?tab=terminal';
    if (project) {
      redirectUrl += `&project=${encodeURIComponent(project)}`;
    }
    router.replace(redirectUrl);
  }, [router, searchParams]);

  return null;
}

export default function CCResearchRedirect() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <RefreshCw className="w-8 h-8 mx-auto mb-4 text-emerald-400 animate-spin" />
        <p className="text-gray-400">Redirecting to Workspace...</p>
      </div>
      <Suspense fallback={null}>
        <RedirectContent />
      </Suspense>
    </div>
  );
}
