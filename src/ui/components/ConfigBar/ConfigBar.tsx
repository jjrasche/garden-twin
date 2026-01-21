import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from './ChatMessage';
import { useGardenStore } from '../../store/gardenStore';
import {
  generateGardenConfig,
  type ChatMessage as ChatMessageType,
} from '../../services/aiConfig';

export function ConfigBar() {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const setGarden = useGardenStore((state) => state.setGarden);
  const setPlan = useGardenStore((state) => state.setPlan);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessageType = {
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      // Generate garden config from AI
      const config = await generateGardenConfig([...messages, userMessage]);

      // Update store with new garden and plan
      setGarden(config.garden);
      setPlan(config.plan);

      // Add success message
      const successMessage: ChatMessageType = {
        role: 'assistant',
        content: `Garden plan created! ${config.plan.plantings.length} plants planned across ${config.garden.grid.total_subcells} subcells.`,
      };

      setMessages((prev) => [...prev, successMessage]);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to generate garden plan';
      setError(errorMessage);

      const errorResponse: ChatMessageType = {
        role: 'assistant',
        content: `Error: ${errorMessage}. Please try again with different requirements.`,
      };

      setMessages((prev) => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 border-b border-gray-700 h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-8">
            <p className="text-sm">
              Describe your garden plan and I'll help you create it.
            </p>
            <p className="text-xs mt-2 text-gray-500">
              Example: "10×10 ft garden in Boston, plant 20 corn and 10 tomatoes in May"
            </p>
          </div>
        )}
        {messages.map((message, index) => (
          <ChatMessage key={index} message={message} />
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 text-white rounded-lg px-4 py-2">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-700">
        {error && (
          <div className="mb-2 p-2 bg-red-900/30 border border-red-700 rounded text-red-200 text-xs">
            {error}
          </div>
        )}
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your garden plan..."
            className="flex-1 bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500 text-sm"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {isLoading ? 'Generating...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}
