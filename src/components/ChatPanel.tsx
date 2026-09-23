import React, { useState, useRef, useEffect } from 'react';
import {
  Message,
  Dataset,
  ChatMode,
  ChartConfig,
} from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { DynamicChartRenderer } from './DynamicChartRenderer';
import {
  Send,
  Sparkles,
  Paperclip,
  RotateCcw,
  Database,
  StopCircle,
  Copy,
  Check,
  Cpu,
  MessageCircle,
  BarChart2,
  HelpCircle,
  Code2,
  FileText,
  Lightbulb,
} from 'lucide-react';

interface ChatPanelProps {
  messages: Message[];
  activeDataset: Dataset;
  isStreaming: boolean;
  chatMode: ChatMode;
  onToggleChatMode: (mode: ChatMode) => void;
  onSendMessage: (text: string) => void;
  onStopStreaming: () => void;
  onClearChat: () => void;
  onOpenUploadModal: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  activeDataset,
  isStreaming,
  chatMode,
  onToggleChatMode,
  onSendMessage,
  onStopStreaming,
  onClearChat,
  onOpenUploadModal,
}) => {
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || isStreaming) return;
    onSendMessage(inputText.trim());
    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
  };

  const copyMessage = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Prompts for General Chat vs Data Analytics
  const generalPrompts = [
    {
      label: '💡 Brainstorming Ide & Solusi',
      prompt: 'Bantu saya brainstorming strategi pengembangan produk digital yang cepat dan efisien.',
      icon: Lightbulb,
    },
    {
      label: '💻 Bantuan Koding & Arsitektur',
      prompt: 'Buatkan contoh struktur API RESTful modern dengan TypeScript dan best practice error handling.',
      icon: Code2,
    },
    {
      label: '📝 Penulisan Laporan & Email',
      prompt: 'Tuliskan draft ringkasan eksekutif profesional untuk rapat pimpinan kuartal ini.',
      icon: FileText,
    },
    {
      label: '❓ Tanya Jawab & Konsep Bebas',
      prompt: 'Jelaskan bagaimana model AI Flash Lite mengoptimalkan latensi tanpa mengorbankan kualitas.',
      icon: HelpCircle,
    },
  ];

  const analyticsPrompts = [
    {
      label: '🔍 Deteksi Anomali & Outlier',
      prompt: `Analisis data '${activeDataset.name}', cari nilai anomali/outlier yang mencolok dan jelaskan penyebab serta dampaknya.`,
      icon: Sparkles,
    },
    {
      label: '📈 Tren & Proyeksi Pertumbuhan',
      prompt: `Berdasarkan metrik pada '${activeDataset.name}', buat analisis tren historis dan estimasi proyeksi ke depan.`,
      icon: BarChart2,
    },
    {
      label: '📊 Rekomendasi Visualisasi',
      prompt: `Berikan rekomendasi grafik visual paling efektif untuk dataset '${activeDataset.name}' lengkap dengan metrik kunci sumbu X dan Y.`,
      icon: BarChart2,
    },
    {
      label: '⚡ Buatkan Query SQL & Python',
      prompt: `Tuliskan query SQL analitis dan kode script Python pandas untuk mengolah dataset '${activeDataset.name}'.`,
      icon: Code2,
    },
  ];

  const activePrompts = chatMode === 'general' ? generalPrompts : analyticsPrompts;

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-white text-slate-800 overflow-hidden">
      {/* Top Context & Mode Switcher Bar */}
      <div className="px-4 py-2.5 shrink-0 bg-slate-50/90 border-b border-slate-200/90 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Mode Selector Toggle */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-slate-200 shadow-2xs">
          <button
            onClick={() => onToggleChatMode('general')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-semibold transition ${
              chatMode === 'general'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Chat Biasa (General AI)</span>
          </button>
          <button
            onClick={() => onToggleChatMode('analytics')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-semibold transition ${
              chatMode === 'analytics'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Analisis Data Real-time</span>
          </button>
        </div>

        {/* Dataset context pill (if analytics mode) */}
        {chatMode === 'analytics' ? (
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="p-1 rounded-md bg-cyan-50 text-cyan-700">
              <Database className="w-3.5 h-3.5" />
            </span>
            <span className="text-slate-500 truncate">
              Dataset:{' '}
              <strong className="text-slate-800 font-semibold">{activeDataset.name}</strong>
            </span>
          </div>
        ) : (
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Mode Percakapan Umum & Koding Bebas
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={onClearChat}
            className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 transition px-2.5 py-1 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 shadow-2xs font-medium"
          >
            <RotateCcw className="w-3 h-3" /> Bersihkan Chat
          </button>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 lg:p-6 space-y-6 bg-slate-50/80">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center max-w-xl mx-auto space-y-5">
            <div className="relative">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-cyan-600 to-indigo-600 p-0.5 shadow-xl shadow-cyan-600/15">
                <div className="w-full h-full bg-white rounded-[22px] flex items-center justify-center">
                  <Cpu className="w-8 h-8 text-cyan-600" />
                </div>
              </div>
              <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-cyan-600 text-white shadow-xs">
                FLASH LITE
              </span>
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {chatMode === 'general' ? 'ADJDEV AI Chat Assistant' : 'ADJDEV Real-time Data Analytics'}
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed max-w-md font-medium">
                {chatMode === 'general'
                  ? 'Asisten AI pintar serbaguna dengan respon super cepat untuk tanya jawab umum, pembuatan kode, brainstorming, dan analisis bebas.'
                  : `Mesin komputasi data cerdas berbasis Flash Lite yang terhubung langsung dengan dataset '${activeDataset.name}'.`}
              </p>
            </div>

            {/* Quick Prompt Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full pt-2">
              {activePrompts.map((q, idx) => {
                const Icon = q.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => onSendMessage(q.prompt)}
                    className="text-left p-3.5 rounded-2xl border border-slate-200 bg-white hover:bg-cyan-50/60 hover:border-cyan-300 text-xs text-slate-800 transition-all shadow-2xs group"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 group-hover:text-cyan-800">
                      <Icon className="w-3.5 h-3.5 text-cyan-600" />
                      <span>{q.label}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {q.prompt}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isUser = message.role === 'user';
            return (
              <div
                key={message.id}
                className={`flex gap-3 max-w-4xl mx-auto ${
                  isUser ? 'justify-end' : 'justify-start'
                }`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 p-0.5 shrink-0 shadow-xs mt-1">
                    <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center">
                      <Cpu className="w-4 h-4 text-cyan-600" />
                    </div>
                  </div>
                )}

                <div
                  className={`relative group rounded-3xl p-4 lg:p-5 max-w-[88%] sm:max-w-[82%] shadow-xs ${
                    isUser
                      ? 'bg-gradient-to-r from-cyan-700 via-cyan-800 to-indigo-800 text-white font-medium rounded-tr-none'
                      : 'bg-white border border-slate-200/90 text-slate-900 rounded-tl-none ring-1 ring-slate-100/80'
                  }`}
                >
                  {/* Assistant Header & Token Telemetry Stats */}
                  {!isUser && (
                    <div className="flex items-center justify-between gap-4 pb-2.5 mb-2.5 border-b border-slate-100 text-[11px] text-slate-400">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900">ADJDEV AI</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-cyan-50 text-cyan-800 border border-cyan-200">
                          Flash Lite
                        </span>
                      </div>

                      {message.stats && (
                        <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400">
                          {message.stats.latencyMs && (
                            <span className="text-cyan-700 font-bold">
                              ⚡ {message.stats.latencyMs}ms TTFT
                            </span>
                          )}
                          {message.stats.tokensPerSec && (
                            <span className="text-indigo-600 font-bold">
                              • {message.stats.tokensPerSec} tok/s
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Message Content */}
                  {isUser ? (
                    <p className="text-sm whitespace-pre-wrap leading-relaxed text-white font-medium">{message.content}</p>
                  ) : (
                    <div className="text-sm text-slate-800">
                      <MarkdownRenderer content={message.content} />

                      {/* Embedded Mini-Charts */}
                      {message.charts && message.charts.length > 0 && (
                        <div className="mt-4 space-y-3">
                          {message.charts.map((c, i) => (
                            <DynamicChartRenderer
                              key={i}
                              config={c}
                              data={activeDataset.data}
                              height={240}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Copy Button */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => copyMessage(message.content, message.id)}
                      className={`p-1.5 rounded-lg transition ${
                        isUser
                          ? 'bg-cyan-800/80 hover:bg-cyan-900 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                      }`}
                      title="Salin Pesan"
                    >
                      {copiedId === message.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Streaming Indicator */}
        {isStreaming && (
          <div className="flex items-center gap-3 max-w-4xl mx-auto pl-11">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-cyan-200 text-xs text-cyan-800 shadow-2xs animate-pulse">
              <Sparkles className="w-3.5 h-3.5 animate-spin text-cyan-600" />
              <span>ADJDEV Flash Lite sedang merespons...</span>
            </div>
            <button
              onClick={onStopStreaming}
              className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 px-2.5 py-1 rounded-xl bg-rose-50 border border-rose-200"
            >
              <StopCircle className="w-3.5 h-3.5" /> Berhenti
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 lg:p-4 shrink-0 bg-white border-t border-slate-200">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative">
          <div className="relative flex items-end rounded-3xl border border-slate-200 bg-slate-50/80 p-2 focus-within:border-cyan-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-cyan-500/10 transition-all shadow-xs">
            {/* Attachment Button */}
            <button
              type="button"
              onClick={onOpenUploadModal}
              title="Unggah / Ganti Dataset"
              className="p-2 text-slate-400 hover:text-cyan-700 rounded-2xl hover:bg-slate-100 transition mb-0.5"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
              placeholder={
                chatMode === 'general'
                  ? 'Tanyakan apapun pada ADJDEV AI (General Chat, Coding, Ide)...'
                  : `Tanyakan analitik data '${activeDataset.name}'...`
              }
              className="flex-1 max-h-36 resize-none bg-transparent px-3 py-2 text-xs lg:text-sm text-slate-900 placeholder-slate-400 focus:outline-none scrollbar-none"
            />

            {/* Send / Stop Button */}
            {isStreaming ? (
              <button
                type="button"
                onClick={onStopStreaming}
                className="p-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white transition shadow-sm shrink-0 mb-0.5"
              >
                <StopCircle className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="p-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-30 disabled:hover:bg-cyan-600 transition shadow-sm shrink-0 mb-0.5"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-slate-400">
            <span className="hidden sm:inline">Tekan <kbd className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200 text-slate-600 font-mono text-[10px]">Enter</kbd> untuk kirim, <kbd className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200 text-slate-600 font-mono text-[10px]">Shift+Enter</kbd> baris baru</span>
            <span className="text-cyan-700 font-mono font-medium ml-auto">Model: Flash Lite (Ultra Low Latency)</span>
          </div>
        </form>
      </div>
    </div>
  );
};
