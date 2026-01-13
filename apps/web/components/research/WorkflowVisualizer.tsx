'use client';

import { Activity, CheckCircle, Circle, Loader2 } from 'lucide-react';

interface WorkflowVisualizerProps {
  state: any;
}

const workflowSteps = [
  { id: 'router', label: 'Routing', description: 'Analyzing query type' },
  { id: 'search', label: 'Web Search', description: 'Finding relevant sources' },
  { id: 'file_processing', label: 'File Processing', description: 'Extracting content' },
  { id: 'analysis', label: 'Analysis', description: 'AI + tools analysis' },
  { id: 'synthesis', label: 'Synthesis', description: 'Combining findings' },
  { id: 'report_generation', label: 'Report', description: 'Generating report' },
  { id: 'quality_check', label: 'Quality Check', description: 'Validating output' },
  { id: 'finalize', label: 'Complete', description: 'Workflow finished' }
];

export default function WorkflowVisualizer({ state }: WorkflowVisualizerProps) {
  const completedSteps = state?.steps_completed || [];
  const currentStep = state?.current_step || null;

  const getStepStatus = (stepId: string): 'completed' | 'current' | 'pending' => {
    if (completedSteps.includes(stepId)) return 'completed';
    if (currentStep === stepId) return 'current';
    return 'pending';
  };

  const getStepIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (status === 'current') return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    return <Circle className="w-4 h-4 text-gray-500" />;
  };

  if (!state) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Workflow</h3>
        </div>
        <p className="text-gray-400 text-sm text-center py-8">Start a query to see workflow progress</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-blue-400" />
        <h3 className="text-lg font-semibold text-white">Workflow Progress</h3>
      </div>

      {/* Workflow Type Badge */}
      {state.workflow_type && (
        <div className="mb-4">
          <span className="px-3 py-1 bg-blue-600/20 text-blue-300 rounded-full text-xs font-medium">
            {state.workflow_type.toUpperCase()} Workflow
          </span>
        </div>
      )}

      {/* Steps */}
      <div className="space-y-3">
        {workflowSteps.map((step, index) => {
          const status = getStepStatus(step.id);
          const isVisible = status !== 'pending' || index <= completedSteps.length;

          if (!isVisible) return null;

          return (
            <div key={step.id} className="flex items-start gap-3">
              {/* Icon */}
              <div className="mt-1">
                {getStepIcon(status)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${
                  status === 'completed' ? 'text-green-400' :
                  status === 'current' ? 'text-blue-400' :
                  'text-gray-500'
                }`}>
                  {step.label}
                </div>
                <div className="text-xs text-gray-400">{step.description}</div>
              </div>

              {/* Connector Line */}
              {index < workflowSteps.length - 1 && isVisible && (
                <div className={`absolute left-[22px] w-0.5 h-6 mt-6 ${
                  status === 'completed' ? 'bg-green-500' : 'bg-gray-600'
                }`} style={{ marginTop: '1.5rem' }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Stats */}
      {state.tokens_used > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="text-xs text-gray-400">
            Tokens Used: <span className="text-white font-medium">{state.tokens_used.toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}
