import React, { useState } from 'react';
import { Dataset, DeepAnalysisResult } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Lightbulb,
  RefreshCw,
  BarChart,
} from 'lucide-react';
import { DynamicChartRenderer } from './DynamicChartRenderer';

interface DeepAuditPanelProps {
  dataset: Dataset;
  onOpenInChat: (query: string) => void;
}

export const DeepAuditPanel: React.FC<DeepAuditPanelProps> = ({ dataset, onOpenInChat }) => {
  const { deviceId, user, syncServerQuota } = useAuth();
  const [analysis, setAnalysis] = useState<DeepAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [customQuestion, setCustomQuestion] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);

  const runDeepAudit = async (customQ?: string) => {
    setLoading(true);
    setErrorMsg(null);
    const start = Date.now();

    try {
      const response = await fetch('/api/analyze-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': deviceId,
        },
        body: JSON.stringify({
          dataSample: dataset.data.slice(0, 40),
          schema: dataset.columns.map((c) => ({ name: c.name, type: c.type, stats: c.stats })),
          question: customQ || customQuestion || 'Analisis anomali, tren profitabilitas/efisiensi, dan rekomendasi aksi strategis.',
          userId: user?.uid,
          deviceId,
        }),
      });

      if (response.status === 429) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.message || 'Kuota token harian Anda telah habis.');
      }

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const result = await response.json();
      setAnalysis(result);
      setDurationMs(Date.now() - start);
    } catch (err: any) {
      console.error('Deep Audit Failed:', err);
      setErrorMsg(err.message || 'Gagal memproses audit data.');
    } finally {
      setLoading(false);
      await syncServerQuota();
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-4 lg:p-6 text-slate-900 space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-cyan-800 bg-gradient-to-r from-cyan-900 via-indigo-900 to-slate-900 p-6 shadow-md text-white">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/10 text-cyan-200 border border-white/20 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> ADJDEV Flash Lite Deep Core
              </span>
              {durationMs && (
                <span className="text-[11px] font-mono text-cyan-200">
                  ⚡ Selesai dalam <strong className="text-white">{durationMs}ms</strong>
                </span>
              )}
            </div>
            <h1 className="text-xl lg:text-2xl font-black tracking-tight text-white">
              Real-time Intelligence & Deep Audit
            </h1>
            <p className="text-xs lg:text-sm text-cyan-100 max-w-2xl font-medium">
              Audit data otomatis berbasis AI instan untuk mendeteksi anomali, pola tersembunyi, korelasi statistik, dan rekomendasi taktis.
            </p>
          </div>

          <button
            onClick={() => runDeepAudit()}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-xs lg:text-sm font-bold bg-white text-cyan-900 hover:bg-cyan-50 transition shadow-lg disabled:opacity-50 shrink-0"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-700" /> Menganalisis Data...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-cyan-700" /> Mulai AI Deep Audit
              </>
            )}
          </button>
        </div>

        {/* Custom Focus Query Input */}
        <div className="mt-5 pt-4 border-t border-white/15 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              placeholder="Fokus audit khusus (contoh: Identifikasi cluster server dengan latency tinggi / proyeksi laba Q4)..."
              className="w-full pl-4 pr-3 py-2 text-xs bg-white/10 border border-white/20 rounded-xl text-white placeholder-cyan-200/70 focus:outline-none focus:bg-white/20"
              onKeyDown={(e) => e.key === 'Enter' && runDeepAudit()}
            />
          </div>
          <button
            onClick={() => runDeepAudit()}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs bg-white/20 hover:bg-white/30 text-white font-bold border border-white/20 transition flex items-center justify-center gap-1.5"
          >
            Jalankan Audit
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* When no audit has been run yet */}
      {!analysis && !loading && (
        <div className="flex flex-col items-center justify-center p-12 rounded-3xl border border-dashed border-slate-300 bg-white text-center space-y-4 shadow-2xs">
          <div className="p-4 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-700">
            <Sparkles className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Audit Belum Dijalankan</h3>
            <p className="text-xs text-slate-500 max-w-md mt-1 font-medium">
              Klik tombol &quot;Mulai AI Deep Audit&quot; di atas untuk mengekstrak ringkasan eksekutif, KPI kritis, grafik rekomendasi, dan deteksi anomali real-time.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {[
              'Deteksi outlier dan anomali ekstrim',
              'Analisis korelasi metrik utama',
              'Rekomendasi optimasi biaya & pertumbuhan',
            ].map((tag, i) => (
              <button
                key={i}
                onClick={() => {
                  setCustomQuestion(tag);
                  runDeepAudit(tag);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 hover:border-cyan-300 hover:bg-cyan-50/50 hover:text-cyan-900 transition shadow-2xs"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-4 animate-pulse">
          <div className="h-24 bg-white rounded-2xl border border-slate-200"></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="h-28 bg-white rounded-2xl border border-slate-200"></div>
            <div className="h-28 bg-white rounded-2xl border border-slate-200"></div>
            <div className="h-28 bg-white rounded-2xl border border-slate-200"></div>
          </div>
          <div className="h-64 bg-white rounded-2xl border border-slate-200"></div>
        </div>
      )}

      {/* Rendered Deep Audit Results */}
      {analysis && !loading && (
        <div className="space-y-6">
          {/* Executive Summary Card */}
          <div className="p-5 rounded-2xl border border-cyan-200 bg-white shadow-2xs space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-cyan-700" />
              <h3 className="text-sm font-extrabold text-slate-900">{analysis.title || 'Ringkasan Eksekutif ADJDEV'}</h3>
            </div>
            <p className="text-xs lg:text-sm text-slate-800 leading-relaxed font-normal">
              {analysis.executiveSummary}
            </p>
          </div>

          {/* KPI Badges */}
          {analysis.kpis && analysis.kpis.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Key Performance Indicators (KPI)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {analysis.kpis.map((kpi, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-1.5"
                  >
                    <span className="text-[11px] font-bold text-slate-400 uppercase">{kpi.label}</span>
                    <div className="text-xl font-extrabold text-slate-900 font-mono">{kpi.value}</div>
                    <div className="flex items-center gap-1 text-[11px]">
                      <span
                        className={`font-bold ${
                          kpi.status === 'positive'
                            ? 'text-emerald-700'
                            : kpi.status === 'negative'
                            ? 'text-rose-700'
                            : kpi.status === 'warning'
                            ? 'text-amber-700'
                            : 'text-cyan-700'
                        }`}
                      >
                        {kpi.trend}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Core Insights & Recommended Visual */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Insights List */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-4">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <h4 className="text-sm font-extrabold text-slate-900">Temuan & Pola Kunci</h4>
              </div>
              <div className="space-y-3">
                {analysis.insights?.map((ins, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-cyan-900">{ins.title}</span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                        {ins.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">{ins.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Visual Chart */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BarChart className="w-4 h-4 text-cyan-700" />
                    <h4 className="text-sm font-extrabold text-slate-900">Visualisasi Rekomendasi</h4>
                  </div>
                  {analysis.recommendedChart && (
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-cyan-50 text-cyan-800 border border-cyan-200">
                      {analysis.recommendedChart.chartType}
                    </span>
                  )}
                </div>
                {analysis.recommendedChart?.reason && (
                  <p className="text-xs text-slate-500 mb-3 font-medium">{analysis.recommendedChart.reason}</p>
                )}

                {analysis.recommendedChart && (
                  <DynamicChartRenderer
                    config={{
                      type: analysis.recommendedChart.chartType,
                      title: analysis.recommendedChart.title,
                      xAxisKey: analysis.recommendedChart.xAxisKey,
                      yAxisKey: analysis.recommendedChart.yAxisKey,
                    }}
                    data={dataset.data}
                    height={220}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Actionable Recommendations */}
          {analysis.actionableRecommendations && (
            <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h4 className="text-sm font-extrabold text-slate-900">Rekomendasi Aksi Taktis</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {analysis.actionableRecommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5"
                  >
                    <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-800 font-mono text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="text-xs text-slate-800 font-medium leading-relaxed">{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
