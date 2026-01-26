'use client';

import React from 'react';
import {
  Sparkles,
  Film,
  Palette,
  Zap,
  Search,
  MessageCircle,
  Layers,
  Check,
  ChevronRight,
  Loader2,
} from 'lucide-react';

interface Genre {
  id: string;
  label: string;
  description: string;
  selected: boolean;
}

interface Style {
  id: string;
  label: string;
  description: string;
  gradient: string;
  selected?: boolean;
}

interface AnimationPreset {
  id: string;
  animations: string[];
  timing: string;
  description: string;
  selected?: boolean;
}

interface ResearchSource {
  type: string;
  query: string;
  reason: string;
  selected?: boolean;
}

interface HookSuggestion {
  type: string;
  text: string;
  selected?: boolean;
}

interface SceneStructure {
  type: string;
  concept: string;
  duration: string;
}

interface Recommendations {
  rec_id: string;
  idea: string;
  generated_at: string;
  genres: Genre[];
  styles: Style[];
  animation_presets: AnimationPreset[];
  research_sources: ResearchSource[];
  hook_suggestions: HookSuggestion[];
  scene_structure: SceneStructure[];
  selected_options?: {
    genre?: string;
    style?: string;
    animation_preset?: string;
    hook_type?: string;
  };
}

interface RecommendationsPanelProps {
  recommendations: Recommendations;
  onSelect: (selections: { [key: string]: string }) => void;
  onContinue: () => void;
  loading?: boolean;
}

// Gradient preview colors
const gradientPresets: { [key: string]: string } = {
  midnight: 'from-gray-900 to-blue-900',
  neonPink: 'from-pink-600 to-purple-700',
  deepOcean: 'from-blue-900 to-cyan-800',
  purpleNight: 'from-purple-900 to-violet-800',
  sunset: 'from-orange-500 to-pink-600',
  fire: 'from-red-600 to-orange-500',
  aurora: 'from-blue-500 to-purple-600',
  cyber: 'from-cyan-500 to-blue-600',
  matrix: 'from-green-900 to-black',
  electric: 'from-purple-600 to-blue-500',
};

