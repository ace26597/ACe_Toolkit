'use client';

import React from 'react';
import { FileText, Code, AlignLeft } from 'lucide-react';

interface FormatSelectorProps {
  value: string;
  onChange: (format: string) => void;
  disabled?: boolean;
}

const formats = [
  {
    id: 'markdown',
    label: 'Markdown',
    icon: FileText,
    description: 'Rich formatting with headers, lists, code blocks',
  },
  {
    id: 'plain',
    label: 'Plain',
    icon: AlignLeft,
    description: 'Simple text without formatting',
  },
  {
    id: 'json',
    label: 'JSON',
    icon: Code,
    description: 'Structured data format',
  },
];

export default function FormatSelector({ value, onChange, disabled }: FormatSelectorProps) {
  return (
    <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
      {formats.map((format) => {
        const Icon = format.icon;
        const isActive = value === format.id;

        return (
          <button
            key={format.id}
            onClick={() => onChange(format.id)}
            disabled={disabled}
            title={format.description}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              isActive
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{format.label}</span>
          </button>
        );
      })}
    </div>
  );
}
