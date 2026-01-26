'use client';

import React, { useState } from 'react';
import {
  Play,
  Clock,
  Edit3,
  Image as ImageIcon,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Layers,
  Loader2,
} from 'lucide-react';

interface ImageSuggestion {
  type: 'unsplash' | 'generate';
  query?: string;
  url?: string;
  prompt?: string;
}

interface Background {
  type: string;
  preset?: string;
  imageUrl?: string;
  overlay?: string;
}

interface PlanScene {
  order: number;
  type: string;
  concept: string;
  text?: string;
  title?: string;
  background?: Background;
  animation?: string;
  duration_seconds: number;
  image_suggestions?: ImageSuggestion[];
  lottie?: { preset: string; position: string };
}

interface Plan {
  plan_id: string;
  idea: string;
  research_findings?: Array<{ source: string; fact: string; citation?: string }>;
  selected_options?: {
    genre?: string;
    style?: string;
    animation_preset?: string;
    hook_type?: string;
  };
  hook?: {
    concept: string;
    type: string;
    text?: string;
  };
  scenes: PlanScene[];
  cta?: {
    message: string;
    style: string;
    background?: Background;
  };
  total_duration_seconds?: number;
  notes?: string;
}

interface VisualPreviewProps {
  plan: Plan;
  onEditScene: (sceneIndex: number) => void;
  onGenerate: () => void;
  generating?: boolean;
}

// Gradient CSS for previews
const gradientStyles: { [key: string]: string } = {
  midnight: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
  neonPink: 'linear-gradient(135deg, #db2777 0%, #7c3aed 100%)',
  deepOcean: 'linear-gradient(135deg, #1e3a5f 0%, #0d9488 100%)',
  purpleNight: 'linear-gradient(135deg, #581c87 0%, #6d28d9 100%)',
  sunset: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)',
  fire: 'linear-gradient(135deg, #dc2626 0%, #f97316 100%)',
  aurora: 'linear-gradient(135deg, #3b82f6 0%, #9333ea 100%)',
  cyber: 'linear-gradient(135deg, #06b6d4 0%, #2563eb 100%)',
  matrix: 'linear-gradient(135deg, #064e3b 0%, #000000 100%)',
  electric: 'linear-gradient(135deg, #9333ea 0%, #3b82f6 100%)',
};

const sceneTypeColors: { [key: string]: string } = {
  hook: 'bg-purple-500/30 text-purple-300',
  content: 'bg-blue-500/30 text-blue-300',
  'bullet-list': 'bg-cyan-500/30 text-cyan-300',
  stats: 'bg-green-500/30 text-green-300',
  whiteboard: 'bg-yellow-500/30 text-yellow-300',
  quote: 'bg-pink-500/30 text-pink-300',
  cta: 'bg-orange-500/30 text-orange-300',
  'icon-reveal': 'bg-violet-500/30 text-violet-300',
  'split-screen': 'bg-teal-500/30 text-teal-300',
  'title-card': 'bg-red-500/30 text-red-300',
};

