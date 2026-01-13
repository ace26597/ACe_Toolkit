"use client";

import { User, Brain, Wrench, CheckCircle, XCircle } from 'lucide-react';
import { ChatMessage as ChatMessageType } from '@/lib/api';

interface ChatMessageProps {
    message: ChatMessageType;
}

export default function ChatMessage({ message }: ChatMessageProps) {
    const isUser = message.role === 'user';

    return (
        <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
            {/* Avatar */}
            {!isUser && (
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-semibold">AI</span>
                </div>
            )}

            {/* Message Content */}
            <div className={`max-w-[80%] rounded-lg p-4 ${
                isUser
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-100'
            }`}>
                {/* Thinking Block */}
                {message.thinking && (
                    <div className="mb-3 p-2 bg-purple-900/30 rounded border border-purple-600/30">
                        <div className="flex items-center gap-2 text-purple-300 text-xs font-medium mb-1">
                            <Brain className="w-3 h-3" />
                            Thinking
                        </div>
                        <p className="text-sm text-gray-300">{message.thinking}</p>
                    </div>
                )}

                {/* Tool Calls */}
                {message.tool_calls && message.tool_calls.length > 0 && (
                    <div className="mb-3 space-y-2">
                        {message.tool_calls.map((tool) => (
                            <div
                                key={tool.id}
                                className="p-2 bg-blue-900/30 rounded border border-blue-600/30"
                            >
                                <div className="flex items-center gap-2 text-blue-300 text-xs font-medium mb-1">
                                    <Wrench className="w-3 h-3" />
                                    Tool: {tool.name}
                                </div>
                                <pre className="text-xs text-gray-400 overflow-x-auto whitespace-pre-wrap">
                                    {JSON.stringify(tool.input, null, 2)}
                                </pre>
                            </div>
                        ))}
                    </div>
                )}

                {/* Tool Results */}
                {message.tool_results && message.tool_results.length > 0 && (
                    <div className="mb-3 space-y-2">
                        {message.tool_results.map((result, idx) => (
                            <div
                                key={idx}
                                className={`p-2 rounded border ${
                                    result.success
                                        ? 'bg-green-900/30 border-green-600/30'
                                        : 'bg-red-900/30 border-red-600/30'
                                }`}
                            >
                                <div className={`flex items-center gap-2 text-xs font-medium mb-1 ${
                                    result.success ? 'text-green-300' : 'text-red-300'
                                }`}>
                                    {result.success ? (
                                        <>
                                            <CheckCircle className="w-3 h-3" />
                                            Success
                                        </>
                                    ) : (
                                        <>
                                            <XCircle className="w-3 h-3" />
                                            Error
                                        </>
                                    )}
                                    {result.execution_time_ms && (
                                        <span className="text-gray-400">
                                            ({result.execution_time_ms}ms)
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-300 whitespace-pre-wrap">
                                    {result.output || result.error}
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Main Content */}
                {message.content && (
                    <div className={`prose prose-sm max-w-none ${
                        isUser ? 'prose-invert' : 'prose-invert'
                    }`}>
                        <p className="whitespace-pre-wrap m-0">{message.content}</p>
                    </div>
                )}

                {/* Timestamp */}
                <div className={`text-xs mt-2 ${
                    isUser ? 'text-blue-200' : 'text-gray-500'
                }`}>
                    {new Date(message.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                </div>
            </div>

            {/* User Avatar */}
            {isUser && (
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-gray-300" />
                </div>
            )}
        </div>
    );
}
