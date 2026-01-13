'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, AlertCircle } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ResearchChatInterfaceProps {
  sessionId: string;
  conversationId: string | null;
  modelConfig: { provider: string; model: string };
  uploadedFiles: any[];
  onConversationCreated: (id: string) => void;
  onWorkflowUpdate: (state: any) => void;
  onReportGenerated: (report: string) => void;
}

export default function ResearchChatInterface({
  sessionId,
  conversationId,
  modelConfig,
  uploadedFiles,
  onConversationCreated,
  onWorkflowUpdate,
  onReportGenerated
}: ResearchChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Connect WebSocket
  useEffect(() => {
    // Use NEXT_PUBLIC_API_URL (for network/Cloudflare) or fall back to localhost
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ||
                   process.env.NEXT_PUBLIC_API_BASE_URL ||
                   'http://localhost:8000';

    // Convert http/https to ws/wss for WebSocket
    const wsUrl = apiUrl.replace(/^https/, 'wss').replace(/^http/, 'ws') + '/research/stream';

    console.log('Connecting to WebSocket:', wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setError(null);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'workflow_step':
          // Update workflow visualizer
          onWorkflowUpdate({
            current_step: data.step,
            steps_completed: data.status === 'complete' ? [data.step] : [],
            workflow_type: data.workflow_type
          });
          break;

        case 'content_delta':
          // Append streaming content
          setStreamingContent(prev => prev + data.delta);
          break;

        case 'message_complete':
          // Save assistant message
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: data.synthesis || streamingContent,
            timestamp: new Date()
          }]);
          setStreamingContent('');
          setIsStreaming(false);

          // Update conversation ID if new
          if (data.conversation_id && !conversationId) {
            onConversationCreated(data.conversation_id);
          }

          // Update workflow state
          onWorkflowUpdate({
            tokens_used: data.tokens_used,
            steps_completed: ['finalized']
          });

          // Set report if available
          if (data.report_available) {
            onReportGenerated(data.synthesis || '');
          }
          break;

        case 'error':
          setError(data.error);
          setIsStreaming(false);
          break;
      }
    };

    ws.onerror = () => {
      setError('WebSocket connection error');
      setIsStreaming(false);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, []);

  const sendMessage = () => {
    if (!input.trim() || isStreaming) return;

    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    // Send to WebSocket
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      setIsStreaming(true);
      setStreamingContent('');
      setError(null);

      wsRef.current.send(JSON.stringify({
        type: 'message',
        conversation_id: conversationId,
        content: input,
        session_id: sessionId,
        model_config: modelConfig,
        uploaded_files: uploadedFiles
      }));

      setInput('');
    } else {
      setError('WebSocket not connected. Please refresh the page.');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 flex flex-col h-[700px]">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold text-white">Research Chat</h2>
        <p className="text-sm text-gray-400">
          Using {modelConfig.provider === 'openai' ? 'OpenAI' : 'Anthropic'} {modelConfig.model}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <Bot className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-300 mb-2">Start Your Research</h3>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              Ask questions, upload files, search the web, and generate comprehensive research reports
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
            )}

            <div
              className={`max-w-[80%] rounded-lg p-4 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-100'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              <p className="text-xs opacity-70 mt-2">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>

            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-white" />
              </div>
            )}
          </div>
        ))}

        {/* Streaming Message */}
        {isStreaming && streamingContent && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="max-w-[80%] rounded-lg p-4 bg-gray-700 text-gray-100">
              <p className="whitespace-pre-wrap">{streamingContent}</p>
              <span className="inline-block w-2 h-4 bg-blue-400 ml-1 animate-pulse"></span>
            </div>
          </div>
        )}

        {/* Loading Indicator */}
        {isStreaming && !streamingContent && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            </div>
            <div className="max-w-[80%] rounded-lg p-4 bg-gray-700 text-gray-400">
              <p>Researching...</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex gap-3 items-start p-3 bg-red-900/20 border border-red-700 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-300 text-sm font-medium">Error</p>
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a research question... (Shift+Enter for new line)"
            className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none resize-none"
            rows={3}
            disabled={isStreaming}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isStreaming ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        {uploadedFiles.length > 0 && (
          <p className="text-xs text-gray-400 mt-2">
            {uploadedFiles.length} file(s) attached
          </p>
        )}
      </div>
    </div>
  );
}
