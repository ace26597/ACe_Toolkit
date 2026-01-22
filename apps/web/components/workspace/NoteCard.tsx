'use client';

import { Pin, Trash2, Tag } from 'lucide-react';
import { WorkspaceNote } from '@/lib/api';

interface NoteCardProps {
  note: WorkspaceNote;
  isSelected: boolean;
  onClick: () => void;
  onPin: () => void;
  onDelete: () => void;
}

export default function NoteCard({
  note,
  isSelected,
  onClick,
  onPin,
  onDelete,
}: NoteCardProps) {
  // Get first line of content for preview
  const getPreview = (content: string) => {
    const lines = content.split('\n').filter(line => line.trim());
    const previewText = lines.slice(0, 3).join('\n');
    return previewText.length > 150 ? previewText.slice(0, 150) + '...' : previewText;
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return 'Today';
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div
      onClick={onClick}
      className={`group relative p-4 rounded-lg border cursor-pointer transition-all ${
        isSelected
          ? 'bg-indigo-600/20 border-indigo-500 shadow-lg shadow-indigo-500/20'
          : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-slate-600'
      }`}
    >
      {/* Pin indicator */}
      {note.pinned && (
        <div className="absolute top-2 right-2">
          <Pin size={14} className="text-amber-400 fill-amber-400" />
        </div>
      )}

      {/* Title */}
      <h3 className={`font-medium mb-2 pr-6 truncate ${
        isSelected ? 'text-white' : 'text-slate-200'
      }`}>
        {note.title || 'Untitled'}
      </h3>

      {/* Preview */}
      <p className="text-sm text-slate-400 line-clamp-3 mb-3 whitespace-pre-wrap">
        {getPreview(note.content) || 'No content'}
      </p>

      {/* Tags */}
      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {note.tags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-700 text-slate-300"
            >
              <Tag size={10} />
              {tag}
            </span>
          ))}
          {note.tags.length > 3 && (
            <span className="text-xs text-slate-500">
              +{note.tags.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{formatDate(note.updatedAt)}</span>

        {/* Actions */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPin();
            }}
            className={`p-1 rounded transition-colors ${
              note.pinned
                ? 'text-amber-400 hover:text-amber-300'
                : 'text-slate-400 hover:text-amber-400'
            }`}
            title={note.pinned ? 'Unpin' : 'Pin'}
          >
            <Pin size={14} className={note.pinned ? 'fill-current' : ''} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 text-slate-400 hover:text-red-400 rounded transition-colors"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