export default function VisualPreview({
  plan,
  onEditScene,
  onGenerate,
  generating,
}: VisualPreviewProps) {
  const [hoveredScene, setHoveredScene] = useState<number | null>(null);

  const totalDuration = plan.total_duration_seconds ||
    plan.scenes?.reduce((acc, s) => acc + (s.duration_seconds || 4), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Plan Summary */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">{plan.idea}</h2>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Clock className="w-4 h-4" />
            <span>{totalDuration}s total</span>
          </div>
        </div>

        {/* Selected Options */}
        {plan.selected_options && (
          <div className="flex flex-wrap gap-2 mb-3">
            {plan.selected_options.genre && (
              <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded">
                {plan.selected_options.genre}
              </span>
            )}
            {plan.selected_options.style && (
              <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded">
                {plan.selected_options.style}
              </span>
            )}
            {plan.selected_options.animation_preset && (
              <span className="px-2 py-1 bg-cyan-500/20 text-cyan-300 text-xs rounded">
                {plan.selected_options.animation_preset}
              </span>
            )}
          </div>
        )}

        {/* Research Findings */}
        {plan.research_findings && plan.research_findings.length > 0 && (
          <div className="border-t border-gray-700 pt-3 mt-3">
            <h4 className="text-xs text-gray-500 uppercase mb-2">Research Findings</h4>
            <div className="space-y-1">
              {plan.research_findings.slice(0, 3).map((finding, i) => (
                <p key={i} className="text-xs text-gray-400">
                  <span className="text-purple-400">•</span> {finding.fact}
                  {finding.citation && (
                    <span className="text-gray-500 ml-1">— {finding.citation}</span>
                  )}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-400 flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Scene Timeline
          </h3>
          <span className="text-xs text-gray-500">{plan.scenes?.length || 0} scenes</span>
        </div>

        {/* Timeline Bar */}
        <div className="flex h-2 rounded-full overflow-hidden mb-4 bg-gray-700">
          {plan.scenes?.map((scene, i) => {
            const widthPercent = ((scene.duration_seconds || 4) / totalDuration) * 100;
            return (
              <div
                key={i}
                className={`h-full ${
                  hoveredScene === i ? 'opacity-100' : 'opacity-70'
                } transition-opacity`}
                style={{
                  width: `${widthPercent}%`,
                  background:
                    scene.background?.preset
                      ? gradientStyles[scene.background.preset] || '#4a5568'
                      : '#4a5568',
                }}
                onMouseEnter={() => setHoveredScene(i)}
                onMouseLeave={() => setHoveredScene(null)}
              />
            );
          })}
        </div>

        {/* Scene Cards */}
        <div className="space-y-3">
          {plan.scenes?.map((scene, index) => (
            <SceneCard
              key={index}
              scene={scene}
              index={index}
              onEdit={() => onEditScene(index)}
              isHovered={hoveredScene === index}
              onHover={(hovered) => setHoveredScene(hovered ? index : null)}
            />
          ))}
        </div>
      </div>

      {/* Notes */}
      {plan.notes && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-xs text-gray-500 uppercase mb-2">Notes</h4>
          <p className="text-sm text-gray-400">{plan.notes}</p>
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={onGenerate}
        disabled={generating}
        className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {generating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Generating Full Script...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            Generate Full Script
          </>
        )}
      </button>
    </div>
  );
}

function SceneCard({
  scene,
  index,
  onEdit,
  isHovered,
  onHover,
}: {
  scene: PlanScene;
  index: number;
  onEdit: () => void;
  isHovered: boolean;
  onHover: (hovered: boolean) => void;
}) {
  const bgStyle = scene.background?.preset
    ? { background: gradientStyles[scene.background.preset] || '#374151' }
    : { background: '#374151' };

  return (
    <div
      className={`rounded-lg overflow-hidden transition-all ${
        isHovered ? 'ring-2 ring-purple-500' : ''
      }`}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      <div className="flex">
        {/* Thumbnail Preview */}
        <div
          className="w-24 h-24 flex-shrink-0 flex items-center justify-center relative"
          style={bgStyle}
        >
          {/* Image thumbnail if available */}
          {scene.image_suggestions?.[0]?.url ? (
            <img
              src={scene.image_suggestions[0].url}
              alt="Scene preview"
              className="w-full h-full object-cover opacity-60"
            />
          ) : (
            <div className="text-center">
              <span className="text-2xl font-bold text-white/30">{index + 1}</span>
            </div>
          )}

          {/* Animation indicator */}
          {scene.animation && (
            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/50 rounded text-[10px] text-white">
              {scene.animation}
            </div>
          )}
        </div>

        {/* Scene Info */}
        <div className="flex-1 p-3 bg-gray-700/50">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 text-xs rounded ${
                  sceneTypeColors[scene.type] || 'bg-gray-500/30 text-gray-300'
                }`}
              >
                {scene.type}
              </span>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {scene.duration_seconds}s
              </span>
            </div>
            <button
              onClick={onEdit}
              className="p-1 text-gray-400 hover:text-white"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          </div>

          {scene.title && (
            <p className="font-medium text-purple-400 text-sm mb-0.5">{scene.title}</p>
          )}
          <p className="text-sm text-gray-300 line-clamp-2">
            {scene.text || scene.concept}
          </p>

          {/* Lottie indicator */}
          {scene.lottie && (
            <div className="mt-1 text-[10px] text-gray-500">
              + {scene.lottie.preset} animation ({scene.lottie.position})
            </div>
          )}

          {/* Image suggestions preview */}
          {scene.image_suggestions && scene.image_suggestions.length > 0 && (
            <div className="mt-2 flex items-center gap-1">
              <ImageIcon className="w-3 h-3 text-gray-500" />
              <span className="text-[10px] text-gray-500">
                {scene.image_suggestions.length} image suggestion(s)
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
