'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Play, Trash2, Loader2, X, Film, RefreshCw, Download, FileText } from 'lucide-react';
import { recordingsApi, type RecordingInfo } from '@/lib/api';

// Dynamic import for SessionPlayer (accesses window/document via asciinema-player)
const SessionPlayer = dynamic(
  () => import('@/components/workspace/SessionPlayer'),
  { ssr: false }
);

interface RecordingsListProps {
  sessionId: string;
  onClose: () => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export default function RecordingsList({ sessionId, onClose, showToast }: RecordingsListProps) {
  const [recordings, setRecordings] = useState<RecordingInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [downloadingCast, setDownloadingCast] = useState(false);
  const [downloadingTranscript, setDownloadingTranscript] = useState(false);

  const loadRecordings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await recordingsApi.listRecordings(sessionId);
      setRecordings(Array.isArray(data) ? data : data ? [data] : []);
    } catch {
      // If list endpoint returns single recording info, try has-recording
      try {
        const info = await recordingsApi.hasRecording(sessionId);
        if (info.has_recording) {
          setRecordings([info]);
        } else {
          setRecordings([]);
        }
      } catch {
        setRecordings([]);
      }
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadRecordings();
  }, [loadRecordings]);

  const handleDelete = async () => {
    setDeleting(sessionId);
    try {
      await recordingsApi.deleteRecording(sessionId);
      setRecordings([]);
      showToast('Recording deleted', 'success');
    } catch {
      showToast('Failed to delete recording', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const handlePlay = () => {
    const url = recordingsApi.getRecordingUrl(sessionId);
    setPlayingUrl(url);
  };

  const handleDownloadCast = async () => {
    setDownloadingCast(true);
    try {
      await recordingsApi.downloadRecording(sessionId);
      showToast('Recording downloaded', 'success');
    } catch {
      showToast('Failed to download recording', 'error');
    } finally {
      setDownloadingCast(false);
    }
  };

  const handleDownloadTranscript = async () => {
    setDownloadingTranscript(true);
    try {
      await recordingsApi.downloadTranscript(sessionId);
      showToast('Transcript downloaded', 'success');
    } catch {
      showToast('Failed to download transcript', 'error');
    } finally {
      setDownloadingTranscript(false);
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return 'Unknown';
    return new Date(dateStr).toLocaleString();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-[#1a1b26] rounded-xl w-full max-w-md border border-[#33467c] shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[#33467c]">
            <h3 className="text-lg font-semibold text-[#a9b1d6] flex items-center gap-2">
              <Film size={20} className="text-[#7aa2f7]" />
              Session Recordings
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={loadRecordings}
                className="p-1.5 text-[#565f89] hover:text-[#a9b1d6] transition-colors"
                title="Refresh"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-[#565f89] hover:text-[#f7768e] transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="text-[#7aa2f7] animate-spin" />
              </div>
            ) : recordings.length === 0 ? (
              <div className="text-center py-8">
                <Film size={32} className="mx-auto mb-2 text-[#414868]" />
                <p className="text-[#565f89] text-sm">No recordings available</p>
                <p className="text-[#414868] text-xs mt-1">
                  Recordings are created automatically during terminal sessions
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {recordings.map((rec, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-[#24283b] rounded-lg border border-[#33467c]/50 group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[#a9b1d6] text-sm font-medium">
                        Recording {index + 1}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[#565f89] text-xs">
                          {formatSize(rec.size_bytes)}
                        </span>
                        {rec.duration && (
                          <span className="text-[#565f89] text-xs">
                            {Math.floor(rec.duration / 60)}m {Math.floor(rec.duration % 60)}s
                          </span>
                        )}
                        {rec.created_at && (
                          <span className="text-[#414868] text-xs">
                            {formatDate(rec.created_at)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={handlePlay}
                        className="p-2 text-[#7aa2f7] hover:bg-[#7aa2f7]/10 rounded transition-colors"
                        title="Play recording"
                      >
                        <Play size={16} />
                      </button>
                      <button
                        onClick={handleDownloadCast}
                        disabled={downloadingCast}
                        className="p-2 text-[#9ece6a] hover:bg-[#9ece6a]/10 rounded transition-colors disabled:opacity-50"
                        title="Download .cast file"
                      >
                        {downloadingCast ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Download size={16} />
                        )}
                      </button>
                      <button
                        onClick={handleDownloadTranscript}
                        disabled={downloadingTranscript}
                        className="p-2 text-[#e0af68] hover:bg-[#e0af68]/10 rounded transition-colors disabled:opacity-50"
                        title="Download transcript (.md)"
                      >
                        {downloadingTranscript ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <FileText size={16} />
                        )}
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={deleting === sessionId}
                        className="p-2 text-[#565f89] hover:text-[#f7768e] hover:bg-[#f7768e]/10 rounded transition-colors disabled:opacity-50"
                        title="Delete recording"
                      >
                        {deleting === sessionId ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Player overlay */}
      {playingUrl && (
        <SessionPlayer
          src={playingUrl}
          onClose={() => setPlayingUrl(null)}
        />
      )}
    </>
  );
}
