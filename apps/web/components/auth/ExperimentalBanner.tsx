'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';

export function ExperimentalBanner() {
  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30">
      <div className="max-w-7xl mx-auto px-4 py-2.5">
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-amber-600 text-sm text-center">
            <strong>Experimental Platform</strong> - Non-commercial personal project for research.
            No warranties, data guarantees, or liability. Not for production use.
          </p>
        </div>
      </div>
    </div>
  );
}
