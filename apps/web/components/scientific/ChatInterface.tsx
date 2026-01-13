"use client";

import { useState, useEffect, useRef } from 'react';
import { Send, Loader2 } from 'lucide-react';
import ChatMessage from './ChatMessage';
import { scientificChatApi, ChatMessage as ChatMessageType } from '@/lib/api';

interface ChatInterfaceProps {
    conversationId: string | null;
    sessionId: string;
    onConversationCreated?: (conversationId: string) => void;
}

export default function ChatInterface({
    conversationId,
    sessionId,
    onConversationCreated
}: ChatInterfaceProps) {
    const [messages, setMessages] = useState<ChatMessageType[]>([]);
    const [input, setInput] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const [streamingThinking, setStreamingThinking] = useState('');
    const [currentToolCalls, setCurrentToolCalls] = useState<any[]>([]);
    const [currentToolResults, setCurrentToolResults] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(conversationId);

    const wsRef = useRef<WebSocket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, streamingContent]);

    // Load messages when conversation changes
    useEffect(() => {
        if (activeConversationId) {
            loadMessages();
        }
    }, [activeConversationId]);

    // WebSocket connection
    useEffect(() => {
        const ws = scientificChatApi.connectWebSocket();

        ws.onopen = () => {
            console.log('WebSocket connected');
            setError(null);
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            switch (data.type) {
                case 'conversation_created':
                    setActiveConversationId(data.conversation_id);
                    if (onConversationCreated) {
                        onConversationCreated(data.conversation_id);
                    }
                    break;

                case 'content_delta':
                    setStreamingContent(prev => prev + data.delta);
                    break;

                case 'thinking':
                    setStreamingThinking(data.thinking);
                    break;

                case 'tool_call':
                    setCurrentToolCalls(prev => [...prev, data.tool]);
                    break;

                case 'tool_result':
                    setCurrentToolResults(prev => [...prev, data.result]);
                    break;

                case 'message_complete':
                    // Reload messages from database
                    loadMessages();
                    setIsStreaming(false);
                    setStreamingContent('');
                    setStreamingThinking('');
                    setCurrentToolCalls([]);
                    setCurrentToolResults([]);
                    break;

                case 'error':
                    setError(data.error);
                    setIsStreaming(false);
                    setStreamingContent('');
                    setStreamingThinking('');
                    setCurrentToolCalls([]);
                    setCurrentToolResults([]);
                    break;

                default:
                    console.log('Unknown message type:', data.type);
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            setError('Connection error. Please refresh the page.');
        };

        ws.onclose = () => {
            console.log('WebSocket disconnected');
        };

        wsRef.current = ws;

        return () => {
            ws.close();
        };
    }, []);

    const loadMessages = async () => {
        if (!activeConversationId) return;

        try {
            const msgs = await scientificChatApi.getMessages(activeConversationId);
            setMessages(msgs);
        } catch (err) {
            console.error('Failed to load messages:', err);
            setError('Failed to load message history');
        }
    };

    const sendMessage = () => {
        if (!input.trim() || isStreaming || !wsRef.current) return;

        setIsStreaming(true);
        setError(null);

        wsRef.current.send(JSON.stringify({
            type: 'message',
            conversation_id: activeConversationId,
            content: input,
            session_id: sessionId
        }));

        setInput('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-900 rounded-lg border border-gray-700">
            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && !isStreaming && (
                    <div className="text-center text-gray-400 mt-8">
                        <h3 className="text-xl font-semibold mb-2">Scientific Research Assistant</h3>
                        <p className="text-sm">Ask me anything about scientific data, research, or computation.</p>
                        <p className="text-xs mt-2">I have access to 140+ scientific tools and databases.</p>
                    </div>
                )}

                {messages.map((msg) => (
                    <ChatMessage key={msg.id} message={msg} />
                ))}

                {/* Streaming Message */}
                {isStreaming && (
                    <div className="flex gap-3 justify-start">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-sm font-semibold">AI</span>
                        </div>

                        <div className="max-w-[80%] rounded-lg p-4 bg-gray-800">
                            {/* Thinking Block */}
                            {streamingThinking && (
                                <div className="mb-3 p-2 bg-purple-900/30 rounded border border-purple-600/30">
                                    <div className="flex items-center gap-2 text-purple-300 text-xs font-medium mb-1">
                                        <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
                                        Thinking
                                    </div>
                                    <p className="text-sm text-gray-300">{streamingThinking}</p>
                                </div>
                            )}

                            {/* Tool Calls */}
                            {currentToolCalls.map((tool, idx) => (
                                <div key={idx} className="mb-2 p-2 bg-blue-900/30 rounded border border-blue-600/30">
                                    <div className="flex items-center gap-2 text-blue-300 text-xs font-medium mb-1">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        Calling tool: {tool.name}
                                    </div>
                                    <pre className="text-xs text-gray-400 overflow-x-auto">
                                        {JSON.stringify(tool.input, null, 2)}
                                    </pre>
                                </div>
                            ))}

                            {/* Tool Results */}
                            {currentToolResults.map((result, idx) => (
                                <div
                                    key={idx}
                                    className={`mb-2 p-2 rounded border ${
                                        result.success
                                            ? 'bg-green-900/30 border-green-600/30'
                                            : 'bg-red-900/30 border-red-600/30'
                                    }`}
                                >
                                    <div className={`flex items-center gap-2 text-xs font-medium mb-1 ${
                                        result.success ? 'text-green-300' : 'text-red-300'
                                    }`}>
                                        {result.success ? '✓' : '✗'} Tool result
                                    </div>
                                    <p className="text-sm text-gray-300 whitespace-pre-wrap">
                                        {result.output || result.error}
                                    </p>
                                </div>
                            ))}

                            {/* Streaming Content */}
                            {streamingContent && (
                                <div className="prose prose-invert prose-sm max-w-none">
                                    <p className="whitespace-pre-wrap">{streamingContent}<span className="animate-pulse">|</span></p>
                                </div>
                            )}

                            {!streamingContent && currentToolCalls.length === 0 && (
                                <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                            )}
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="p-4 bg-red-900/30 border border-red-600/30 rounded-lg">
                        <p className="text-red-300 text-sm">{error}</p>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-gray-700 bg-gray-800/50">
                <div className="flex gap-2">
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about scientific data, research papers, or run computations..."
                        disabled={isStreaming}
                        className="flex-1 p-3 rounded-lg bg-gray-900 border border-gray-600 text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        rows={3}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!input.trim() || isStreaming}
                        className="px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center"
                    >
                        {isStreaming ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
                    </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                    Press Enter to send • Shift+Enter for new line
                </p>
            </div>
        </div>
    );
}
