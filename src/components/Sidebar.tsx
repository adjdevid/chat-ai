import React, { useState } from 'react';
import { ChatSession, Dataset, TelemetryMetrics } from '../types';
import {
  Plus,
  MessageSquare,
  Trash2,
  Database,
  Zap,
  Check,
  Search,
  MessageCircle,
  ShieldCheck,
  User as UserIcon,
  Settings as SettingsIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  currentSessionId: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  datasets: Dataset[];
  activeDataset: Dataset;
  onSelectDataset: (d: Dataset) => void;
  onOpenUploadModal: () => void;
  onOpenSettingsModal: () => void;
  telemetry: TelemetryMetrics;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  datasets,
  activeDataset,
  onSelectDataset,
  onOpenUploadModal,
  onOpenSettingsModal,
  telemetry,
}) => {
  const { user, profile, signInWithGoogle, guestTokensUsed, guestDailyLimit, isAuthPending } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 w-72 lg:w-64 xl:w-72 bg-white border-r border-slate-200/90 flex flex-col transition-transform duration-200 ease-in-out shadow-xs ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top: New Chat Action & Settings */}
        <div className="p-3.5 border-b border-slate-100 space-y-2">
          <button
            onClick={() => {
              onNewSession();
              if (window.innerWidth < 1024) onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition shadow-sm"
          >
            <Plus className="w-4 h-4" /> Sesi Chat Baru
          </button>

          <button
            onClick={() => {
              onOpenSettingsModal();
              if (window.innerWidth < 1024) onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >
            <SettingsIcon className="w-3.5 h-3.5 text-slate-500" /> Pengaturan Sistem & Akun
          </button>
        </div>

        {/* Middle Scrollable Section: Sessions & Datasets */}
        <div className="flex-1 overflow-y-auto p-3 space-y-5">
          {/* Chat Sessions List */}
          <div>
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-cyan-600" /> Riwayat Chat
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {sessions.length} Sesi
              </span>
            </div>

            {sessions.length > 3 && (
              <div className="relative mb-2">
                <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari sesi..."
                  className="w-full pl-7 pr-2 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:bg-white"
                />
              </div>
            )}

            <div className="space-y-1 max-h-48 overflow-y-auto pr-0.5">
              {filteredSessions.map((s) => {
                const isCurrent = s.id === currentSessionId;
                const isGeneral = s.mode === 'general';
                return (
                  <div
                    key={s.id}
                    className={`group flex items-center justify-between p-2 rounded-xl text-xs transition cursor-pointer ${
                      isCurrent
                        ? 'bg-cyan-50 text-cyan-900 border border-cyan-200 font-semibold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                    onClick={() => {
                      onSelectSession(s.id);
                      if (window.innerWidth < 1024) onClose();
                    }}
                  >
                    <div className="flex items-center gap-2 truncate pr-1">
                      {isGeneral ? (
                        <MessageCircle className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      ) : (
                        <MessageSquare className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                      )}
                      <span className="truncate">{s.title}</span>
                    </div>
                    {sessions.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(s.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition"
                        title="Hapus Sesi"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Datasets Workspace Selector */}
          <div>
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-indigo-600" /> Katalog Dataset
              </span>
              <button
                onClick={onOpenUploadModal}
                className="text-[10px] text-cyan-700 hover:underline flex items-center gap-0.5 font-semibold"
              >
                <Plus className="w-2.5 h-2.5" /> Unggah
              </button>
            </div>

            <div className="space-y-1.5">
              {datasets.map((d) => {
                const isSelected = d.id === activeDataset.id;
                return (
                  <div
                    key={d.id}
                    onClick={() => {
                      onSelectDataset(d);
                      if (window.innerWidth < 1024) onClose();
                    }}
                    className={`p-2.5 rounded-2xl border text-xs cursor-pointer transition flex flex-col justify-between ${
                      isSelected
                        ? 'bg-cyan-50/70 border-cyan-300 text-slate-900 shadow-2xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`font-semibold truncate max-w-[180px] ${
                          isSelected ? 'text-cyan-900' : 'text-slate-800'
                        }`}
                      >
                        {d.name}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-cyan-700 shrink-0" />}
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span>{d.rowCount} baris</span>
                      <span>{d.columns.length} kolom</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom: User Quota & Telemetry */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/80 space-y-2">
          {/* User Account / Token Quota Card */}
          <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-800 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-600" />
                {user ? (user.displayName || 'Akun Google') : 'Mode Tamu'}
              </span>
              <span className="text-[10px] font-mono font-bold text-cyan-700 bg-cyan-50 px-1.5 py-0.5 rounded border border-cyan-100">
                {user ? '50K Tok' : '10K Tok'}
              </span>
            </div>

            <div className="text-[10px] text-slate-500 flex justify-between font-mono">
              <span>Penggunaan Token:</span>
              <span className="font-bold text-slate-900">
                {(user && profile ? profile.tokensUsedToday : guestTokensUsed).toLocaleString()} / {(user && profile ? profile.dailyLimit : guestDailyLimit).toLocaleString()}
              </span>
            </div>

            {!user && (
              <button
                onClick={() => signInWithGoogle()}
                disabled={isAuthPending}
                className="w-full mt-1 py-1.5 rounded-lg text-[11px] font-bold bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white transition flex items-center justify-center gap-1"
              >
                <UserIcon className={`w-3 h-3 ${isAuthPending ? 'animate-spin' : ''}`} />
                {isAuthPending ? 'Menghubungkan...' : 'Login Google (+40K Tok)'}
              </button>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1.5 text-slate-600 font-semibold">
              <Zap className="w-3 h-3 text-cyan-600" /> Telemetri
            </span>
            <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-600 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Optimal
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
            <div className="p-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-slate-400 block text-[9px]">SPEED</span>
              <span className="font-bold text-cyan-900">
                {telemetry.avgTokensPerSec > 0 ? telemetry.avgTokensPerSec.toFixed(1) : '112.5'} t/s
              </span>
            </div>
            <div className="p-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-slate-400 block text-[9px]">LATENCY</span>
              <span className="font-bold text-indigo-900">
                {telemetry.fastestLatencyMs > 0 ? `${telemetry.fastestLatencyMs}ms` : '145ms'}
              </span>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 text-center pt-0.5 font-mono">
            Engine: <strong>Flash Lite Core</strong>
          </div>
        </div>
      </aside>
    </>
  );
};
