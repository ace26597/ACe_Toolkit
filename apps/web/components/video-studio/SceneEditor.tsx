'use client';

import React, { useState } from 'react';
import {
  X,
  Save,
  Trash2,
  Plus,
  GripVertical,
  Clock,
  Type,
  Palette,
  Sparkles,
  Image as ImageIcon,
} from 'lucide-react';

// Types
export interface Scene {
  id: string;
  type: string;
  duration: number;
  text?: string;
  title?: string;
  bullets?: string[];
  emphasis?: string[];
  animation: string;
  timing: {
    type: string;
    damping?: number;
    stiffness?: number;
    mass?: number;
    durationFrames?: number;
  };
  transitionIn?: { type: string; direction?: string; duration: number };
  transitionOut?: { type: string; direction?: string; duration: number };
  background?: {
    type: string;
    gradientPreset?: string;
    imageUrl?: string;
    overlay?: string;
    blur?: number;
  };
  particles?: boolean;
  lottie?: {
    preset?: string;
    size?: number;
    position?: string;
  };
  drawingPath?: {
    preset?: string;
    stroke?: string;
    strokeWidth?: number;
  };
  stats?: Array<{
    label: string;
    value: number;
    maxValue?: number;
    color?: string;
  }>;
}

interface SceneEditorProps {
  scene: Scene;
  onSave: (scene: Scene) => void;
  onDelete: () => void;
  onClose: () => void;
}

const SCENE_TYPES = [
  { value: 'hook', label: 'Hook' },
  { value: 'content', label: 'Content' },
  { value: 'bullet-list', label: 'Bullet List' },
  { value: 'quote', label: 'Quote' },
  { value: 'cta', label: 'Call to Action' },
  { value: 'title-card', label: 'Title Card' },
  { value: 'whiteboard', label: 'Whiteboard' },
  { value: 'stats', label: 'Stats' },
  { value: 'icon-reveal', label: 'Icon Reveal' },
  { value: 'split-screen', label: 'Split Screen' },
];

const ANIMATIONS = [
  { value: 'fadeIn', label: 'Fade In' },
  { value: 'slideUp', label: 'Slide Up' },
  { value: 'slideDown', label: 'Slide Down' },
  { value: 'slideLeft', label: 'Slide Left' },
  { value: 'slideRight', label: 'Slide Right' },
  { value: 'scale', label: 'Scale' },
  { value: 'typewriter', label: 'Typewriter' },
  { value: 'bounce', label: 'Bounce' },
  { value: 'blur', label: 'Blur' },
  { value: 'draw', label: 'Draw' },
];

const GRADIENT_PRESETS = [
  { value: 'purpleNight', label: 'Purple Night', colors: ['#0f0c29', '#302b63'] },
  { value: 'deepOcean', label: 'Deep Ocean', colors: ['#0f2027', '#2c5364'] },
  { value: 'darkPurple', label: 'Dark Purple', colors: ['#1a0a2e', '#8b5cf6'] },
  { value: 'midnight', label: 'Midnight', colors: ['#0a0a0a', '#16213e'] },
  { value: 'sunset', label: 'Sunset', colors: ['#ff512f', '#f09819'] },
  { value: 'neonPink', label: 'Neon Pink', colors: ['#12c2e9', '#f64f59'] },
  { value: 'aurora', label: 'Aurora', colors: ['#00c6ff', '#7c3aed'] },
  { value: 'fire', label: 'Fire', colors: ['#f12711', '#f5af19'] },
  { value: 'cyber', label: 'Cyber', colors: ['#00d2ff', '#3a7bd5'] },
  { value: 'matrix', label: 'Matrix', colors: ['#003300', '#00ff00'] },
  { value: 'electric', label: 'Electric', colors: ['#4776E6', '#8E54E9'] },
];

const LOTTIE_PRESETS = [
  'robot',
  'brain',
  'rocket',
  'success',
  'chart',
  'medical',
  'science',
];

const DRAWING_PRESETS = [
  'check',
  'cross',
  'arrowRight',
  'arrowUp',
  'lightbulb',
  'star',
  'heart',
  'brain',
  'rocket',
  'chart',
];

