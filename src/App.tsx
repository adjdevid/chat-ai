import React, { useState, useEffect, useRef } from 'react';
import {
  Dataset,
  Message,
  ChatSession,
  TelemetryMetrics,
  ChartConfig,
  ChatMode,
} from './types';
import { PRESET_DATASETS } from './data/presetDatasets';
import { buildDatasetContextSummary } from './utils/dataProcessor';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { ChatPanel } from './components/ChatPanel';
import { DataStudio } from './components/DataStudio';
import { Visualizer } from './components/Visualizer';
import { DeepAuditPanel } from './components/DeepAuditPanel';
import { DatasetUploadModal } from './components/DatasetUploadModal';
import { SettingsModal } from './components/SettingsModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { useAuth } from './context/AuthContext';
import {
  saveSessionToFirestore,
  deleteSessionFromFirestore,
  subscribeUserSessions,
  syncLocalSessionsToFirestore,
} from './utils/chatFirestore';
import { Zap, ShieldAlert, User as UserIcon, X } from 'lucide-react';

const STORAGE_KEY_SESSIONS = 'adjdev_ai_chat_sessions_v2';
const STORAGE_KEY_DATASETS = 'adjdev_ai_custom_datasets_v2';

export default function App() {
  const {
    user,
    profile,
    checkHasQuota,
    recordTokenUsage,
    syncServerQuota,
    deviceId,
    signInWithGoogle,
    guestTokensUsed,
    guestDailyLimit,
    isAuthPending,
    authError,
    clearAuthError,
  } = useAuth();
  const [showQuotaModal, setShowQuotaModal] = useState(false);

  // Datasets State
  const [datasets, setDatasets] = useState<Dataset[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DATASETS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return [...PRESET_DATASETS, ...parsed];
      }
    } catch (e) {
      console.error(e);
    }
    return PRESET_DATASETS;
  });

  const [activeDataset, setActiveDataset] = useState<Dataset>(PRESET_DATASETS[0]);
  const [chatMode, setChatMode] = useState<ChatMode>('general');

  // Chat Sessions State
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SESSIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    const initialSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: 'Percakapan AI Umum',
      messages: [],
      activeDatasetId: PRESET_DATASETS[0].id,
      mode: 'general',
      createdAt: new Date().toISOString(),
      updatedAt: Date.now(),
    };
    return [initialSession];
  });

  const [currentSessionId, setCurrentSessionId] = useState<string>(
    sessions[0]?.id || `session-${Date.now()}`
  );

  // Navigation & UI States
  const [activeTab, setActiveTab] = useState<'chat' | 'datagrid' | 'visualizer' | 'deepaudit'>('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  // Telemetry Metrics
  const [telemetry, setTelemetry] = useState<TelemetryMetrics>({
    totalQueries: 0,
    avgTokensPerSec: 112.5,
    fastestLatencyMs: 145,
    totalTokensGenerated: 0,
    activeModel: 'gemini-3.1-flash-lite',
    status: 'optimal',
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  // Current Active Session
  const currentSession = sessions.find((s) => s.id === currentSessionId) || sessions[0];

  // Save sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
    } catch (e) {
      console.error(e);
    }
  }, [sessions]);

  // Real-time Firestore session synchronization when user is logged in
  useEffect(() => {
    if (!user?.uid) return;

    let isMounted = true;

    const unsubscribe = subscribeUserSessions(user.uid, (remoteSessions) => {
      if (!isMounted) return;

      if (remoteSessions.length > 0) {
        setSessions(remoteSessions);
        setCurrentSessionId((prevId) => {
          if (remoteSessions.some((s) => s.id === prevId)) return prevId;
          return remoteSessions[0].id;
        });
      } else {
        // Upload local offline sessions to Firestore if user logs in for the first time
        syncLocalSessionsToFirestore(user.uid, sessions).then(() => {
          if (sessions.length > 0 && isMounted) {
            sessions.forEach((s) => saveSessionToFirestore(user.uid, s));
          }
        });
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [user?.uid]);

  // Sync active dataset and chatMode when switching sessions
  useEffect(() => {
    if (currentSession) {
      if (currentSession.activeDatasetId) {
        const matched = datasets.find((d) => d.id === currentSession.activeDatasetId);
        if (matched && matched.id !== activeDataset.id) {
          setActiveDataset(matched);
        }
      }
      if (currentSession.mode) {
        setChatMode(currentSession.mode);
      }
    }
  }, [currentSessionId]);

  // Handle Mode Toggle
  const handleToggleChatMode = (mode: ChatMode) => {
    setChatMode(mode);
    setSessions((prev) => {
      const next = prev.map((s) => (s.id === currentSessionId ? { ...s, mode } : s));
      const updated = next.find((s) => s.id === currentSessionId);
      if (updated && user?.uid) {
        saveSessionToFirestore(user.uid, updated);
      }
      return next;
    });
  };

  // Add new dataset from modal
  const handleSelectDataset = (dataset: Dataset) => {
    if (!datasets.some((d) => d.id === dataset.id)) {
      const updated = [dataset, ...datasets];
      setDatasets(updated);
      try {
        const customOnes = updated.filter((d) => !PRESET_DATASETS.some((p) => p.id === d.id));
        localStorage.setItem(STORAGE_KEY_DATASETS, JSON.stringify(customOnes));
      } catch (e) {
        console.error(e);
      }
    }
    setActiveDataset(dataset);

    // Update active dataset on current session
    setSessions((prev) => {
      const next = prev.map((s) =>
        s.id === currentSessionId ? { ...s, activeDatasetId: dataset.id } : s
      );
      const updated = next.find((s) => s.id === currentSessionId);
      if (updated && user?.uid) {
        saveSessionToFirestore(user.uid, updated);
      }
      return next;
    });
  };

  // Create New Session
  const handleNewSession = () => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: chatMode === 'general' ? `Chat Umum #${sessions.length + 1}` : `Analisis Data #${sessions.length + 1}`,
      messages: [],
      activeDatasetId: activeDataset.id,
      mode: chatMode,
      createdAt: new Date().toISOString(),
      updatedAt: Date.now(),
    };
    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setActiveTab('chat');
    if (user?.uid) {
      saveSessionToFirestore(user.uid, newSession);
    }
  };

  // Delete Session
  const handleDeleteSession = (id: string) => {
    if (sessions.length <= 1) return;
    const remaining = sessions.filter((s) => s.id !== id);
    setSessions(remaining);
    if (currentSessionId === id) {
      setCurrentSessionId(remaining[0].id);
    }
    if (user?.uid) {
      deleteSessionFromFirestore(user.uid, id);
    }
  };

  // Clear current chat
  const handleClearChat = () => {
    setSessions((prev) => {
      const next = prev.map((s) =>
        s.id === currentSessionId ? { ...s, messages: [] } : s
      );
      const updated = next.find((s) => s.id === currentSessionId);
      if (updated && user?.uid) {
        saveSessionToFirestore(user.uid, updated);
      }
      return next;
    });
  };

  // Stop Streaming
  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  };

  // Send Message with SSE Streaming
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isStreaming) return;

    // Check token quota before proceeding
    if (!checkHasQuota(150)) {
      setShowQuotaModal(true);
      return;
    }

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString(),
    };

    const assistantPlaceholderId = `msg-assistant-${Date.now()}`;
    const assistantMessage: Message = {
      id: assistantPlaceholderId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString(),
      isStreaming: true,
    };

    // Update session title if first message
    const isFirstMessage = currentSession.messages.length === 0;
    const newTitle = isFirstMessage
      ? text.length > 28
        ? text.slice(0, 28) + '...'
        : text
      : currentSession.title;

    const updatedMessages = [...currentSession.messages, userMessage, assistantMessage];

    const initialUpdatedSession: ChatSession = {
      ...currentSession,
      title: newTitle,
      messages: updatedMessages,
      updatedAt: Date.now(),
    };

    setSessions((prev) =>
      prev.map((s) => (s.id === currentSessionId ? initialUpdatedSession : s))
    );

    if (user?.uid) {
      saveSessionToFirestore(user.uid, initialUpdatedSession);
    }

    setIsStreaming(true);
    abortControllerRef.current = new AbortController();

    const datasetSummary = chatMode === 'analytics' ? buildDatasetContextSummary(activeDataset) : '';

    let accumulatedText = '';
    let streamStats: any = null;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': deviceId,
          ...(user?.uid ? { 'x-user-id': user.uid } : {}),
        },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          messages: updatedMessages
            .filter((m) => m.id !== assistantPlaceholderId)
            .map((m) => ({ role: m.role, content: m.content })),
          datasetSummary,
          mode: chatMode,
          userId: user?.uid,
          deviceId,
        }),
      });

      if (response.status === 429) {
        const errJson = await response.json().catch(() => ({}));
        setShowQuotaModal(true);
        throw new Error(errJson.message || 'Kuota token harian Anda telah habis.');
      }

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Response body is missing.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const rawChunk = decoder.decode(value, { stream: true });
        const lines = rawChunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (!dataStr) continue;

            try {
              const data = JSON.parse(dataStr);
              if (data.error) {
                accumulatedText += `\n\n⚠️ **Terjadi Kesalahan**: ${data.error}`;
              } else if (data.text) {
                accumulatedText += data.text;
              } else if (data.done && data.stats) {
                streamStats = data.stats;
                // Update Global Telemetry
                setTelemetry((prev) => ({
                  ...prev,
                  totalQueries: prev.totalQueries + 1,
                  totalTokensGenerated: prev.totalTokensGenerated + (data.stats.tokenCount || 0),
                  avgTokensPerSec:
                    data.stats.tokensPerSec > 0
                      ? Math.round(((prev.avgTokensPerSec + data.stats.tokensPerSec) / 2) * 10) / 10
                      : prev.avgTokensPerSec,
                  fastestLatencyMs:
                    prev.fastestLatencyMs === 0 || data.stats.latencyMs < prev.fastestLatencyMs
                      ? data.stats.latencyMs
                      : prev.fastestLatencyMs,
                }));
                // Refresh quota counter immediately
                syncServerQuota();
              }

              // Detect embedded chart recommendations from assistant text if in analytics mode
              const detectedCharts: ChartConfig[] = [];
              if (chatMode === 'analytics') {
                const numCols = activeDataset.columns.filter((c) => c.type === 'number').map((c) => c.name);
                const textLower = accumulatedText.toLowerCase();

                if (
                  (textLower.includes('grafik') || textLower.includes('chart') || textLower.includes('visual')) &&
                  numCols.length > 0 &&
                  !textLower.includes('tidak merekomendasikan grafik')
                ) {
                  detectedCharts.push({
                    type: textLower.includes('area')
                      ? 'area'
                      : textLower.includes('line') || textLower.includes('tren')
                      ? 'line'
                      : textLower.includes('pie') || textLower.includes('proporsi')
                      ? 'pie'
                      : 'bar',
                    title: `Visualisasi Otomatis: ${numCols[0]} vs ${activeDataset.columns[0]?.name}`,
                    xAxisKey: activeDataset.columns[0]?.name,
                    yAxisKey: numCols.slice(0, 2),
                  });
                }
              }

              // Update state in real time
              setSessions((prev) =>
                prev.map((s) => {
                  if (s.id !== currentSessionId) return s;
                  return {
                    ...s,
                    messages: s.messages.map((m) =>
                      m.id === assistantPlaceholderId
                        ? {
                            ...m,
                            content: accumulatedText,
                            stats: streamStats || m.stats,
                            charts: detectedCharts.length > 0 ? detectedCharts : undefined,
                            isStreaming: !streamStats,
                          }
                        : m
                    ),
                  };
                })
              );
            } catch (e) {
              console.warn('Chunk JSON parse error', e);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Stream aborted by user');
      } else {
        console.error('Streaming request failed', err);
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id !== currentSessionId) return s;
            return {
              ...s,
              messages: s.messages.map((m) =>
                m.id === assistantPlaceholderId
                  ? {
                      ...m,
                      content:
                        m.content +
                        `\n\n⚠️ **Koneksi Terputus**: ${err?.message || 'Gagal menyambung ke server Gemini Flash Lite.'}`,
                      isStreaming: false,
                    }
                  : m
              ),
            };
          })
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
      await syncServerQuota();
      if (user?.uid) {
        setSessions((prev) => {
          const finalSession = prev.find((s) => s.id === currentSessionId);
          if (finalSession && user?.uid) {
            saveSessionToFirestore(user.uid, finalSession);
          }
          return prev;
        });
      }
    }
  };

  const handleAskAIAboutData = (prompt: string) => {
    setChatMode('analytics');
    setActiveTab('chat');
    handleSendMessage(prompt);
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-full overflow-hidden bg-slate-50 font-sans text-slate-900 relative">
      {/* Auth Error Banner / Toast */}
      {authError && (
        <div className="absolute top-18 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 shadow-xl max-w-sm text-xs animate-in fade-in slide-in-from-top-2">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="flex-1 font-medium">{authError}</div>
          <button
            onClick={clearAuthError}
            className="p-1 rounded-lg hover:bg-amber-100 text-amber-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        datasets={datasets}
        activeDataset={activeDataset}
        onSelectDataset={handleSelectDataset}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarOpen={isSidebarOpen}
        tokensPerSecMetric={telemetry.avgTokensPerSec}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative pb-14 md:pb-0">
        {/* Left Sidebar */}
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={(id) => setCurrentSessionId(id)}
          onNewSession={handleNewSession}
          onDeleteSession={handleDeleteSession}
          datasets={datasets}
          activeDataset={activeDataset}
          onSelectDataset={handleSelectDataset}
          onOpenUploadModal={() => setIsUploadModalOpen(true)}
          onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
          telemetry={telemetry}
        />

        {/* Dynamic View Panel */}
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white relative">
          {activeTab === 'chat' && (
            <ChatPanel
              messages={currentSession.messages}
              activeDataset={activeDataset}
              isStreaming={isStreaming}
              chatMode={chatMode}
              onToggleChatMode={handleToggleChatMode}
              onSendMessage={handleSendMessage}
              onStopStreaming={handleStopStreaming}
              onClearChat={handleClearChat}
              onOpenUploadModal={() => setIsUploadModalOpen(true)}
            />
          )}

          {activeTab === 'datagrid' && (
            <DataStudio
              dataset={activeDataset}
              onAskAIAboutData={handleAskAIAboutData}
            />
          )}

          {activeTab === 'visualizer' && (
            <Visualizer
              dataset={activeDataset}
              onAskAIAboutData={handleAskAIAboutData}
            />
          )}

          {activeTab === 'deepaudit' && (
            <DeepAuditPanel
              dataset={activeDataset}
              onOpenInChat={handleAskAIAboutData}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        datasets={datasets}
        activeDataset={activeDataset}
        onSelectDataset={handleSelectDataset}
        onOpenUploadModal={() => setIsUploadModalOpen(true)}
      />

      {/* Upload Modal */}
      <DatasetUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSelectDataset={handleSelectDataset}
      />

      {/* Quota Limit Exceeded Modal */}
      {showQuotaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowQuotaModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 w-fit">
              <Zap className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-slate-900">
                {user ? 'Batas Token Harian Tercapai' : 'Batas Token Tamu Tercapai'}
              </h3>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                {user ? (
                  <>
                    Akun Google Anda telah menggunakan batas harian <strong>{profile?.dailyLimit.toLocaleString() || '50.000'} token</strong>. Kuota Anda akan tereset otomatis besok.
                  </>
                ) : (
                  <>
                    Anda telah mencapai batas mode tamu (<strong>{guestDailyLimit.toLocaleString()} token/hari</strong>). Silakan masuk dengan akun Google untuk mendapatkan kuota hingga <strong>50.000 token/hari</strong>!
                  </>
                )}
              </p>
            </div>

            {/* Current status bar */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
              <div className="flex justify-between font-semibold text-slate-700">
                <span>Status Kuota Hari Ini:</span>
                <span className="text-rose-600 font-mono font-bold">100% Terpakai</span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 w-full" />
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              {!user ? (
                <button
                  onClick={async () => {
                    setShowQuotaModal(false);
                    await signInWithGoogle();
                  }}
                  disabled={isAuthPending}
                  className="w-full py-3 rounded-xl text-xs font-extrabold bg-gradient-to-r from-cyan-600 to-indigo-600 hover:opacity-95 disabled:opacity-50 text-white transition shadow-sm flex items-center justify-center gap-2"
                >
                  <UserIcon className={`w-4 h-4 ${isAuthPending ? 'animate-spin' : ''}`} />
                  {isAuthPending ? 'Menghubungkan...' : 'Masuk dengan Google Sekarang'}
                </button>
              ) : (
                <button
                  onClick={() => setShowQuotaModal(false)}
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition"
                >
                  Mengerti
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
