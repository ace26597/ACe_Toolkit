'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';

interface SessionPlayerProps {
  src: string;
  onClose: () => void;
}

export default function SessionPlayer({ src, onClose }: SessionPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [speed, setSpeed] = useState(1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Initialize asciinema-player
  useEffect(() => {
    if (!containerRef.current) return;

    let disposed = false;

    // Dynamic import since asciinema-player accesses window/document
    import('asciinema-player').then((AsciinemaPlayer) => {
      if (disposed || !containerRef.current) return;

      playerRef.current = AsciinemaPlayer.create(src, containerRef.current, {
        fit: 'width',
        autoPlay: true,
        speed,
        theme: 'asciinema',
        terminalFontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
        terminalFontSize: '14px',
      });
    });

    return () => {
      disposed = true;
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
    // Only re-create player when src changes, not speed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  // Clear all child nodes from a container element safely
  const clearContainer = (el: HTMLElement) => {
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
  };

  // Handle speed changes without recreating player
  // The asciinema-player doesn't have a setSpeed method,
  // so we need to recreate on speed change
  const handleSpeedChange = useCallback((newSpeed: number) => {
    setSpeed(newSpeed);
    if (!containerRef.current || !playerRef.current) return;

    // Get current time before dispose
    playerRef.current.getCurrentTime().then((currentTime: number) => {
      playerRef.current.dispose();
      playerRef.current = null;

      // Clear the container using safe DOM methods
      if (containerRef.current) {
        clearContainer(containerRef.current);
      }

      import('asciinema-player').then((AsciinemaPlayer) => {
        if (!containerRef.current) return;
        playerRef.current = AsciinemaPlayer.create(src, containerRef.current, {
          fit: 'width',
          autoPlay: true,
          speed: newSpeed,
          startAt: currentTime,
          theme: 'asciinema',
          terminalFontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
          terminalFontSize: '14px',
        });
      });
    });
  }, [src]);

  // Handle fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!wrapperRef.current) return;

    if (!document.fullscreenElement) {
      wrapperRef.current.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  }, []);

  // Listen for fullscreen changes (e.g. user presses Esc)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.fullscreenElement) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const speeds = [0.5, 1, 2, 4];

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div
        ref={wrapperRef}
        className={`bg-[#1a1b26] rounded-xl border border-slate-700 shadow-2xl flex flex-col ${
          isFullscreen ? 'w-full h-full rounded-none border-none' : 'w-full max-w-5xl max-h-[90vh]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#33467c] flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-[#a9b1d6]">Session Recording</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Speed selector */}
            <div className="flex items-center gap-1 bg-[#24283b] rounded px-2 py-1">
              {speeds.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSpeedChange(s)}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                    speed === s
                      ? 'bg-[#7aa2f7] text-[#1a1b26]'
                      : 'text-[#565f89] hover:text-[#a9b1d6]'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            {/* Fullscreen toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 text-[#565f89] hover:text-[#a9b1d6] transition-colors"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-1.5 text-[#565f89] hover:text-[#f7768e] transition-colors"
              title="Close player"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Player container */}
        <div className="flex-1 overflow-auto p-2 min-h-0">
          <div ref={containerRef} className="w-full" />
        </div>
      </div>
    </div>
  );
}
