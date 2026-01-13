'use client';

import { Cpu, Zap, DollarSign } from 'lucide-react';

interface ModelConfig {
  provider: string;
  model: string;
}

interface ModelSelectorProps {
  value: ModelConfig;
  onChange: (config: ModelConfig) => void;
}

const models = {
  openai: [
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      description: 'Fast, multimodal, excellent for vision',
      cost: '$$$'
    },
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      description: 'Cost-effective, good performance',
      cost: '$'
    },
    {
      id: 'gpt-5.1',
      name: 'GPT-5.1',
      description: 'Latest generation model',
      cost: '$$$$'
    },
    {
      id: 'gpt-5.2',
      name: 'GPT-5.2',
      description: 'Next generation model',
      cost: '$$$$'
    }
  ],
  anthropic: [
    {
      id: 'claude-sonnet-4-20250514',
      name: 'Claude Sonnet 4',
      description: 'Balanced speed and capability',
      cost: '$$'
    },
    {
      id: 'claude-opus-4-5-20251101',
      name: 'Claude Opus 4.5',
      description: 'Most capable, best for complex tasks',
      cost: '$$$$'
    }
  ]
};

export default function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const currentModels = models[value.provider as keyof typeof models] || [];
  const currentModel = currentModels.find(m => m.id === value.model);

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Cpu className="w-5 h-5 text-blue-400" />
        <h3 className="text-lg font-semibold text-white">AI Model</h3>
      </div>

      {/* Provider Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">Provider</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onChange({ provider: 'openai', model: 'gpt-4o' })}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              value.provider === 'openai'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            OpenAI
          </button>
          <button
            onClick={() => onChange({ provider: 'anthropic', model: 'claude-sonnet-4-20250514' })}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              value.provider === 'anthropic'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Anthropic
          </button>
        </div>
      </div>

      {/* Model Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Model</label>
        <select
          value={value.model}
          onChange={(e) => onChange({ ...value, model: e.target.value })}
          className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
        >
          {currentModels.map(model => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
      </div>

      {/* Model Info */}
      {currentModel && (
        <div className="mt-4 p-3 bg-gray-700/50 rounded-lg space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-gray-300">{currentModel.description}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="w-4 h-4 text-green-400" />
            <span className="text-gray-300">Cost: {currentModel.cost}</span>
          </div>
        </div>
      )}
    </div>
  );
}
