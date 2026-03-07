import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, X, Loader2, Sparkles, BrainCircuit } from 'lucide-react';
import Markdown from 'react-markdown';
import { analyzePerformance as analyzeWithGemini } from '../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  model?: 'gemini' | 'openai';
}

export default function ChatBot({ performanceData }: { performanceData: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'gemini' | 'openai'>('gemini');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I am your Plant Performance Analyst. How can I help you today? I can analyze daily, monthly, or annual performance trends.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg, model: selectedModel }]);
    setIsLoading(true);

    try {
      let response = '';
      if (selectedModel === 'gemini') {
        response = await analyzeWithGemini(performanceData, userMsg) || 'No response from Gemini';
      } else {
        const res = await fetch('/api/ai/openai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: performanceData, query: userMsg })
        });
        
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to fetch from OpenAI');
        }
        
        const data = await res.json();
        response = data.text || 'No response from OpenAI';
      }
      
      setMessages(prev => [...prev, { role: 'assistant', content: response, model: selectedModel }]);
    } catch (error: any) {
      console.error("Chat Error:", error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `I encountered an error while processing your request with ${selectedModel.toUpperCase()}: ${error.message || 'Unknown error'}. Please try again.` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-emerald-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-emerald-700 transition-all z-50"
      >
        <Bot size={28} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 border border-slate-200"
          >
            <div className="bg-emerald-600 p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Bot size={20} />
                <span className="font-semibold">Performance Analyst AI</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex bg-white/10 p-1 rounded-lg">
                  <button 
                    onClick={() => setSelectedModel('gemini')}
                    className={cn(
                      "px-2 py-1 text-[10px] font-bold rounded flex items-center gap-1 transition-all",
                      selectedModel === 'gemini' ? "bg-white text-emerald-600" : "text-white/70 hover:text-white"
                    )}
                  >
                    <Sparkles size={10} />
                    GEMINI
                  </button>
                  <button 
                    onClick={() => setSelectedModel('openai')}
                    className={cn(
                      "px-2 py-1 text-[10px] font-bold rounded flex items-center gap-1 transition-all",
                      selectedModel === 'openai' ? "bg-white text-emerald-600" : "text-white/70 hover:text-white"
                    )}
                  >
                    <BrainCircuit size={10} />
                    OPENAI
                  </button>
                </div>
                <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex flex-col", msg.role === 'user' ? "items-end" : "items-start")}>
                  {msg.model && (
                    <span className="text-[9px] font-black text-slate-400 mb-1 px-2 uppercase tracking-tighter">
                      {msg.model}
                    </span>
                  )}
                  <div className={cn(
                    "max-w-[85%] p-3 rounded-2xl text-sm shadow-sm",
                    msg.role === 'user' ? "bg-emerald-600 text-white rounded-tr-none" : "bg-white text-slate-800 rounded-tl-none border border-slate-200"
                  )}>
                    <div className="prose prose-sm max-w-none prose-p:leading-relaxed">
                      <Markdown>
                        {msg.content}
                      </Markdown>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white p-3 rounded-2xl border border-slate-200 flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin text-emerald-600" />
                    <span className="text-xs text-slate-500 italic">Analyzing data...</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-white border-t border-slate-100 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about performance..."
                className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <button
                onClick={handleSend}
                disabled={isLoading}
                className="bg-emerald-600 text-white p-2 rounded-xl hover:bg-emerald-700 disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
