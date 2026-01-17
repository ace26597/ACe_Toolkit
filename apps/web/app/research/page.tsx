'use client';

import { useState } from 'react';
import ModelSelector from '@/components/research/ModelSelector';
import FileUploadZone from '@/components/research/FileUploadZone';
import WorkflowVisualizer from '@/components/research/WorkflowVisualizer';
import ResearchChatInterface from '@/components/research/ResearchChatInterface';
import ReportViewer from '@/components/research/ReportViewer';

export default function ResearchPage() {
  // Session management
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Model configuration
  const [modelConfig, setModelConfig] = useState({
    provider: 'openai',
    model: 'gpt-5.2'
  });

  // File management
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);

  // Workflow state
  const [workflowState, setWorkflowState] = useState<any>(null);

  // Report management
  const [currentReport, setCurrentReport] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-2 sm:p-4 md:p-6">
      <div className="max-w-[2000px] mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1 sm:mb-2">Research Assistant</h1>
          <p className="text-xs sm:text-sm text-gray-300">Multi-model AI research with LangGraph workflows, file analysis, and reporting</p>
        </div>

        {/* Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 md:gap-6">
          {/* Left Sidebar: Model Selector + File Upload + Workflow Visualizer */}
          <div className="lg:col-span-3 space-y-3 sm:space-y-4 md:space-y-6">
            <ModelSelector
              value={modelConfig}
              onChange={setModelConfig}
            />

            <FileUploadZone
              conversationId={conversationId}
              onFilesUploaded={setUploadedFiles}
            />

            <WorkflowVisualizer
              state={workflowState}
            />
          </div>

          {/* Center: Chat Interface */}
          <div className="lg:col-span-6 order-first lg:order-none">
            <ResearchChatInterface
              sessionId={sessionId}
              conversationId={conversationId}
              modelConfig={modelConfig}
              uploadedFiles={uploadedFiles}
              onConversationCreated={setConversationId}
              onWorkflowUpdate={setWorkflowState}
              onReportGenerated={setCurrentReport}
            />
          </div>

          {/* Right Sidebar: Report Viewer */}
          <div className="lg:col-span-3">
            <ReportViewer
              conversationId={conversationId}
              report={currentReport}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
