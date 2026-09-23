import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ScatterChart,
  Scatter,
} from 'recharts';
import { ChartConfig } from '../types';
import { BarChart3, LineChart as LineIcon, PieChart as PieIcon, TrendingUp, Maximize2 } from 'lucide-react';

interface DynamicChartRendererProps {
  config: ChartConfig;
  data: Record<string, any>[];
  height?: number;
  showControls?: boolean;
}

const PALETTES = [
  '#0891b2', // cyan-600
  '#4f46e5', // indigo-600
  '#059669', // emerald-600
  '#d97706', // amber-600
  '#db2777', // pink-600
  '#7c3aed', // purple-600
  '#2563eb', // blue-600
  '#0d9488', // teal-600
];

export const DynamicChartRenderer: React.FC<DynamicChartRendererProps> = ({
  config,
  data,
  height = 260,
  showControls = false,
}) => {
  const [chartType, setChartType] = React.useState<ChartConfig['type']>(config.type || 'bar');
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  // Determine keys
  const xKey = config.xAxisKey || (data.length > 0 ? Object.keys(data[0])[0] : 'label');
  const yKeys: string[] = Array.isArray(config.yAxisKey)
    ? config.yAxisKey
    : [config.yAxisKey || (data.length > 0 ? Object.keys(data[0])[1] : 'value')];

  // Custom High Contrast Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-3 shadow-2xl text-xs text-slate-100">
          <p className="font-bold text-cyan-300 mb-1.5 border-b border-slate-800 pb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 py-0.5">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name}:
              </span>
              <span className="font-mono font-bold text-white">
                {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChartBody = () => {
    if (!data || data.length === 0) {
      return (
        <div className="flex h-full items-center justify-center text-slate-400 text-xs">
          Tidak ada data untuk dirender
        </div>
      );
    }

    switch (chartType) {
      case 'area':
        return (
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              {yKeys.map((k, i) => (
                <linearGradient key={k} id={`grad-${k}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={PALETTES[i % PALETTES.length]} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={PALETTES[i % PALETTES.length]} stopOpacity={0.05} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey={xKey} stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            {yKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />}
            {yKeys.map((k, i) => (
              <Area
                key={k}
                type="monotone"
                dataKey={k}
                stroke={PALETTES[i % PALETTES.length]}
                strokeWidth={2.5}
                fillOpacity={1}
                fill={`url(#grad-${k})`}
              />
            ))}
          </AreaChart>
        );

      case 'line':
        return (
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey={xKey} stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            {yKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />}
            {yKeys.map((k, i) => (
              <Line
                key={k}
                type="monotone"
                dataKey={k}
                stroke={PALETTES[i % PALETTES.length]}
                strokeWidth={2.5}
                dot={{ r: 3, fill: PALETTES[i % PALETTES.length] }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        );

      case 'pie':
        const primaryY = yKeys[0];
        return (
          <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Pie
              data={data}
              dataKey={primaryY}
              nameKey={xKey}
              cx="50%"
              cy="50%"
              outerRadius={78}
              innerRadius={45}
              paddingAngle={3}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={PALETTES[index % PALETTES.length]} />
              ))}
            </Pie>
          </PieChart>
        );

      case 'scatter':
        const scatterY = yKeys[0];
        return (
          <ScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey={xKey} stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis dataKey={scatterY} stroke="#64748b" fontSize={11} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Scatter name={config.title} data={data} fill="#0891b2" />
          </ScatterChart>
        );

      case 'bar':
      default:
        return (
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey={xKey} stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            {yKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />}
            {yKeys.map((k, i) => (
              <Bar
                key={k}
                dataKey={k}
                fill={PALETTES[i % PALETTES.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        );
    }
  };

  return (
    <div
      className={`rounded-2xl border border-slate-200/90 bg-white p-4 transition-all duration-200 ${
        isFullscreen
          ? 'fixed inset-4 z-50 flex flex-col bg-white shadow-2xl p-6 border-slate-300'
          : 'my-3 shadow-2xs'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-700">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">{config.title || 'Visualisasi Data Real-Time'}</h4>
            {config.description && <p className="text-[10px] text-slate-500 font-medium">{config.description}</p>}
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setChartType('bar')}
            title="Bar Chart"
            className={`p-1 rounded-lg text-xs transition ${
              chartType === 'bar' ? 'bg-white text-cyan-800 font-bold shadow-2xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setChartType('area')}
            title="Area Chart"
            className={`p-1 rounded-lg text-xs transition ${
              chartType === 'area' ? 'bg-white text-cyan-800 font-bold shadow-2xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setChartType('line')}
            title="Line Chart"
            className={`p-1 rounded-lg text-xs transition ${
              chartType === 'line' ? 'bg-white text-cyan-800 font-bold shadow-2xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <LineIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setChartType('pie')}
            title="Pie Chart"
            className={`p-1 rounded-lg text-xs transition ${
              chartType === 'pie' ? 'bg-white text-cyan-800 font-bold shadow-2xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <PieIcon className="w-3.5 h-3.5" />
          </button>
          {showControls && (
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              title="Toggle Fullscreen"
              className="p-1 text-slate-500 hover:text-slate-900 rounded-lg transition ml-1"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className={`w-full ${isFullscreen ? 'flex-1 min-h-[380px]' : ''}`} style={{ height: isFullscreen ? '100%' : height }}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChartBody()}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
