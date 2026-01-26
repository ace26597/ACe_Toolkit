'use client';

import React from 'react';
import { Check, ChevronRight } from 'lucide-react';

export interface Step {
  id: string;
  label: string;
  shortLabel?: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
  completedSteps?: number[];
}

export default function StepIndicator({
  steps,
  currentStep,
  onStepClick,
  completedSteps = [],
}: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-1 md:gap-2 px-4 py-3 bg-gray-800/50 border-b border-gray-700 overflow-x-auto">
      {steps.map((step, index) => {
        const isCompleted = completedSteps.includes(index) || index < currentStep;
        const isCurrent = index === currentStep;
        const isClickable = onStepClick && (isCompleted || index <= currentStep + 1);

        return (
          <React.Fragment key={step.id}>
            <button
              onClick={() => isClickable && onStepClick?.(index)}
              disabled={!isClickable}
              className={`flex items-center gap-2 transition-colors ${
                isCurrent
                  ? 'text-purple-400'
                  : isCompleted
                  ? 'text-green-400'
                  : 'text-gray-500'
              } ${isClickable ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
            >
              {/* Step Number/Check */}
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                  isCompleted
                    ? 'bg-green-600 text-white'
                    : isCurrent
                    ? 'bg-purple-600/50 ring-2 ring-purple-400 text-white'
                    : 'bg-gray-700 text-gray-400'
                }`}
              >
                {isCompleted ? <Check className="w-3 h-3" /> : index + 1}
              </div>

              {/* Step Label */}
              <span className="text-sm whitespace-nowrap hidden sm:inline">
                {step.label}
              </span>
              <span className="text-sm whitespace-nowrap sm:hidden">
                {step.shortLabel || step.label}
              </span>
            </button>

            {/* Connector */}
            {index < steps.length - 1 && (
              <ChevronRight
                className={`w-4 h-4 flex-shrink-0 ${
                  index < currentStep ? 'text-green-600' : 'text-gray-600'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// Pre-defined steps for Video Studio v4.0
export const VIDEO_STUDIO_STEPS: Step[] = [
  { id: 'idea', label: 'Video Idea', shortLabel: 'Idea' },
  { id: 'recommendations', label: 'Options', shortLabel: 'Options' },
  { id: 'planning', label: 'Plan', shortLabel: 'Plan' },
  { id: 'preview', label: 'Preview', shortLabel: 'Preview' },
  { id: 'render', label: 'Render', shortLabel: 'Render' },
];
