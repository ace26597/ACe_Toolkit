'use client';

import React, { useState } from 'react';
import {
  FileText,
  Edit3,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Clock,
  Lightbulb,
  Target,
} from 'lucide-react';

interface PlanScene {
  order: number;
  type: string;
  concept: string;
  visual_idea: string;
  duration_estimate: string;
}

interface Plan {
  plan_id: string;
  idea: string;
  research_summary: string;
  hook: {
    concept: string;
    type: string;
  };
  scenes: PlanScene[];
  cta: {
    message: string;
    style: string;
  };
  total_duration_estimate: string;
  notes?: string;
}

interface PlanPreviewProps {
  plan: Plan;
  onUpdate: (updates: Partial<Plan>) => Promise<void>;
  onGenerate: () => void;
  generating: boolean;
}

export default function PlanPreview({
  plan,
  onUpdate,
  onGenerate,
  generating,
}: PlanPreviewProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>([
    'hook',
    'scenes',
    'cta',
  ]);
  const [editingScene, setEditingScene] = useState<number | null>(null);
  const [editingHook, setEditingHook] = useState(false);
  const [editingCta, setEditingCta] = useState(false);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  };

  const handleSceneUpdate = async (index: number, updates: Partial<PlanScene>) => {
    const newScenes = [...plan.scenes];
    newScenes[index] = { ...newScenes[index], ...updates };
    await onUpdate({ scenes: newScenes });
    setEditingScene(null);
  };

  const handleHookUpdate = async (updates: Partial<Plan['hook']>) => {
    await onUpdate({ hook: { ...plan.hook, ...updates } });
    setEditingHook(false);
  };

  const handleCtaUpdate = async (updates: Partial<Plan['cta']>) => {
    await onUpdate({ cta: { ...plan.cta, ...updates } });
    setEditingCta(false);
  };

  return (
    <div className="space-y-4">
      {/* Research Summary */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-yellow-400" />
          Research Findings
        </h3>
        <p className="text-sm text-gray-300 whitespace-pre-wrap">
          {plan.research_summary || 'No research summary available.'}
        </p>
      </div>

      {/* Hook Section */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection('hook')}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-700/50"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="font-medium">Hook (3-5 seconds)</span>
          </div>
          {expandedSections.includes('hook') ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {expandedSections.includes('hook') && (
          <div className="px-4 pb-4">
            {editingHook ? (
              <HookEditor
                hook={plan.hook}
                onSave={handleHookUpdate}
                onCancel={() => setEditingHook(false)}
              />
            ) : (
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-300">{plan.hook?.concept}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Type: {plan.hook?.type}
                    </p>
                  </div>
                  <button
                    onClick={() => setEditingHook(true)}
                    className="p-1 text-gray-400 hover:text-white"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Scenes Section */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection('scenes')}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-700/50"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            <span className="font-medium">
              Scenes ({plan.scenes?.length || 0})
            </span>
          </div>
          {expandedSections.includes('scenes') ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {expandedSections.includes('scenes') && (
          <div className="px-4 pb-4 space-y-2">
            {plan.scenes?.map((scene, index) => (
              <div key={index}>
                {editingScene === index ? (
                  <SceneEditor
                    scene={scene}
                    onSave={(updates) => handleSceneUpdate(index, updates)}
                    onCancel={() => setEditingScene(null)}
                  />
                ) : (
                  <SceneCard
                    scene={scene}
                    onEdit={() => setEditingScene(index)}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CTA Section */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection('cta')}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-700/50"
        >
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-green-400" />
            <span className="font-medium">Call to Action (3-4 seconds)</span>
          </div>
          {expandedSections.includes('cta') ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {expandedSections.includes('cta') && (
          <div className="px-4 pb-4">
            {editingCta ? (
              <CtaEditor
                cta={plan.cta}
                onSave={handleCtaUpdate}
                onCancel={() => setEditingCta(false)}
              />
            ) : (
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-300">{plan.cta?.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Style: {plan.cta?.style}
                    </p>
                  </div>
                  <button
                    onClick={() => setEditingCta(true)}
                    className="p-1 text-gray-400 hover:text-white"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Duration & Notes */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Clock className="w-4 h-4" />
          <span>Estimated Duration: {plan.total_duration_estimate}</span>
        </div>
        {plan.notes && (
          <p className="mt-2 text-xs text-gray-500">{plan.notes}</p>
        )}
      </div>

      {/* Generate Button */}
      <button
        onClick={onGenerate}
        disabled={generating}
        className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {generating ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Generating Script...
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
  onEdit,
}: {
  scene: PlanScene;
  onEdit: () => void;
}) {
  return (
    <div className="bg-gray-700/50 rounded-lg p-3 flex items-start justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 bg-purple-600/30 text-purple-300 text-xs rounded">
            {scene.type}
          </span>
          <span className="text-xs text-gray-500">{scene.duration_estimate}</span>
        </div>
        <p className="text-sm text-gray-300">{scene.concept}</p>
        {scene.visual_idea && (
          <p className="text-xs text-gray-500 mt-1">
            Visual: {scene.visual_idea}
          </p>
        )}
      </div>
      <button onClick={onEdit} className="p-1 text-gray-400 hover:text-white">
        <Edit3 className="w-4 h-4" />
      </button>
    </div>
  );
}

function SceneEditor({
  scene,
  onSave,
  onCancel,
}: {
  scene: PlanScene;
  onSave: (updates: Partial<PlanScene>) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState(scene.type);
  const [concept, setConcept] = useState(scene.concept);
  const [visualIdea, setVisualIdea] = useState(scene.visual_idea);
  const [duration, setDuration] = useState(scene.duration_estimate);

  return (
    <div className="bg-gray-700 rounded-lg p-3 space-y-3">
      <div className="flex gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="px-2 py-1 bg-gray-600 border border-gray-500 rounded text-sm"
        >
          <option value="hook">Hook</option>
          <option value="content">Content</option>
          <option value="bullet-list">Bullet List</option>
          <option value="stats">Stats</option>
          <option value="whiteboard">Whiteboard</option>
          <option value="quote">Quote</option>
          <option value="cta">CTA</option>
        </select>
        <input
          type="text"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="Duration"
          className="w-24 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-sm"
        />
      </div>
      <textarea
        value={concept}
        onChange={(e) => setConcept(e.target.value)}
        placeholder="Scene concept..."
        className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-sm resize-none h-16"
      />
      <input
        type="text"
        value={visualIdea}
        onChange={(e) => setVisualIdea(e.target.value)}
        placeholder="Visual idea..."
        className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-sm"
      />
      <div className="flex gap-2">
        <button
          onClick={() =>
            onSave({
              type,
              concept,
              visual_idea: visualIdea,
              duration_estimate: duration,
            })
          }
          className="flex-1 py-1.5 bg-purple-600 hover:bg-purple-500 rounded text-sm flex items-center justify-center gap-1"
        >
          <Check className="w-4 h-4" /> Save
        </button>
        <button
          onClick={onCancel}
          className="flex-1 py-1.5 bg-gray-600 hover:bg-gray-500 rounded text-sm flex items-center justify-center gap-1"
        >
          <X className="w-4 h-4" /> Cancel
        </button>
      </div>
    </div>
  );
}

function HookEditor({
  hook,
  onSave,
  onCancel,
}: {
  hook: Plan['hook'];
  onSave: (updates: Partial<Plan['hook']>) => void;
  onCancel: () => void;
}) {
  const [concept, setConcept] = useState(hook?.concept || '');
  const [type, setType] = useState(hook?.type || '');

  return (
    <div className="bg-gray-700 rounded-lg p-3 space-y-3">
      <textarea
        value={concept}
        onChange={(e) => setConcept(e.target.value)}
        placeholder="Hook concept..."
        className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-sm resize-none h-16"
      />
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-sm"
      >
        <option value="surprise">Surprise</option>
        <option value="question">Question</option>
        <option value="bold-claim">Bold Claim</option>
        <option value="curiosity-gap">Curiosity Gap</option>
        <option value="controversy">Controversy</option>
      </select>
      <div className="flex gap-2">
        <button
          onClick={() => onSave({ concept, type })}
          className="flex-1 py-1.5 bg-purple-600 hover:bg-purple-500 rounded text-sm"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="flex-1 py-1.5 bg-gray-600 hover:bg-gray-500 rounded text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function CtaEditor({
  cta,
  onSave,
  onCancel,
}: {
  cta: Plan['cta'];
  onSave: (updates: Partial<Plan['cta']>) => void;
  onCancel: () => void;
}) {
  const [message, setMessage] = useState(cta?.message || '');
  const [style, setStyle] = useState(cta?.style || '');

  return (
    <div className="bg-gray-700 rounded-lg p-3 space-y-3">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="CTA message..."
        className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-sm"
      />
      <input
        type="text"
        value={style}
        onChange={(e) => setStyle(e.target.value)}
        placeholder="Style (e.g., bounce animation, particles)"
        className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-sm"
      />
      <div className="flex gap-2">
        <button
          onClick={() => onSave({ message, style })}
          className="flex-1 py-1.5 bg-purple-600 hover:bg-purple-500 rounded text-sm"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="flex-1 py-1.5 bg-gray-600 hover:bg-gray-500 rounded text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