export default function RecommendationsPanel({
  recommendations,
  onSelect,
  onContinue,
  loading,
}: RecommendationsPanelProps) {
  const [selections, setSelections] = React.useState<{ [key: string]: string }>(
    recommendations.selected_options || {}
  );

  // Custom text inputs for "Other" options
  const [customInputs, setCustomInputs] = React.useState<{ [key: string]: string }>({});
  const [showCustom, setShowCustom] = React.useState<{ [key: string]: boolean }>({});

  const handleSelect = (category: string, value: string) => {
    const newSelections = { ...selections, [category]: value };
    setSelections(newSelections);
    onSelect(newSelections);
    // Hide custom input when selecting a preset option
    if (value !== 'custom') {
      setShowCustom(prev => ({ ...prev, [category]: false }));
    }
  };

  const handleCustomSelect = (category: string) => {
    setShowCustom(prev => ({ ...prev, [category]: true }));
    if (customInputs[category]) {
      handleSelect(category, `custom:${customInputs[category]}`);
    }
  };

  const handleCustomInputChange = (category: string, value: string) => {
    setCustomInputs(prev => ({ ...prev, [category]: value }));
    if (value) {
      handleSelect(category, `custom:${value}`);
    }
  };

  const isComplete = selections.genre && selections.style && selections.animation_preset;

  return (
    <div className="space-y-6">
      {/* Idea Summary */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center gap-2 text-purple-400 mb-2">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-medium">Video Idea</span>
        </div>
        <p className="text-gray-300">{recommendations.idea}</p>
      </div>

      {/* Genre Selection */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
          <Film className="w-4 h-4" />
          Genre / Style
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {recommendations.genres?.map((genre) => (
            <button
              key={genre.id}
              onClick={() => handleSelect('genre', genre.id)}
              className={`p-3 rounded-lg border text-left transition-all ${
                selections.genre === genre.id
                  ? 'border-purple-500 bg-purple-500/20'
                  : 'border-gray-600 hover:border-gray-500 bg-gray-700/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium">{genre.label}</span>
                {selections.genre === genre.id && (
                  <Check className="w-4 h-4 text-purple-400" />
                )}
              </div>
              <p className="text-xs text-gray-400">{genre.description}</p>
            </button>
          ))}
          {/* Custom Genre Option */}
          <button
            onClick={() => handleCustomSelect('genre')}
            className={`p-3 rounded-lg border text-left transition-all ${
              showCustom.genre || selections.genre?.startsWith('custom:')
                ? 'border-purple-500 bg-purple-500/20'
                : 'border-gray-600 hover:border-gray-500 bg-gray-700/50'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium">Other</span>
              {selections.genre?.startsWith('custom:') && (
                <Check className="w-4 h-4 text-purple-400" />
              )}
            </div>
            <p className="text-xs text-gray-400">Type your own genre</p>
          </button>
        </div>
        {showCustom.genre && (
          <input
            type="text"
            value={customInputs.genre || ''}
            onChange={(e) => handleCustomInputChange('genre', e.target.value)}
            placeholder="Enter custom genre..."
            className="mt-2 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:outline-none focus:border-purple-500"
            autoFocus
          />
        )}
      </div>

      {/* Visual Style Selection */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
          <Palette className="w-4 h-4" />
          Visual Style
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {recommendations.styles?.map((style) => (
            <button
              key={style.id}
              onClick={() => handleSelect('style', style.id)}
              className={`rounded-lg border overflow-hidden transition-all ${
                selections.style === style.id
                  ? 'border-purple-500 ring-2 ring-purple-500/50'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
            >
              {/* Gradient Preview */}
              <div
                className={`h-16 bg-gradient-to-br ${
                  gradientPresets[style.gradient] || 'from-gray-800 to-gray-900'
                }`}
              />
              <div className="p-3 bg-gray-700/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{style.label}</span>
                  {selections.style === style.id && (
                    <Check className="w-4 h-4 text-purple-400" />
                  )}
                </div>
                <p className="text-xs text-gray-400">{style.description}</p>
              </div>
            </button>
          ))}
          {/* Custom Style Option */}
          <button
            onClick={() => handleCustomSelect('style')}
            className={`rounded-lg border overflow-hidden transition-all ${
              showCustom.style || selections.style?.startsWith('custom:')
                ? 'border-purple-500 ring-2 ring-purple-500/50'
                : 'border-gray-600 hover:border-gray-500'
            }`}
          >
            <div className="h-16 bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
              <span className="text-2xl">✏️</span>
            </div>
            <div className="p-3 bg-gray-700/50">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium">Other</span>
                {selections.style?.startsWith('custom:') && (
                  <Check className="w-4 h-4 text-purple-400" />
                )}
              </div>
              <p className="text-xs text-gray-400">Describe your style</p>
            </div>
          </button>
        </div>
        {showCustom.style && (
          <input
            type="text"
            value={customInputs.style || ''}
            onChange={(e) => handleCustomInputChange('style', e.target.value)}
            placeholder="Describe your visual style..."
            className="mt-2 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:outline-none focus:border-purple-500"
            autoFocus
          />
        )}
      </div>

      {/* Animation Preset Selection */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Animation Style
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {recommendations.animation_presets?.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleSelect('animation_preset', preset.id)}
              className={`p-3 rounded-lg border text-left transition-all ${
                selections.animation_preset === preset.id
                  ? 'border-purple-500 bg-purple-500/20'
                  : 'border-gray-600 hover:border-gray-500 bg-gray-700/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium capitalize">{preset.id}</span>
                {selections.animation_preset === preset.id && (
                  <Check className="w-4 h-4 text-purple-400" />
                )}
              </div>
              <p className="text-xs text-gray-400">{preset.description}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {preset.animations?.map((anim, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-gray-600 rounded text-xs"
                  >
                    {anim}
                  </span>
                ))}
              </div>
            </button>
          ))}
          {/* Custom Animation Option */}
          <button
            onClick={() => handleCustomSelect('animation_preset')}
            className={`p-3 rounded-lg border text-left transition-all ${
              showCustom.animation_preset || selections.animation_preset?.startsWith('custom:')
                ? 'border-purple-500 bg-purple-500/20'
                : 'border-gray-600 hover:border-gray-500 bg-gray-700/50'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium">Other</span>
              {selections.animation_preset?.startsWith('custom:') && (
                <Check className="w-4 h-4 text-purple-400" />
              )}
            </div>
            <p className="text-xs text-gray-400">Describe your animation style</p>
          </button>
        </div>
        {showCustom.animation_preset && (
          <input
            type="text"
            value={customInputs.animation_preset || ''}
            onChange={(e) => handleCustomInputChange('animation_preset', e.target.value)}
            placeholder="Describe your animation style..."
            className="mt-2 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:outline-none focus:border-purple-500"
            autoFocus
          />
        )}
      </div>

      {/* Hook Suggestions */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
          <MessageCircle className="w-4 h-4" />
          Hook Ideas
        </h3>
        <div className="space-y-2">
          {recommendations.hook_suggestions?.map((hook, i) => (
            <button
              key={i}
              onClick={() => handleSelect('hook_type', hook.type)}
              className={`w-full p-3 rounded-lg border text-left transition-all ${
                selections.hook_type === hook.type
                  ? 'border-purple-500 bg-purple-500/20'
                  : 'border-gray-600 hover:border-gray-500 bg-gray-700/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 bg-gray-600 rounded text-xs capitalize">
                  {hook.type}
                </span>
                {selections.hook_type === hook.type && (
                  <Check className="w-4 h-4 text-purple-400" />
                )}
              </div>
              <p className="text-sm text-gray-300">{hook.text}</p>
            </button>
          ))}
          {/* Custom Hook Option */}
          <button
            onClick={() => handleCustomSelect('hook_type')}
            className={`w-full p-3 rounded-lg border text-left transition-all ${
              showCustom.hook_type || selections.hook_type?.startsWith('custom:')
                ? 'border-purple-500 bg-purple-500/20'
                : 'border-gray-600 hover:border-gray-500 bg-gray-700/50'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 bg-gray-600 rounded text-xs">custom</span>
              {selections.hook_type?.startsWith('custom:') && (
                <Check className="w-4 h-4 text-purple-400" />
              )}
            </div>
            <p className="text-sm text-gray-300">Write your own hook</p>
          </button>
        </div>
        {showCustom.hook_type && (
          <input
            type="text"
            value={customInputs.hook_type || ''}
            onChange={(e) => handleCustomInputChange('hook_type', e.target.value)}
            placeholder="Write your custom hook line..."
            className="mt-2 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:outline-none focus:border-purple-500"
            autoFocus
          />
        )}
      </div>

      {/* Research Sources Preview */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
          <Search className="w-4 h-4" />
          Research Sources (will be used in planning)
        </h3>
        <div className="space-y-1">
          {recommendations.research_sources?.map((source, i) => (
            <div key={i} className="text-sm text-gray-400 flex items-start gap-2">
              <span className="text-purple-400">•</span>
              <div>
                <span className="text-gray-300">"{source.query}"</span>
                <span className="text-gray-500 ml-2">— {source.reason}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scene Structure Preview */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4" />
          Suggested Scene Structure
        </h3>
        <div className="flex items-center gap-1">
          {recommendations.scene_structure?.map((scene, i) => (
            <React.Fragment key={i}>
              <div
                className="flex-1 p-2 bg-gray-700 rounded text-center min-w-0"
                title={scene.concept}
              >
                <span className="text-xs text-purple-400 capitalize block truncate">
                  {scene.type}
                </span>
                <span className="text-[10px] text-gray-500">{scene.duration}</span>
              </div>
              {i < recommendations.scene_structure.length - 1 && (
                <ChevronRight className="w-3 h-3 text-gray-600 flex-shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Continue Button */}
      <button
        onClick={onContinue}
        disabled={!isComplete || loading}
        className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <ChevronRight className="w-5 h-5" />
            Continue to Planning
          </>
        )}
      </button>

      {!isComplete && (
        <p className="text-center text-sm text-gray-500">
          Select a genre, visual style, and animation preset to continue
        </p>
      )}
    </div>
  );
}
