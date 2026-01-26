'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Download,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react';

interface VideoPopupProps {
  src: string;
  filename: string;
  onClose: () => void;
  onDownload: () => void;
}

export default function VideoPopup({
  src,
  filename,
  onClose,
  onDownload,
}: VideoPopupProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [position, setPosition] = useState<'bottom-right' | 'bottom-left' | 'center'>('bottom-right');
  const videoRef = useRef<HTMLVideoElement>(null);

  // Position styles
  const positionStyles = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
  };

  const sizeStyles = isMinimized
    ? 'w-64'
    : position === 'center'
    ? 'w-full max-w-xl'
    : 'w-80';

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const restartVideo = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const cyclePosition = () => {
    const positions: Array<'bottom-right' | 'bottom-left' | 'center'> = [
      'bottom-right',
      'bottom-left',
      'center',
    ];
    const currentIndex = positions.indexOf(position);
    const nextIndex = (currentIndex + 1) % positions.length;
    setPosition(positions[nextIndex]);
  };

  return (
    <div
      className={`fixed z-50 ${positionStyles[position]} transition-all duration-200`}
    >
      <div
        className={`bg-gray-900 rounded-xl shadow-2xl overflow-hidden border border-gray-700 ${sizeStyles} transition-all duration-200`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-gray-800/80 border-b border-gray-700">
          <span className="text-sm font-medium truncate max-w-[200px]" title={filename}>
            {filename}
          </span>
          <div className="flex items-center gap-1">
            {/* Position Toggle */}
            <button
              onClick={cyclePosition}
              className="p-1.5 text-gray-400 hover:text-white rounded transition-colors"
              title="Change position"
            >
              {position === 'center' ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>

            {/* Minimize Toggle */}
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 text-gray-400 hover:text-white rounded transition-colors"
              title={isMinimized ? 'Expand' : 'Minimize'}
            >
              {isMinimized ? (
                <Maximize2 className="w-4 h-4" />
              ) : (
                <Minimize2 className="w-4 h-4" />
              )}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-red-400 rounded transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video */}
        <div className="relative">
          <video
            ref={videoRef}
            src={src}
            className="w-full"
            autoPlay
            loop
            muted={isMuted}
            playsInline
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          >
            Your browser does not support the video tag.
          </video>

          {/* Overlay Controls */}
          {!isMinimized && (
            <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
              <div className="flex items-center gap-2">
                <button
                  onClick={restartVideo}
                  className="p-2 bg-black/50 rounded-full hover:bg-black/70"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
                <button
                  onClick={togglePlay}
                  className="p-3 bg-purple-600/80 rounded-full hover:bg-purple-600"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6" />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Controls */}
        {!isMinimized && (
          <div className="flex items-center justify-between px-3 py-2 bg-gray-800/80 border-t border-gray-700">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-1.5 text-gray-400 hover:text-white rounded"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
            </div>
            <button
              onClick={onDownload}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded text-sm flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>
        )}

        {/* Minimized Controls */}
        {isMinimized && (
          <div className="flex items-center justify-center gap-2 px-2 py-1.5 bg-gray-800/80">
            <button
              onClick={togglePlay}
              className="p-1 text-gray-400 hover:text-white"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1 text-gray-400 hover:text-white"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={onDownload}
              className="p-1 text-gray-400 hover:text-green-400"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