export default function SceneEditor({
  scene,
  onSave,
  onDelete,
  onClose,
}: SceneEditorProps) {
  const [editedScene, setEditedScene] = useState<Scene>({ ...scene });
  const [activeTab, setActiveTab] = useState<'content' | 'style' | 'animation' | 'media'>(
    'content'
  );

  const updateScene = (updates: Partial<Scene>) => {
    setEditedScene((prev) => ({ ...prev, ...updates }));
  };

  const handleSave = () => {
    onSave(editedScene);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold">Edit Scene</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          {[
            { id: 'content', label: 'Content', icon: Type },
            { id: 'style', label: 'Style', icon: Palette },
            { id: 'animation', label: 'Animation', icon: Sparkles },
            { id: 'media', label: 'Media', icon: ImageIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 text-sm transition-colors ${
                activeTab === tab.id
                  ? 'text-purple-400 border-b-2 border-purple-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'content' && (
            <ContentTab scene={editedScene} onChange={updateScene} />
          )}
          {activeTab === 'style' && (
            <StyleTab scene={editedScene} onChange={updateScene} />
          )}
          {activeTab === 'animation' && (
            <AnimationTab scene={editedScene} onChange={updateScene} />
          )}
          {activeTab === 'media' && (
            <MediaTab scene={editedScene} onChange={updateScene} />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-700">
          <button
            onClick={onDelete}
            className="px-4 py-2 text-red-400 hover:bg-red-500/20 rounded-lg flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete Scene
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Content Tab
function ContentTab({
  scene,
  onChange,
}: {
  scene: Scene;
  onChange: (updates: Partial<Scene>) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Scene Type */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">Scene Type</label>
        <select
          value={scene.type}
          onChange={(e) => onChange({ type: e.target.value })}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg"
        >
          {SCENE_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* Duration */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">
          Duration (frames at 30fps)
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={scene.duration}
            onChange={(e) => onChange({ duration: parseInt(e.target.value) || 90 })}
            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg"
          />
          <span className="text-sm text-gray-500">
            = {(scene.duration / 30).toFixed(1)}s
          </span>
        </div>
      </div>

      {/* Title (for certain types) */}
      {['content', 'bullet-list', 'stats', 'title-card', 'split-screen'].includes(
        scene.type
      ) && (
        <div>
          <label className="block text-sm text-gray-400 mb-1">Title</label>
          <input
            type="text"
            value={scene.title || ''}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Scene title..."
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg"
          />
        </div>
      )}

      {/* Text */}
      {['hook', 'content', 'quote', 'cta', 'icon-reveal', 'whiteboard'].includes(
        scene.type
      ) && (
        <div>
          <label className="block text-sm text-gray-400 mb-1">Text</label>
          <textarea
            value={scene.text || ''}
            onChange={(e) => onChange({ text: e.target.value })}
            placeholder="Main text content..."
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg h-24 resize-none"
          />
        </div>
      )}

      {/* Bullets (for bullet-list) */}
      {scene.type === 'bullet-list' && (
        <div>
          <label className="block text-sm text-gray-400 mb-1">Bullet Points</label>
          <BulletEditor
            bullets={scene.bullets || []}
            onChange={(bullets) => onChange({ bullets })}
          />
        </div>
      )}

      {/* Stats (for stats scene) */}
      {scene.type === 'stats' && (
        <div>
          <label className="block text-sm text-gray-400 mb-1">Statistics</label>
          <StatsEditor
            stats={scene.stats || []}
            onChange={(stats) => onChange({ stats })}
          />
        </div>
      )}

      {/* Emphasis Words */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">
          Emphasis Words (comma-separated)
        </label>
        <input
          type="text"
          value={scene.emphasis?.join(', ') || ''}
          onChange={(e) =>
            onChange({
              emphasis: e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          placeholder="words, to, highlight"
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg"
        />
      </div>
    </div>
  );
}

// Style Tab
function StyleTab({
  scene,
  onChange,
}: {
  scene: Scene;
  onChange: (updates: Partial<Scene>) => void;
}) {
  const background = scene.background || { type: 'gradient', gradientPreset: 'purpleNight' };

  return (
    <div className="space-y-4">
      {/* Background Type */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">Background Type</label>
        <select
          value={background.type}
          onChange={(e) =>
            onChange({
              background: { ...background, type: e.target.value },
            })
          }
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg"
        >
          <option value="gradient">Gradient</option>
          <option value="solid">Solid Color</option>
          <option value="image">Image</option>
          <option value="mesh">Mesh Gradient</option>
          <option value="grid">Grid Pattern</option>
          <option value="dots">Dot Pattern</option>
        </select>
      </div>

      {/* Gradient Preset */}
      {background.type === 'gradient' && (
        <div>
          <label className="block text-sm text-gray-400 mb-2">Gradient Preset</label>
          <div className="grid grid-cols-3 gap-2">
            {GRADIENT_PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() =>
                  onChange({
                    background: { ...background, gradientPreset: preset.value },
                  })
                }
                className={`p-3 rounded-lg border-2 transition-colors ${
                  background.gradientPreset === preset.value
                    ? 'border-purple-500'
                    : 'border-transparent'
                }`}
                style={{
                  background: `linear-gradient(135deg, ${preset.colors.join(', ')})`,
                }}
              >
                <span className="text-xs text-white drop-shadow-md">
                  {preset.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Image URL */}
      {background.type === 'image' && (
        <div className="space-y-2">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Image URL</label>
            <input
              type="text"
              value={background.imageUrl || ''}
              onChange={(e) =>
                onChange({
                  background: { ...background, imageUrl: e.target.value },
                })
              }
              placeholder="https://source.unsplash.com/1080x1920/?keyword"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Overlay</label>
            <input
              type="text"
              value={background.overlay || 'rgba(0,0,0,0.5)'}
              onChange={(e) =>
                onChange({
                  background: { ...background, overlay: e.target.value },
                })
              }
              placeholder="rgba(0,0,0,0.5)"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Blur</label>
            <input
              type="number"
              value={background.blur || 0}
              onChange={(e) =>
                onChange({
                  background: { ...background, blur: parseInt(e.target.value) || 0 },
                })
              }
              className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Particles */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="particles"
          checked={scene.particles || false}
          onChange={(e) => onChange({ particles: e.target.checked })}
          className="w-4 h-4 rounded bg-gray-700 border-gray-600"
        />
        <label htmlFor="particles" className="text-sm">
          Enable floating particles
        </label>
      </div>
    </div>
  );
}

// Animation Tab
function AnimationTab({
  scene,
  onChange,
}: {
  scene: Scene;
  onChange: (updates: Partial<Scene>) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Animation Type */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">Animation</label>
        <select
          value={scene.animation}
          onChange={(e) => onChange({ animation: e.target.value })}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg"
        >
          {ANIMATIONS.map((anim) => (
            <option key={anim.value} value={anim.value}>
              {anim.label}
            </option>
          ))}
        </select>
      </div>

      {/* Timing */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">Timing Type</label>
        <select
          value={scene.timing?.type || 'spring'}
          onChange={(e) =>
            onChange({ timing: { ...scene.timing, type: e.target.value } })
          }
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg"
        >
          <option value="spring">Spring (Natural)</option>
          <option value="linear">Linear</option>
          <option value="easing">Easing</option>
        </select>
      </div>

      {/* Spring Settings */}
      {scene.timing?.type === 'spring' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Damping</label>
            <input
              type="number"
              value={scene.timing?.damping || 200}
              onChange={(e) =>
                onChange({
                  timing: {
                    ...scene.timing,
                    damping: parseInt(e.target.value) || 200,
                  },
                })
              }
              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Stiffness</label>
            <input
              type="number"
              value={scene.timing?.stiffness || 100}
              onChange={(e) =>
                onChange({
                  timing: {
                    ...scene.timing,
                    stiffness: parseInt(e.target.value) || 100,
                  },
                })
              }
              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
            />
          </div>
        </div>
      )}

      {/* Transition In */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">Transition In</label>
        <div className="flex gap-2">
          <select
            value={scene.transitionIn?.type || 'fade'}
            onChange={(e) =>
              onChange({
                transitionIn: {
                  ...scene.transitionIn,
                  type: e.target.value,
                  duration: scene.transitionIn?.duration || 15,
                },
              })
            }
            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg"
          >
            <option value="none">None</option>
            <option value="fade">Fade</option>
            <option value="slide">Slide</option>
            <option value="wipe">Wipe</option>
          </select>
          <input
            type="number"
            value={scene.transitionIn?.duration || 15}
            onChange={(e) =>
              onChange({
                transitionIn: {
                  ...scene.transitionIn,
                  type: scene.transitionIn?.type || 'fade',
                  duration: parseInt(e.target.value) || 15,
                },
              })
            }
            placeholder="frames"
            className="w-20 px-2 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm"
          />
        </div>
      </div>

      {/* Transition Out */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">Transition Out</label>
        <div className="flex gap-2">
          <select
            value={scene.transitionOut?.type || 'fade'}
            onChange={(e) =>
              onChange({
                transitionOut: {
                  ...scene.transitionOut,
                  type: e.target.value,
                  duration: scene.transitionOut?.duration || 15,
                },
              })
            }
            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg"
          >
            <option value="none">None</option>
            <option value="fade">Fade</option>
            <option value="slide">Slide</option>
            <option value="wipe">Wipe</option>
          </select>
          <input
            type="number"
            value={scene.transitionOut?.duration || 15}
            onChange={(e) =>
              onChange({
                transitionOut: {
                  ...scene.transitionOut,
                  type: scene.transitionOut?.type || 'fade',
                  duration: parseInt(e.target.value) || 15,
                },
              })
            }
            placeholder="frames"
            className="w-20 px-2 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm"
          />
        </div>
      </div>
    </div>
  );
}

// Media Tab
function MediaTab({
  scene,
  onChange,
}: {
  scene: Scene;
  onChange: (updates: Partial<Scene>) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Lottie Animation */}
      <div>
        <label className="block text-sm text-gray-400 mb-2">Lottie Animation</label>
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => onChange({ lottie: undefined })}
            className={`p-2 rounded border ${
              !scene.lottie ? 'border-purple-500 bg-purple-500/20' : 'border-gray-600'
            }`}
          >
            <span className="text-xs">None</span>
          </button>
          {LOTTIE_PRESETS.map((preset) => (
            <button
              key={preset}
              onClick={() =>
                onChange({
                  lottie: {
                    preset,
                    size: scene.lottie?.size || 200,
                    position: scene.lottie?.position || 'center',
                  },
                })
              }
              className={`p-2 rounded border capitalize ${
                scene.lottie?.preset === preset
                  ? 'border-purple-500 bg-purple-500/20'
                  : 'border-gray-600'
              }`}
            >
              <span className="text-xs">{preset}</span>
            </button>
          ))}
        </div>
        {scene.lottie && (
          <div className="mt-3 flex gap-2">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Size</label>
              <input
                type="number"
                value={scene.lottie.size || 200}
                onChange={(e) =>
                  onChange({
                    lottie: { ...scene.lottie, size: parseInt(e.target.value) || 200 },
                  })
                }
                className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Position</label>
              <select
                value={scene.lottie.position || 'center'}
                onChange={(e) =>
                  onChange({
                    lottie: { ...scene.lottie, position: e.target.value },
                  })
                }
                className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
              >
                <option value="center">Center</option>
                <option value="top">Top</option>
                <option value="bottom">Bottom</option>
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Drawing Path */}
      <div>
        <label className="block text-sm text-gray-400 mb-2">Drawing Path</label>
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => onChange({ drawingPath: undefined })}
            className={`p-2 rounded border ${
              !scene.drawingPath
                ? 'border-purple-500 bg-purple-500/20'
                : 'border-gray-600'
            }`}
          >
            <span className="text-xs">None</span>
          </button>
          {DRAWING_PRESETS.map((preset) => (
            <button
              key={preset}
              onClick={() =>
                onChange({
                  drawingPath: {
                    preset,
                    stroke: scene.drawingPath?.stroke || '#8b5cf6',
                    strokeWidth: scene.drawingPath?.strokeWidth || 4,
                  },
                })
              }
              className={`p-2 rounded border capitalize ${
                scene.drawingPath?.preset === preset
                  ? 'border-purple-500 bg-purple-500/20'
                  : 'border-gray-600'
              }`}
            >
              <span className="text-xs">{preset}</span>
            </button>
          ))}
        </div>
        {scene.drawingPath && (
          <div className="mt-3 flex gap-2">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Stroke Color</label>
              <input
                type="color"
                value={scene.drawingPath.stroke || '#8b5cf6'}
                onChange={(e) =>
                  onChange({
                    drawingPath: { ...scene.drawingPath, stroke: e.target.value },
                  })
                }
                className="w-full h-8 bg-gray-700 border border-gray-600 rounded cursor-pointer"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Width</label>
              <input
                type="number"
                value={scene.drawingPath.strokeWidth || 4}
                onChange={(e) =>
                  onChange({
                    drawingPath: {
                      ...scene.drawingPath,
                      strokeWidth: parseInt(e.target.value) || 4,
                    },
                  })
                }
                className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper Components
function BulletEditor({
  bullets,
  onChange,
}: {
  bullets: string[];
  onChange: (bullets: string[]) => void;
}) {
  const addBullet = () => {
    onChange([...bullets, '']);
  };

  const updateBullet = (index: number, value: string) => {
    const newBullets = [...bullets];
    newBullets[index] = value;
    onChange(newBullets);
  };

  const removeBullet = (index: number) => {
    onChange(bullets.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      {bullets.map((bullet, index) => (
        <div key={index} className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-gray-500 cursor-move" />
          <input
            type="text"
            value={bullet}
            onChange={(e) => updateBullet(index, e.target.value)}
            placeholder={`Bullet point ${index + 1}`}
            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm"
          />
          <button
            onClick={() => removeBullet(index)}
            className="p-1 text-gray-400 hover:text-red-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        onClick={addBullet}
        className="w-full py-2 border border-dashed border-gray-600 rounded-lg text-sm text-gray-400 hover:text-white hover:border-purple-500 flex items-center justify-center gap-1"
      >
        <Plus className="w-4 h-4" /> Add Bullet
      </button>
    </div>
  );
}

function StatsEditor({
  stats,
  onChange,
}: {
  stats: Array<{ label: string; value: number; maxValue?: number; color?: string }>;
  onChange: (
    stats: Array<{ label: string; value: number; maxValue?: number; color?: string }>
  ) => void;
}) {
  const addStat = () => {
    onChange([...stats, { label: '', value: 0, maxValue: 100, color: '#8b5cf6' }]);
  };

  const updateStat = (
    index: number,
    updates: Partial<{ label: string; value: number; maxValue?: number; color?: string }>
  ) => {
    const newStats = [...stats];
    newStats[index] = { ...newStats[index], ...updates };
    onChange(newStats);
  };

  const removeStat = (index: number) => {
    onChange(stats.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      {stats.map((stat, index) => (
        <div key={index} className="flex items-center gap-2 bg-gray-700/50 p-2 rounded">
          <input
            type="text"
            value={stat.label}
            onChange={(e) => updateStat(index, { label: e.target.value })}
            placeholder="Label"
            className="flex-1 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-sm"
          />
          <input
            type="number"
            value={stat.value}
            onChange={(e) => updateStat(index, { value: parseInt(e.target.value) || 0 })}
            placeholder="Value"
            className="w-20 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-sm"
          />
          <input
            type="color"
            value={stat.color || '#8b5cf6'}
            onChange={(e) => updateStat(index, { color: e.target.value })}
            className="w-8 h-8 bg-gray-600 border border-gray-500 rounded cursor-pointer"
          />
          <button
            onClick={() => removeStat(index)}
            className="p-1 text-gray-400 hover:text-red-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        onClick={addStat}
        className="w-full py-2 border border-dashed border-gray-600 rounded-lg text-sm text-gray-400 hover:text-white hover:border-purple-500 flex items-center justify-center gap-1"
      >
        <Plus className="w-4 h-4" /> Add Stat
      </button>
    </div>
  );
}
