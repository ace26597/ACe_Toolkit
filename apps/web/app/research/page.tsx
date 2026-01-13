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
    model: 'gpt-4o'
  });

  // File management
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);

  // Workflow state
  const [workflowState, setWorkflowState] = useState<any>(null);

  // Report management
  const [currentReport, setCurrentReport] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-6">
      <div className="max-w-[2000px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-white mb-2">Research Assistant</h1>
          <p className="text-gray-300">Multi-model AI research with LangGraph workflows, file analysis, and comprehensive reporting</p>
        </div>

        {/* 3-Column Layout */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left Sidebar: Model Selector + File Upload + Workflow Visualizer */}
          <div className="col-span-12 lg:col-span-3 space-y-6">
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
          <div className="col-span-12 lg:col-span-6">
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
          <div className="col-span-12 lg:col-span-3">
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
