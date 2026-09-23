import React, { useState, useMemo } from 'react';
import { Dataset, ChartConfig } from '../types';
import { DynamicChartRenderer } from './DynamicChartRenderer';
import {
  BarChart2,
  LineChart as LineIcon,
  TrendingUp,
  PieChart as PieIcon,
  Sparkles,
  Sliders,
  Check,
  Zap,
} from 'lucide-react';

interface VisualizerProps {
  dataset: Dataset;
  onAskAIAboutData: (prompt: string) => void;
}

export const Visualizer: React.FC<VisualizerProps> = ({ dataset, onAskAIAboutData }) => {
  const numColumns = useMemo(
    () => dataset.columns.filter((c) => c.type === 'number').map((c) => c.name),
    [dataset]
  );
  const allColumns = useMemo(() => dataset.columns.map((c) => c.name), [dataset]);

  // Initial axis selection
  const defaultX = allColumns.length > 0 ? allColumns[0] : '';
  const defaultY = numColumns.length > 0 ? numColumns[0] : allColumns[1] || '';

  const [xAxisKey, setXAxisKey] = useState<string>(defaultX);
  const [yAxisKeys, setYAxisKeys] = useState<string[]>([defaultY]);
  const [chartType, setChartType] = useState<ChartConfig['type']>('area');
  const [chartTitle, setChartTitle] = useState<string>(
    `Tren ${defaultY} Berdasarkan ${defaultX}`
  );

  // Sync if dataset changes
  React.useEffect(() => {
    const x = allColumns.length > 0 ? allColumns[0] : '';
    const y = numColumns.length > 0 ? numColumns[0] : allColumns[1] || '';
    setXAxisKey(x);
    setYAxisKeys([y]);
    setChartTitle(`Analisis ${y} vs ${x}`);
  }, [dataset.id]);

  const toggleYKey = (col: string) => {
    if (yAxisKeys.includes(col)) {
      if (yAxisKeys.length > 1) {
        setYAxisKeys(yAxisKeys.filter((k) => k !== col));
      }
    } else {
      setYAxisKeys([...yAxisKeys, col]);
    }
  };

  const chartConfig: ChartConfig = {
    type: chartType,
    title: chartTitle,
    xAxisKey,
    yAxisKey: yAxisKeys,
    description: `Dataset: ${dataset.name} (${dataset.rowCount} titik data)`,
  };

  // Quick preset templates for current dataset
  const suggestedCharts = useMemo(() => {
    const suggestions: { title: string; type: ChartConfig['type']; x: string; y: string[] }[] = [];
    if (numColumns.length >= 2) {
      suggestions.push({
        title: `Komparasi ${numColumns[0]} & ${numColumns[1]}`,
        type: 'line',
        x: defaultX,
        y: [numColumns[0], numColumns[1]],
      });
    }
    if (numColumns.length >= 1) {
      suggestions.push({
        title: `Distribusi Area ${numColumns[0]}`,
        type: 'area',
        x: defaultX,
        y: [numColumns[0]],
      });
      suggestions.push({
        title: `Proporsi ${numColumns[0]} per ${defaultX}`,
        type: 'pie',
        x: defaultX,
        y: [numColumns[0]],
      });
    }
    return suggestions;
  }, [numColumns, defaultX]);

  // Derived KPI metrics for current selection
  const kpiStats = useMemo(() => {
    const primaryY = yAxisKeys[0];
    if (!primaryY) return null;
    const vals = dataset.data.map((d) => Number(d[primaryY])).filter((v) => !isNaN(v));
    if (vals.length === 0) return null;

    const sum = vals.reduce((a, b) => a + b, 0);
    const avg = sum / vals.length;
    const max = Math.max(...vals);
    const min = Math.min(...vals);

    return {
      sum: Math.round(sum * 100) / 100,
      avg: Math.round(avg * 100) / 100,
      max: Math.round(max * 100) / 100,
      min: Math.round(min * 100) / 100,
      count: vals.length,
    };
  }, [dataset.data, yAxisKeys]);

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-y-auto lg:overflow-hidden bg-slate-50 text-slate-900">
      {/* Visualizer Main Canvas */}
      <div className="flex-1 flex flex-col p-4 lg:p-6 overflow-y-auto space-y-4">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-200">
                <TrendingUp className="w-4 h-4" />
              </span>
              <h2 className="text-base font-extrabold text-slate-900">Visualizer & Chart Studio</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Eksplorasi visual interaktif berbasis data real-time {dataset.name}
            </p>
          </div>

          <button
            onClick={() =>
              onAskAIAboutData(
                `Berikan evaluasi analitis mendalam dari grafik '${chartTitle}' dengan sumbu X: ${xAxisKey} dan sumbu Y: ${yAxisKeys.join(
                  ', '
                )}.`
              )
            }
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition shadow-sm shrink-0"
          >
            <Sparkles className="w-4 h-4" /> Analisis Grafik dengan AI
          </button>
        </div>

        {/* Dynamic Chart Component */}
        <div className="flex-1 min-h-[380px]">
          <DynamicChartRenderer config={chartConfig} data={dataset.data} height={360} showControls={true} />
        </div>

        {/* Live KPI Quick Metrics */}
        {kpiStats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">TOTAL (SUM)</span>
              <span className="text-base font-extrabold text-cyan-900 font-mono mt-0.5 block">
                {kpiStats.sum.toLocaleString()}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">RATA-RATA (AVG)</span>
              <span className="text-base font-extrabold text-indigo-900 font-mono mt-0.5 block">
                {kpiStats.avg.toLocaleString()}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">TERTINGGI (MAX)</span>
              <span className="text-base font-extrabold text-emerald-800 font-mono mt-0.5 block">
                {kpiStats.max.toLocaleString()}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">TERENDAH (MIN)</span>
              <span className="text-base font-extrabold text-amber-800 font-mono mt-0.5 block">
                {kpiStats.min.toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Right Controls & Chart Customizer */}
      <div className="w-full lg:w-80 bg-white border-l border-slate-200 p-5 space-y-5 overflow-y-auto">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Sliders className="w-4 h-4 text-cyan-700" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Konfigurasi Visual</h3>
        </div>

        {/* Chart Type Selector */}
        <div>
          <label className="text-xs font-bold text-slate-700 mb-2 block">Tipe Visualisasi</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'area', label: 'Area Chart', icon: TrendingUp },
              { id: 'bar', label: 'Bar Chart', icon: BarChart2 },
              { id: 'line', label: 'Line Chart', icon: LineIcon },
              { id: 'pie', label: 'Pie Donut', icon: PieIcon },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setChartType(t.id as any)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold transition ${
                    chartType === t.id
                      ? 'bg-cyan-50 border border-cyan-300 text-cyan-900 shadow-2xs'
                      : 'bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 text-cyan-600" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* X-Axis Selector */}
        <div>
          <label className="text-xs font-bold text-slate-700 mb-1.5 block">Sumbu X (Kategori / Waktu)</label>
          <select
            value={xAxisKey}
            onChange={(e) => setXAxisKey(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-cyan-500 shadow-2xs"
          >
            {allColumns.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
        </div>

        {/* Y-Axis Metric Multi-Selector */}
        <div>
          <label className="text-xs font-bold text-slate-700 mb-1.5 block">
            Sumbu Y (Metrik Numerik)
          </label>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {numColumns.map((col) => {
              const isSelected = yAxisKeys.includes(col);
              return (
                <button
                  key={col}
                  onClick={() => toggleYKey(col)}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-medium transition ${
                    isSelected
                      ? 'bg-cyan-50 border border-cyan-300 text-cyan-900 font-bold'
                      : 'bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="truncate">{col}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-cyan-700 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Suggested AI Visualizations */}
        {suggestedCharts.length > 0 && (
          <div className="pt-3 border-t border-slate-100">
            <label className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" /> Saran Preset Visual
            </label>
            <div className="space-y-2">
              {suggestedCharts.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setChartType(s.type);
                    setXAxisKey(s.x);
                    setYAxisKeys(s.y);
                    setChartTitle(s.title);
                  }}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-cyan-300 hover:bg-cyan-50/50 text-xs text-slate-800 transition shadow-2xs"
                >
                  <div className="font-bold text-cyan-900">{s.title}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 font-mono uppercase">
                    {s.type} • {s.y.join(' + ')}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
