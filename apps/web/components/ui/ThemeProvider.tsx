'use client';

import { useEffect } from 'react';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Check localStorage and apply theme on mount
    const stored = localStorage.getItem('theme') as 'dark' | 'light' | null;
    const root = document.documentElement;

    if (stored === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
  }, []);

  return <>{children}</>;
}
